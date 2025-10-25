import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../app/useAuth";
import {
  listProductos,
  createProducto,
  updateProducto,
  toggleProducto,
  deleteProducto,
} from "../../services/catalogos/productos";
import { listCategorias } from "../../services/catalogos/categorias";
import type { Producto } from "../../types/catalogos/productos";
import type { Categoria } from "../../types/catalogos/categorias";
import "../../theme/catalogos/productos.css";

export default function ProductosPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("ADMIN");

  const [items, setItems] = useState<Producto[]>([]);
  const [cats, setCats] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState("");

  // ⬇️ NUEVO: estado para filtros por columna
  const [fx, setFx] = useState({
    categoria: 0, // 0 = todas
    estado: "ALL" as "ALL" | "ON" | "OFF",
    cocina: "ALL" as "ALL" | "YES" | "NO",
    minPrecio: "",
    maxPrecio: "",
  });

  const [form, setForm] = useState({
    id_categoria: 0,
    nombre: "",
    descripcion: "",
    precio_base: "",
    requiere_cocina: true,
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [ps, cs] = await Promise.all([listProductos(), listCategorias()]);
        setItems(ps);
        setCats(cs);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ⬇️ MODIFICADO: búsqueda global + filtros por columna
  const filtered = useMemo(() => {
    const base = Array.isArray(items) ? items : [];
    const qraw = filter.trim().toLowerCase();

    // 1) BÚSQUEDA GLOBAL
    const normalize = (s: string) =>
      s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    const q = normalize(qraw);

    const catById = new Map(cats.map((c) => [c.id_categoria, c.nombre]));

    let out = base.filter((p) => {
      if (!q) return true;
      const nombre = normalize(p.nombre);
      const descripcion = normalize(p.descripcion || "");
      const categoria = normalize(catById.get(p.id_categoria) || "");
      const precioStr = String(p.precio_base);
      const cocinaStr = p.requiere_cocina ? "requiere cocina si true" : "requiere cocina no false";
      const activoStr = p.activo ? "activo on true" : "inactivo off false";
      return (
        nombre.includes(q) ||
        descripcion.includes(q) ||
        categoria.includes(q) ||
        precioStr.includes(q) ||
        normalize(cocinaStr).includes(q) ||
        normalize(activoStr).includes(q)
      );
    });

    // 2) FILTROS POR COLUMNA (AND)
    if (fx.categoria) out = out.filter((p) => p.id_categoria === fx.categoria);
    if (fx.estado !== "ALL") out = out.filter((p) => (fx.estado === "ON" ? p.activo : !p.activo));
    if (fx.cocina !== "ALL")
      out = out.filter((p) => (fx.cocina === "YES" ? p.requiere_cocina : !p.requiere_cocina));

    const min = fx.minPrecio ? Number(fx.minPrecio.replace(",", ".")) : null;
    const max = fx.maxPrecio ? Number(fx.maxPrecio.replace(",", ".")) : null;
    if (min !== null && !Number.isNaN(min)) out = out.filter((p) => p.precio_base >= min);
    if (max !== null && !Number.isNaN(max)) out = out.filter((p) => p.precio_base <= max);

    return out;
  }, [items, filter, cats, fx]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const nombre = form.nombre.trim();
    const descripcion = (form.descripcion || "").trim();
    const id_categoria = Number(form.id_categoria);
    const precio_base = Number(form.precio_base || 0);

    if (!nombre || !id_categoria || precio_base < 0) {
      alert("Completa: categoría, nombre y precio ≥ 0.");
      return;
    }

    if (!confirm(`¿Guardar nuevo producto?\n\n${nombre} (Q${precio_base.toFixed(2)})`)) return;

    setCreating(true);
    try {
      const created = await createProducto({
        id_categoria,
        nombre,
        descripcion: descripcion || undefined,
        precio_base,
        requiere_cocina: !!form.requiere_cocina,
        activo: true,
      });
      setItems((prev) => [created, ...prev]);
      setForm({
        id_categoria: 0,
        nombre: "",
        descripcion: "",
        precio_base: "",
        requiere_cocina: true,
      });
    } finally {
      setCreating(false);
    }
  }

  async function onToggle(id: number, activo: boolean) {
    const accion = activo ? "desactivar" : "activar";
    if (!confirm(`¿Seguro que deseas ${accion} este producto?`)) return;

    const prev = items;
    setItems((cur) => cur.map((x) => (x.id_producto === id ? { ...x, activo: !activo } : x)));
    try {
      const updated = await toggleProducto(id, !activo);
      setItems((cur) => cur.map((x) => (x.id_producto === id ? updated : x)));
    } catch {
      setItems(prev);
      alert("No se pudo cambiar el estado. Intenta nuevamente.");
    }
  }

  async function onInlineEdit(id: number, patch: Partial<Producto>) {
    const current = items.find((x) => x.id_producto === id);
    if (!current) return;

    // Detectamos campo para mensaje
    let campo = "campo";
    if (Object.prototype.hasOwnProperty.call(patch, "nombre")) campo = "nombre";
    else if (Object.prototype.hasOwnProperty.call(patch, "descripcion")) campo = "descripción";
    else if (Object.prototype.hasOwnProperty.call(patch, "precio_base")) campo = "precio";
    else if (Object.prototype.hasOwnProperty.call(patch, "requiere_cocina")) campo = "requiere_cocina";

    const nuevoStr =
      Object.prototype.hasOwnProperty.call(patch, "precio_base")
        ? String((patch as Partial<Producto>).precio_base ?? "")
        : String(
            (Object.values(patch)[0] ??
              (campo === "descripción" ? current.descripcion ?? "" : "")) as string
          );

    const anteriorStr =
      campo === "nombre"
        ? current.nombre
        : campo === "descripción"
        ? current.descripcion ?? ""
        : campo === "precio"
        ? String(current.precio_base)
        : campo === "requiere_cocina"
        ? String(current.requiere_cocina)
        : "";

    if (nuevoStr === anteriorStr) return;

    if (!confirm(`¿Guardar cambios de ${campo}?\n\nAntes: "${anteriorStr}"\nAhora: "${nuevoStr}"`))
      return;

    const prev = items;
    // optimista
    setItems((cur) => cur.map((x) => (x.id_producto === id ? { ...x, ...patch } : x)));
    try {
      const updated = await updateProducto(id, patch);
      setItems((cur) => cur.map((x) => (x.id_producto === id ? updated : x)));
    } catch {
      setItems(prev);
      alert("No se pudo guardar el cambio. Intenta nuevamente.");
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Toolbar */}
      <div className="prod-toolbar">
        <div>
          <h2 className="h1" style={{ margin: 0 }}>
            Productos
          </h2>
        </div>
        <input
          className="prod-input"
          placeholder="Buscar..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ maxWidth: 260 }}
        />
      </div>

      {/* ⬇️ NUEVO: Barra de filtros por columna */}
      <div className="ui-card" style={{ padding: 12, display: "grid", gap: 8 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {/* Categoría */}
          <select
            className="prod-select"
            value={fx.categoria}
            onChange={(e) => setFx((f) => ({ ...f, categoria: Number(e.target.value) }))}
          >
            <option value={0}>Todas las categorías</option>
            {cats.map((c) => (
              <option key={c.id_categoria} value={c.id_categoria}>
                {c.nombre}
              </option>
            ))}
          </select>

          {/* Estado */}
          <select
            className="prod-select"
            value={fx.estado}
            onChange={(e) => setFx((f) => ({ ...f, estado: e.target.value as "ALL" | "ON" | "OFF" }))}
          >
            <option value="ALL">Todos</option>
            <option value="ON">Activos</option>
            <option value="OFF">Inactivos</option>
          </select>

          {/* Requiere cocina */}
          <select
            className="prod-select"
            value={fx.cocina}
            onChange={(e) => setFx((f) => ({ ...f, cocina: e.target.value as "ALL" | "YES" | "NO" }))}
          >
            <option value="ALL">Cocina (todos)</option>
            <option value="YES">Requiere</option>
            <option value="NO">No requiere</option>
          </select>

          {/* Precio mínimo */}
          <input
            className="prod-input"
            placeholder="Precio mín."
            inputMode="decimal"
            value={fx.minPrecio}
            onChange={(e) => setFx((f) => ({ ...f, minPrecio: e.target.value }))}
            style={{ width: 120 }}
          />

          {/* Precio máximo */}
          <input
            className="prod-input"
            placeholder="Precio máx."
            inputMode="decimal"
            value={fx.maxPrecio}
            onChange={(e) => setFx((f) => ({ ...f, maxPrecio: e.target.value }))}
            style={{ width: 120 }}
          />

          {/* Limpiar filtros */}
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() =>
              setFx({ categoria: 0, estado: "ALL", cocina: "ALL", minPrecio: "", maxPrecio: "" })
            }
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Form nuevo producto (solo ADMIN) */}
      {isAdmin && (
        <div className="ui-card" style={{ maxWidth: 800 }}>
          <h3 style={{ marginTop: 0 }}>Nuevo producto</h3>
          <form className="prod-form" onSubmit={onCreate}>
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Categoría</label>
              <select
                className="prod-select"
                value={form.id_categoria}
                onChange={(e) => setForm((f) => ({ ...f, id_categoria: Number(e.target.value) }))}
              >
                <option value={0}>Seleccione…</option>
                {cats.map((c) => (
                  <option key={c.id_categoria} value={c.id_categoria}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Nombre</label>
              <input
                className="prod-input"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Descripción</label>
              <textarea
                className="prod-textarea"
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Precio base (Q)</label>
              <input
                className="prod-input"
                inputMode="decimal"
                value={form.precio_base}
                onChange={(e) => setForm((f) => ({ ...f, precio_base: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                id="reqc"
                type="checkbox"
                checked={form.requiere_cocina}
                onChange={(e) => setForm((f) => ({ ...f, requiere_cocina: e.target.checked }))}
              />
              <label htmlFor="reqc">Requiere cocina</label>
            </div>
            <div className="col-span-2" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() =>
                  setForm({ id_categoria: 0, nombre: "", descripcion: "", precio_base: "", requiere_cocina: true })
                }
              >
                Limpiar
              </button>
              <button className="btn btn-primary" disabled={creating} type="submit">
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla */}
      <div className="prod-table">
        <table className="prod-table">
          <thead>
            <tr>
              <th style={{ width: 64 }}>ID</th>
              <th>Categoría</th>
              <th>Nombre</th>
              <th>Descripción</th>
              <th style={{ width: 120 }}>Precio</th>
              <th style={{ width: 120 }}>Cocina</th>
              <th style={{ width: 110 }}>Estado</th>
              {isAdmin && <th style={{ width: 220 }}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} style={{ padding: 16, textAlign: "center", color: "var(--muted)" }}>
                  Sin resultados
                </td>
              </tr>
            )}

            {filtered.map((row) => (
              <tr key={row.id_producto}>
                <td>{row.id_producto}</td>
                <td>
                  {cats.find((c) => c.id_categoria === row.id_categoria)?.nombre || (
                    <span className="subtle">—</span>
                  )}
                </td>
                <td>
                  {isAdmin ? (
                    <InlineText
                      value={row.nombre}
                      onSave={(v) => onInlineEdit(row.id_producto, { nombre: v })}
                    />
                  ) : (
                    row.nombre
                  )}
                </td>
                <td>
                  {isAdmin ? (
                    <InlineText
                      value={row.descripcion || ""}
                      placeholder="Sin descripción"
                      onSave={(v) => onInlineEdit(row.id_producto, { descripcion: v || null })}
                    />
                  ) : (
                    row.descripcion || <span className="subtle">—</span>
                  )}
                </td>
                <td>
                  {isAdmin ? (
                    <InlineText
                      value={String(row.precio_base)}
                      onSave={(v) => {
                        const n = Number((v || "").replace(",", "."));
                        if (Number.isNaN(n) || n < 0) {
                          alert("Precio inválido");
                          return;
                        }
                        onInlineEdit(row.id_producto, { precio_base: n });
                      }}
                    />
                  ) : (
                    `Q ${Number(row.precio_base).toFixed(2)}`
                  )}
                </td>
                <td>
                  {isAdmin ? (
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={row.requiere_cocina}
                        onChange={(e) => onInlineEdit(row.id_producto, { requiere_cocina: e.target.checked })}
                      />
                      <span className="subtle">Requiere</span>
                    </label>
                  ) : row.requiere_cocina ? (
                    "Sí"
                  ) : (
                    "No"
                  )}
                </td>
                <td>
                  <span className={`badge ${row.activo ? "ok" : "off"}`}>
                    {row.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                {isAdmin && (
                  <td style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => onToggle(row.id_producto, row.activo)}>
                      {row.activo ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={async () => {
                        if (!confirm(`¿Eliminar el producto "${row.nombre}"?`)) return;
                        try {
                          await deleteProducto(row.id_producto);
                          setItems((prev) => prev.filter((x) => x.id_producto !== row.id_producto));
                        } catch {
                          alert("No se pudo eliminar. Intenta nuevamente.");
                        }
                      }}
                    >
                      Eliminar
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && <div className="subtle">Cargando...</div>}
    </div>
  );
}

/** Inline edit reutilizable (doble clic para editar) */
function InlineText({
  value,
  onSave,
  placeholder,
}: {
  value: string;
  placeholder?: string;
  onSave: (val: string) => void;
}) {
  const [v, setV] = useState(value);
  const [editing, setEditing] = useState(false);

  useEffect(() => setV(value), [value]);

  function commit() {
    setEditing(false);
    if (v !== value) onSave(v.trim());
  }

  return (
    <div>
      {editing ? (
        <input
          className="prod-input"
          value={v}
          placeholder={placeholder}
          onChange={(e) => setV(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setV(value);
              setEditing(false);
            }
          }}
          autoFocus
          style={{ height: 34 }}
        />
      ) : (
        <span onDoubleClick={() => setEditing(true)} style={{ cursor: "text" }}>
          {value || <span className="subtle">{placeholder || "—"}</span>}
        </span>
      )}
    </div>
  );
}

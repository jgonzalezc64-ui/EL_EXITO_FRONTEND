import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../app/useAuth";
import {
  listCategorias,
  createCategoria,
  updateCategoria,
  toggleCategoria,
  deleteCategoria,
} from "../../services/catalogos/categorias";
import type { Categoria } from "../../types/catalogos/categorias";
import "../../theme/catalogos/catalogos.css";

export default function CategoriasPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("ADMIN");

  const [items, setItems] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState("");

  //  filtros por columna
  const [fx, setFx] = useState({
    estado: "ALL" as "ALL" | "ON" | "OFF",
  });

  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await listCategorias();
        setItems(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // BÚSQUEDA GLOBAL + FILTROS
  const filtered = useMemo(() => {
    const base = Array.isArray(items) ? items : [];
    const qraw = filter.trim().toLowerCase();

    const normalize = (s: string) =>
      s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    const q = normalize(qraw);

    let out = base.filter((c) => {
      if (!q) return true;
      const idStr = String(c.id_categoria);
      const nombre = normalize(c.nombre);
      const descripcion = normalize(c.descripcion || "");
      const estadoStr = c.activo ? "activo on true" : "inactivo off false";
      return (
        idStr.includes(q) ||
        nombre.includes(q) ||
        descripcion.includes(q) ||
        normalize(estadoStr).includes(q)
      );
    });

    // Filtro por columna: Estado
    if (fx.estado !== "ALL") {
      out = out.filter((c) => (fx.estado === "ON" ? c.activo : !c.activo));
    }

    return out;
  }, [items, filter, fx]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const nombre = form.nombre.trim();
    const descripcion = (form.descripcion || "").trim();
    if (!nombre) {
      alert("Ingresa un nombre.");
      return;
    }

    if (
      !confirm(
        `¿Guardar nueva categoría?\n\nNombre: "${nombre}"\nDescripción: "${descripcion || "(vacío)"}"`
      )
    )
      return;

    setCreating(true);
    try {
      const created = await createCategoria({
        nombre,
        descripcion: descripcion || undefined,
        activo: true,
      });
      setItems((prev) => [created, ...prev]);
      setForm({ nombre: "", descripcion: "" });
    } finally {
      setCreating(false);
    }
  }

  async function onToggle(id: number, activo: boolean) {
    const accion = activo ? "desactivar" : "activar";
    if (!confirm(`¿Seguro que deseas ${accion} esta categoría?`)) return;

    const prev = items;
    // Optimista
    setItems((cur) =>
      cur.map((x) => (x.id_categoria === id ? { ...x, activo: !activo } : x))
    );
    try {
      const updated = await toggleCategoria(id, !activo);
      setItems((cur) =>
        cur.map((x) => (x.id_categoria === id ? updated : x))
      );
    } catch {
      setItems(prev); // rollback
      alert("No se pudo cambiar el estado. Intenta nuevamente.");
    }
  }

  async function onInlineEdit(
    id: number,
    patch: Partial<Pick<Categoria, "nombre" | "descripcion">>
  ) {
    const current = items.find((x) => x.id_categoria === id);
    if (!current) return;

    const isNombre = Object.prototype.hasOwnProperty.call(patch, "nombre");

    const nuevo: string =
      (isNombre
        ? (patch as Partial<Categoria>).nombre
        : (patch as Partial<Categoria>).descripcion) ?? "";
    const anterior: string = isNombre
      ? current.nombre
      : current.descripcion ?? "";

    if (nuevo === anterior) return;

    if (
      !confirm(
        `¿Guardar cambios de ${isNombre ? "nombre" : "descripción"}?\n\nAntes: "${anterior}"\nAhora:  "${nuevo}"`
      )
    )
      return;

    const prev = items;
    // Optimista
    setItems((cur) =>
      cur.map((x) =>
        x.id_categoria === id
          ? {
              ...x,
              ...(isNombre ? { nombre: nuevo } : { descripcion: nuevo || null }),
            }
          : x
      )
    );
    try {
      const updated = await updateCategoria(id, patch);
      setItems((cur) =>
        cur.map((x) => (x.id_categoria === id ? updated : x))
      );
    } catch {
      setItems(prev); // rollback
      alert("No se pudo guardar el cambio. Intenta nuevamente.");
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Toolbar */}
      <div className="cat-toolbar">
        <div>
          <h2 className="h1" style={{ margin: 0 }}>
            Categorías
          </h2>
        </div>
        <input
          className="cat-input"
          placeholder="Buscar..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ maxWidth: 260 }}
        />
      </div>

      {/* ⬇️ NUEVO: Barra de filtros por columna */}
      <div className="ui-card" style={{ padding: 12, display: "grid", gap: 8, maxWidth: 760 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {/* Estado */}
          <select
            className="cat-select"
            value={fx.estado}
            onChange={(e) =>
              setFx((f) => ({ ...f, estado: e.target.value as "ALL" | "ON" | "OFF" }))
            }
          >
            <option value="ALL">Todos</option>
            <option value="ON">Activos</option>
            <option value="OFF">Inactivos</option>
          </select>

          {/* Limpiar filtros */}
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => setFx({ estado: "ALL" })}
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Crear nueva (solo ADMIN) */}
      {isAdmin && (
        <div className="ui-card" style={{ maxWidth: 760 }}>
          <h3 style={{ marginTop: 0 }}>Nueva categoría</h3>
          <form
            className="cat-form"
            onSubmit={onCreate}
            style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}
          >
            <div className="col-span-2">
              <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Nombre</label>
              <input
                className="cat-input"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>
                Descripción
              </label>
              <textarea
                className="cat-textarea"
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              />
            </div>
            <div className="col-span-2" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setForm({ nombre: "", descripcion: "" })}
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
      <div className="cat-table">
        <table className="cat-table">
          <thead>
            <tr>
              <th style={{ width: 64 }}>ID</th>
              <th>Nombre</th>
              <th>Descripción</th>
              <th style={{ width: 110 }}>Estado</th>
              {isAdmin && <th style={{ width: 220 }}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} style={{ padding: 16, textAlign: "center", color: "var(--muted)" }}>
                  Sin resultados
                </td>
              </tr>
            )}

            {filtered.map((row) => (
              <tr key={row.id_categoria}>
                <td>{row.id_categoria}</td>
                <td>
                  {isAdmin ? (
                    <InlineText
                      value={row.nombre}
                      onSave={(v) => onInlineEdit(row.id_categoria, { nombre: v })}
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
                      onSave={(v) =>
                        onInlineEdit(row.id_categoria, { descripcion: v || null })
                      }
                    />
                  ) : (
                    row.descripcion || <span className="subtle">—</span>
                  )}
                </td>
                <td>
                  <span className={`badge ${row.activo ? "ok" : "off"}`}>
                    {row.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                {isAdmin && (
                  <td className="cat-actions">
                    <button
                      className="btn btn-ghost"
                      onClick={() => onToggle(row.id_categoria, row.activo)}
                    >
                      {row.activo ? "Desactivar" : "Activar"}
                    </button>

                    <button
                      className="btn btn-ghost"
                      onClick={async () => {
                        if (!confirm(`¿Eliminar la categoría "${row.nombre}"?`)) return;
                        try {
                          await deleteCategoria(row.id_categoria);
                          setItems((prev) =>
                            prev.filter((x) => x.id_categoria !== row.id_categoria)
                          );
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
          className="cat-input"
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

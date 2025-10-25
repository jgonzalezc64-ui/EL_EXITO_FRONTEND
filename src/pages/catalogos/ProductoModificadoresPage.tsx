import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../app/useAuth";
import "../../theme/catalogos/productos.css";

import { listProductos } from "../../services/catalogos/productos";
import { listCategorias } from "../../services/catalogos/categorias";
import { listModificadorGrupos, listModificadores } from "../../services/catalogos/modificadores";
import {
  listProductoModificadores,
  createProductoModificador,
  removeProductoModificador,
} from "../../services/catalogos/productoModificadores";

import type { Producto } from "../../types/catalogos/productos";
import type { Categoria } from "../../types/catalogos/categorias";
import type { Modificador, ModificadorGrupo } from "../../types/catalogos/modificadores";
import type { ProductoModificador } from "../../types/catalogos/productoModificadores";

export default function ProductoModificadoresPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("ADMIN");

  const [loading, setLoading] = useState(true);

  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [grupos, setGrupos] = useState<ModificadorGrupo[]>([]);
  const [mods, setMods] = useState<Modificador[]>([]);
  const [rels, setRels] = useState<ProductoModificador[]>([]);

  // Filtros de la lista (por columnas)
  const [fx, setFx] = useState({
    id_categoria: 0, // 0 = todas
    id_producto: 0,  // 0 = todos
    id_grupo: 0,     // 0 = todos
    estado_mod: "ALL" as "ALL" | "ON" | "OFF", // estado de modificador
  });

  // Form para crear vínculo
  const [form, setForm] = useState({
    id_categoria: 0,
    id_producto: 0,
    id_grupo: 0,
    id_modificador: 0,
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [ps, cs, gs, msRaw, rs] = await Promise.all([
          listProductos(),
          listCategorias(),
          listModificadorGrupos(),
          listModificadores(),
          listProductoModificadores(),
        ]);

        setProductos(ps);
        setCategorias(cs);
        setGrupos(gs);

        // Normaliza precio_extra a número por si viene como string
        const ms = msRaw.map((m) => ({
          ...m,
          precio_extra: Number((m as unknown as { precio_extra?: number | string }).precio_extra ?? 0),
        }));
        setMods(ms);

        setRels(rs);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Índices rápidos
  const catById = useMemo(
    () => new Map(categorias.map((c) => [c.id_categoria, c.nombre])),
    [categorias]
  );
  const prodById = useMemo(
    () => new Map(productos.map((p) => [p.id_producto, p.nombre])),
    [productos]
  );
  const grpById = useMemo(
    () => new Map(grupos.map((g) => [g.id_grupo, g.nombre])),
    [grupos]
  );
  const modById = useMemo(
    () => new Map(mods.map((m) => [m.id_modificador, m])),
    [mods]
  );

  // Productos filtrados por categoría (para selects)
  const productosFiltrados = useMemo(() => {
    if (!fx.id_categoria && !form.id_categoria) return productos;
    const catId = form.id_categoria || fx.id_categoria;
    return productos.filter((p) => !catId || p.id_categoria === catId);
  }, [productos, fx.id_categoria, form.id_categoria]);

  // Modificadores filtrados por grupo (para selects)
  const modsFiltrados = useMemo(() => {
    if (!form.id_grupo) return mods;
    return mods.filter((m) => m.id_grupo === form.id_grupo && (m.activo || true));
  }, [mods, form.id_grupo]);

  // Lista filtrada (tabla)
  const list = useMemo(() => {
    let out = rels.slice();

    if (fx.id_producto) {
      out = out.filter((r) => r.id_producto === fx.id_producto);
    } else if (fx.id_categoria) {
      const setProd = new Set(
        productos.filter((p) => p.id_categoria === fx.id_categoria).map((p) => p.id_producto)
      );
      out = out.filter((r) => setProd.has(r.id_producto));
    }

    if (fx.id_grupo) {
      out = out.filter((r) => modById.get(r.id_modificador)?.id_grupo === fx.id_grupo);
    }

    if (fx.estado_mod !== "ALL") {
      const want = fx.estado_mod === "ON";
      out = out.filter((r) => (modById.get(r.id_modificador)?.activo ?? true) === want);
    }

    // Orden (producto, grupo, modificador)
    out.sort((a, b) => {
      const ap = prodById.get(a.id_producto) || "";
      const bp = prodById.get(b.id_producto) || "";
      if (ap !== bp) return ap.localeCompare(bp);
      const ag = grpById.get(modById.get(a.id_modificador)?.id_grupo || 0) || "";
      const bg = grpById.get(modById.get(b.id_modificador)?.id_grupo || 0) || "";
      if (ag !== bg) return ag.localeCompare(bg);
      const am = modById.get(a.id_modificador)?.nombre || "";
      const bm = modById.get(b.id_modificador)?.nombre || "";
      return am.localeCompare(bm);
    });

    return out;
  }, [rels, fx, productos, prodById, grpById, modById]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const id_producto = Number(form.id_producto);
    const id_modificador = Number(form.id_modificador);
    if (!id_producto || !id_modificador) {
      alert("Selecciona producto y modificador.");
      return;
    }
    const pName = prodById.get(id_producto) || `#${id_producto}`;
    const mod = modById.get(id_modificador);
    const mName = mod?.nombre || `#${id_modificador}`;
    const gName = grpById.get(mod?.id_grupo || 0) || "";

    if (!confirm(`¿Vincular?\n\nProducto: ${pName}\nGrupo: ${gName}\nModificador: ${mName}`)) return;

    try {
      await createProductoModificador({ id_producto, id_modificador });
      setRels((prev) => [{ id_producto, id_modificador }, ...prev]); // optimista
      setForm((f) => ({ ...f, id_modificador: 0 })); // limpiar solo modificador
    } catch {
      alert("No se pudo crear el vínculo (puede que ya exista).");
    }
  }

  async function onRemove(rel: ProductoModificador) {
    const pName = prodById.get(rel.id_producto) || `#${rel.id_producto}`;
    const mName = modById.get(rel.id_modificador)?.nombre || `#${rel.id_modificador}`;
    if (!confirm(`¿Eliminar vínculo?\n\nProducto: ${pName}\nModificador: ${mName}`)) return;

    const prev = rels;
    setRels((cur) =>
      cur.filter(
        (r) => !(r.id_producto === rel.id_producto && r.id_modificador === rel.id_modificador)
      )
    );
    try {
      await removeProductoModificador({
        id_producto: rel.id_producto,
        id_modificador: rel.id_modificador,
      });
    } catch {
      setRels(prev);
      alert("No se pudo eliminar el vínculo.");
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Toolbar */}
      <div className="prod-toolbar">
        <div>
          <h2 className="h1" style={{ margin: 0 }}>
            Producto ↔ Modificadores
          </h2>
        </div>
      </div>

      {/* Filtros de lista */}
      <div className="ui-card" style={{ padding: 12, display: "grid", gap: 8 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {/* categoría */}
          <select
            className="prod-select"
            value={fx.id_categoria}
            onChange={(e) =>
              setFx((f) => ({ ...f, id_categoria: Number(e.target.value), id_producto: 0 }))
            }
          >
            <option value={0}>Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.id_categoria} value={c.id_categoria}>
                {c.nombre}
              </option>
            ))}
          </select>

          {/* producto */}
          <select
            className="prod-select"
            value={fx.id_producto}
            onChange={(e) => setFx((f) => ({ ...f, id_producto: Number(e.target.value) }))}
          >
            <option value={0}>Todos los productos</option>
            {productosFiltrados.map((p) => (
              <option key={p.id_producto} value={p.id_producto}>
                {p.nombre}
              </option>
            ))}
          </select>

          {/* grupo */}
          <select
            className="prod-select"
            value={fx.id_grupo}
            onChange={(e) => setFx((f) => ({ ...f, id_grupo: Number(e.target.value) }))}
          >
            <option value={0}>Todos los grupos</option>
            {grupos.map((g) => (
              <option key={g.id_grupo} value={g.id_grupo}>
                {g.nombre}
              </option>
            ))}
          </select>

          {/* estado del modificador */}
          <select
            className="prod-select"
            value={fx.estado_mod}
            onChange={(e) =>
              setFx((f) => ({ ...f, estado_mod: e.target.value as "ALL" | "ON" | "OFF" }))
            }
          >
            <option value="ALL">Mods (todos)</option>
            <option value="ON">Solo activos</option>
            <option value="OFF">Solo inactivos</option>
          </select>

          <button
            className="btn btn-ghost"
            type="button"
            onClick={() =>
              setFx({ id_categoria: 0, id_producto: 0, id_grupo: 0, estado_mod: "ALL" })
            }
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Crear vínculo (solo ADMIN) */}
      {isAdmin && (
        <div className="ui-card" style={{ maxWidth: 1000 }}>
          <h3 style={{ marginTop: 0 }}>Crear vínculo</h3>
          <form className="prod-form" onSubmit={onCreate}>
            {/* categoría */}
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Categoría</label>
              <select
                className="prod-select"
                value={form.id_categoria}
                onChange={(e) =>
                  setForm((f) => ({ ...f, id_categoria: Number(e.target.value), id_producto: 0 }))
                }
              >
                <option value={0}>Seleccione…</option>
                {categorias.map((c) => (
                  <option key={c.id_categoria} value={c.id_categoria}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* producto */}
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Producto</label>
              <select
                className="prod-select"
                value={form.id_producto}
                onChange={(e) => setForm((f) => ({ ...f, id_producto: Number(e.target.value) }))}
              >
                <option value={0}>Seleccione…</option>
                {productos
                  .filter((p) => !form.id_categoria || p.id_categoria === form.id_categoria)
                  .map((p) => (
                    <option key={p.id_producto} value={p.id_producto}>
                      {p.nombre}
                    </option>
                  ))}
              </select>
            </div>

            {/* grupo */}
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Grupo</label>
              <select
                className="prod-select"
                value={form.id_grupo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, id_grupo: Number(e.target.value), id_modificador: 0 }))
                }
              >
                <option value={0}>Seleccione…</option>
                {grupos.map((g) => (
                  <option key={g.id_grupo} value={g.id_grupo}>
                    {g.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* modificador (filtrado por grupo) */}
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>
                Modificador
              </label>
              <select
                className="prod-select"
                value={form.id_modificador}
                onChange={(e) => setForm((f) => ({ ...f, id_modificador: Number(e.target.value) }))}
              >
                <option value={0}>Seleccione…</option>
                {modsFiltrados.map((m) => (
                  <option key={m.id_modificador} value={m.id_modificador}>
                    {m.nombre}
                    {Number(m.precio_extra ?? 0) > 0
                      ? ` (Q ${Number(m.precio_extra ?? 0).toFixed(2)})`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <div
              className="col-span-2"
              style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
            >
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() =>
                  setForm({ id_categoria: 0, id_producto: 0, id_grupo: 0, id_modificador: 0 })
                }
              >
                Limpiar
              </button>
              <button className="btn btn-primary" type="submit">
                Vincular
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
              <th>Producto</th>
              <th>Grupo</th>
              <th>Modificador</th>
              <th style={{ width: 120 }}>Precio extra</th>
              {isAdmin && <th style={{ width: 140 }}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {!loading && list.length === 0 && (
              <tr>
                <td
                  colSpan={isAdmin ? 5 : 4}
                  style={{ padding: 16, textAlign: "center", color: "var(--muted)" }}
                >
                  Sin resultados
                </td>
              </tr>
            )}

            {list.map((r) => {
              const pName = prodById.get(r.id_producto) || `#${r.id_producto}`;
              const prod = productos.find((p) => p.id_producto === r.id_producto);
              const catName = catById.get(prod?.id_categoria || 0) ?? "";
              const mod = modById.get(r.id_modificador);
              const gName = grpById.get(mod?.id_grupo || 0) || "";
              return (
                <tr key={`${r.id_producto}-${r.id_modificador}`}>
                  <td>
                    {pName}
                    <div className="subtle">{catName}</div>
                  </td>
                  <td>{gName || <span className="subtle">—</span>}</td>
                  <td>{mod?.nombre || <span className="subtle">—</span>}</td>
                  <td>{mod ? `Q ${Number(mod.precio_extra ?? 0).toFixed(2)}` : "—"}</td>
                  {isAdmin && (
                    <td>
                      <button className="btn btn-ghost" onClick={() => onRemove(r)}>
                        Eliminar
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {loading && <div className="subtle">Cargando...</div>}
    </div>
  );
}

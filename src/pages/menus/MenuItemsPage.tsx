import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../app/useAuth";

import type { Menu } from "../../types/menus/menu";
import type { MenuSeccion } from "../../types/menus/menuSeccion";
import type { Producto } from "../../types/catalogos/productos";
import type { MenuItem, MenuItemCreate, MenuItemPatch } from "../../types/menus/menuItem";

import { listMenusAll } from "../../services/menus/menus";
import { listMenuSecciones } from "../../services/menus/menuSecciones";
import { listProductosAll } from "../../services/catalogos/productos";
import {
  listMenuItems,
  createMenuItem,
  updateMenuItem,
  toggleMenuItemVisible,
  deleteMenuItem,
} from "../../services/menus/menuItems";

/* ===== Helpers de número/moneda (para strings o números) ===== */
function asNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function money(v: unknown): string {
  return asNumber(v).toFixed(2);
}

function parseFloatOrNull(v: string): number | null {
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export default function MenuItemsPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("ADMIN");

  // Data maestras
  const [menus, setMenus] = useState<Menu[]>([]);
  const [secciones, setSecciones] = useState<MenuSeccion[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);

  // Tabla
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<MenuItem[]>([]);

  // Filtros
  const [q, setQ] = useState("");
  const [fMenu, setFMenu] = useState<number | "ALL">("ALL");
  const [fSeccion, setFSeccion] = useState<number | "ALL">("ALL");
  const [fProducto, setFProducto] = useState<number | "ALL">("ALL");
  const [fVisible, setFVisible] = useState<"ALL" | "ON" | "OFF">("ALL");

  // Crear (sin vigencias)
  const [form, setForm] = useState<MenuItemCreate>({
    id_menu: 0,
    id_producto: 0,
    id_seccion: null,
    precio_override: null,
    visible: true,
    orden: 1,
    // NOTA: no enviamos vigente_desde/ vig_hasta
  } as MenuItemCreate);

  // Edición inline (sin vigencias)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<MenuItemPatch>({});

  // Índices y helpers
  const menuById = useMemo(() => new Map(menus.map(m => [m.id_menu, m.nombre])), [menus]);
  const seccById = useMemo(() => new Map(secciones.map(s => [s.id_seccion ?? -1, s.nombre])), [secciones]);
  const prodById = useMemo(() => new Map(productos.map(p => [p.id_producto, p.nombre])), [productos]);
  const prodPrecioById = useMemo(() => new Map(productos.map(p => [p.id_producto, p.precio_base])), [productos]);

  // Carga inicial de catálogos
  useEffect(() => {
  (async () => {
    try {
      setLoading(true);
      const [ms, ps] = await Promise.all([
        listMenusAll({ activo: "ALL" }),
        listProductosAll(),
      ]);
      setMenus(Array.isArray(ms) ? ms : []);
      setProductos(Array.isArray(ps) ? ps : []);
    } finally {
      setLoading(false);
    }
  })();
}, []);

  // Cargar secciones cuando cambia el filtro de Menú
  useEffect(() => {
  (async () => {
    const idMenu = fMenu === "ALL" ? undefined : Number(fMenu);
    const secs = await listMenuSecciones({ id_menu: idMenu, visible: "ALL" });
    setSecciones(Array.isArray(secs) ? secs : []);
  })();
}, [fMenu]);

  // Cargar items cuando cambian filtros
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const items = await listMenuItems({
          q,
          id_menu: fMenu === "ALL" ? undefined : Number(fMenu),
          id_seccion: fSeccion === "ALL" ? undefined : Number(fSeccion),
          id_producto: fProducto === "ALL" ? undefined : Number(fProducto),
          visible: fVisible,
        });
        setRows(Array.isArray(items) ? items : []);
      } finally {
        setLoading(false);
      }
    })();
  }, [q, fMenu, fSeccion, fProducto, fVisible]);

  // Ordenar client-side
  const filtered = useMemo(() => {
    const out = rows.slice();
    out.sort((a, b) => {
      if (a.id_menu !== b.id_menu) return a.id_menu - b.id_menu;
      const sa = a.id_seccion ?? 0;
      const sb = b.id_seccion ?? 0;
      if (sa !== sb) return sa - sb;
      if (a.orden !== b.orden) return a.orden - b.orden;
      return (prodById.get(a.id_producto) ?? "").localeCompare(prodById.get(b.id_producto) ?? "");
    });
    return out;
  }, [rows, prodById]);

  // Secciones disponibles
  const seccionesForFilter = useMemo(() => {
    if (fMenu === "ALL") return secciones;
    return secciones.filter(s => s.id_menu === Number(fMenu));
  }, [secciones, fMenu]);

  const seccionesForCreate = useMemo(() => {
    if (!form.id_menu) return [];
    return secciones.filter(s => s.id_menu === form.id_menu);
  }, [secciones, form.id_menu]);

  // ----- Crear -----
  async function onCreate(e: React.FormEvent) {
    e.preventDefault();

    if (!form.id_menu || !form.id_producto) {
      alert("Selecciona Menú y Producto.");
      return;
    }
    const menuLbl = menuById.get(form.id_menu) ?? String(form.id_menu);
    const prodLbl = prodById.get(form.id_producto) ?? String(form.id_producto);
    const seccLbl = form.id_seccion ? (seccById.get(form.id_seccion) ?? String(form.id_seccion)) : "—";
    const precioLbl = form.precio_override != null ? money(form.precio_override) : "—";

    const resumen = [
      `Menú: ${menuLbl}`,
      `Sección: ${seccLbl}`,
      `Producto: ${prodLbl}`,
      `Precio override: ${precioLbl}`,
      `Visible: ${form.visible ? "Sí" : "No"}`,
      `Orden: ${form.orden ?? 1}`,
    ].join("\n");

    const ok = confirm(`¿Crear item de menú?\n\n${resumen}`);
    if (!ok) return;

    // Construir payload SIN campos de vigencia
    const payload: Partial<MenuItemCreate> = {
      id_menu: form.id_menu,
      id_producto: form.id_producto,
      id_seccion: form.id_seccion ?? null,
      precio_override: form.precio_override ?? null,
      visible: !!form.visible,
      orden: form.orden ?? 1,
    };

    try {
      const created = await createMenuItem(payload as MenuItemCreate);
      setRows(prev => [created, ...prev]);
      setForm({
        id_menu: 0,
        id_producto: 0,
        id_seccion: null,
        precio_override: null,
        visible: true,
        orden: 1,
      } as MenuItemCreate);
    } catch {
      alert("No se pudo crear (¿duplicado de producto en el menú?).");
    }
  }

  // ----- Toggle visible -----
  async function onToggleVisible(row: MenuItem) {
    const ok = confirm(`${row.visible ? "Ocultar" : "Mostrar"} el item "${prodById.get(row.id_producto) ?? row.id_producto}"?`);
    if (!ok) return;

    const prev = rows;
    setRows(cur => cur.map(r => (r.id_menu_item === row.id_menu_item ? { ...r, visible: !r.visible } : r)));
    try {
      await toggleMenuItemVisible(row.id_menu_item, !row.visible);
    } catch {
      setRows(prev);
      alert("No se pudo cambiar la visibilidad.");
    }
  }

  // ----- Eliminar -----
  async function onDelete(row: MenuItem) {
    const ok = confirm(`¿Eliminar el item "${prodById.get(row.id_producto) ?? row.id_producto}" del menú?`);
    if (!ok) return;

    const prev = rows;
    setRows(cur => cur.filter(r => r.id_menu_item !== row.id_menu_item));
    try {
      await deleteMenuItem(row.id_menu_item);
    } catch {
      setRows(prev);
      alert("No se pudo eliminar.");
    }
  }

  // ----- Edición inline (sin vigencias) -----
  function startEdit(row: MenuItem) {
    setEditingId(row.id_menu_item);
    setDraft({
      id_seccion: row.id_seccion ?? null,
      precio_override: row.precio_override ?? null,
      visible: row.visible,
      orden: row.orden,
    });
  }
  function cancelEdit() {
    setEditingId(null);
    setDraft({});
  }
  async function saveEdit(row: MenuItem) {
    const patch: MenuItemPatch = {};

    if (draft.id_seccion !== undefined && draft.id_seccion !== row.id_seccion) patch.id_seccion = draft.id_seccion;
    if (draft.precio_override !== undefined && draft.precio_override !== row.precio_override) {
      patch.precio_override = draft.precio_override;
    }
    if (draft.visible !== undefined && draft.visible !== row.visible) patch.visible = draft.visible;
    if (draft.orden !== undefined && draft.orden !== row.orden) patch.orden = draft.orden;

    if (Object.keys(patch).length === 0) {
      cancelEdit();
      return;
    }

    const resumen: string[] = [];
    if (patch.id_seccion !== undefined) {
      const antes = row.id_seccion ? (seccById.get(row.id_seccion) ?? String(row.id_seccion)) : "—";
      const ahora = patch.id_seccion ? (seccById.get(patch.id_seccion) ?? String(patch.id_seccion)) : "—";
      resumen.push(`Sección: "${antes}" → "${ahora}"`);
    }
    if (patch.precio_override !== undefined) {
      const a = row.precio_override != null ? money(row.precio_override) : "—";
      const b = patch.precio_override != null ? money(patch.precio_override) : "—";
      resumen.push(`Override: ${a} → ${b}`);
    }
    if (patch.visible !== undefined) {
      resumen.push(`Visible: ${row.visible ? "Sí" : "No"} → ${patch.visible ? "Sí" : "No"}`);
    }
    if (patch.orden !== undefined) {
      resumen.push(`Orden: ${row.orden} → ${patch.orden}`);
    }

    const ok = confirm(`¿Guardar cambios?\n\n${resumen.join("\n")}`);
    if (!ok) return;

    const prev = rows;
    setRows(cur => cur.map(r => (r.id_menu_item === row.id_menu_item ? { ...r, ...patch } : r)));
    try {
      const updated = await updateMenuItem(row.id_menu_item, patch);
      setRows(cur => cur.map(r => (r.id_menu_item === row.id_menu_item ? updated : r)));
      cancelEdit();
    } catch {
      setRows(prev);
      alert("No se pudo guardar.");
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Título */}
      <div className="prod-toolbar">
        <h2 className="h1" style={{ margin: 0 }}>Items de Menú</h2>
      </div>

      {/* Filtros */}
      <div className="ui-card" style={{ display: "grid", gap: 8, padding: 12 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <input
            className="prod-input"
            placeholder="Buscar por nombre de producto…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <select
            className="prod-select"
            value={fMenu}
            onChange={(e) => {
              const val = e.target.value === "ALL" ? "ALL" : Number(e.target.value);
              setFMenu(val);
              setFSeccion("ALL"); // reset sección al cambiar menú
            }}
          >
            <option value="ALL">Todos los menús</option>
            {menus.map(m => (
              <option key={m.id_menu} value={m.id_menu}>
                {m.nombre}
              </option>
            ))}
          </select>

          <select
            className="prod-select"
            value={fSeccion}
            onChange={(e) => setFSeccion(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
          >
            <option value="ALL">Todas las secciones</option>
            {seccionesForFilter.map(s => (
              <option key={s.id_seccion} value={s.id_seccion!}>
                {s.nombre}
              </option>
            ))}
          </select>

          <select
            className="prod-select"
            value={fProducto}
            onChange={(e) => setFProducto(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
          >
            <option value="ALL">Todos los productos</option>
            {productos.map(p => (
              <option key={p.id_producto} value={p.id_producto}>
                {p.nombre}
              </option>
            ))}
          </select>

          <select
            className="prod-select"
            value={fVisible}
            onChange={(e) => setFVisible(e.target.value as "ALL" | "ON" | "OFF")}
          >
            <option value="ALL">Todos</option>
            <option value="ON">Visibles</option>
            <option value="OFF">Ocultos</option>
          </select>

          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              setQ("");
              setFMenu("ALL");
              setFSeccion("ALL");
              setFProducto("ALL");
              setFVisible("ALL");
            }}
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Crear (solo ADMIN) */}
      {isAdmin && (
        <div className="ui-card" style={{ maxWidth: 1000 }}>
          <h3 style={{ marginTop: 0 }}>Crear Item</h3>
          <form className="prod-form" onSubmit={onCreate}>
            {/* Menú */}
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Menú</label>
              <select
                className="prod-select"
                value={form.id_menu || 0}
                onChange={(e) => {
                  const id = Number(e.target.value) || 0;
                  setForm(f => ({ ...f, id_menu: id, id_seccion: null }));
                }}
              >
                <option value={0}>-- Selecciona un menú --</option>
                {menus.map(m => (
                  <option key={m.id_menu} value={m.id_menu}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Sección (opcional) */}
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Sección (opcional)</label>
              <select
                className="prod-select"
                value={form.id_seccion ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm(f => ({ ...f, id_seccion: val === "" ? null : Number(val) }));
                }}
                disabled={!form.id_menu}
              >
                <option value="">— Sin sección —</option>
                {seccionesForCreate.map(s => (
                  <option key={s.id_seccion} value={s.id_seccion!}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Producto */}
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Producto</label>
              <select
                className="prod-select"
                value={form.id_producto || 0}
                onChange={(e) => setForm(f => ({ ...f, id_producto: Number(e.target.value) || 0 }))}
              >
                <option value={0}>-- Selecciona un producto --</option>
                {productos.map(p => (
                  <option key={p.id_producto} value={p.id_producto}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              <div className="subtle" style={{ marginTop: 4 }}>
                Precio base del producto seleccionado:{" "}
                <b>
                  {form.id_producto ? money(prodPrecioById.get(form.id_producto)) : "—"}
                </b>
              </div>
            </div>

            {/* Precio override */}
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>
                Precio (override, opcional)
              </label>
              <input
                className="prod-input"
                placeholder="Dejar vacío para usar el precio del producto"
                value={form.precio_override ?? ""}
                onChange={(e) => setForm(f => ({ ...f, precio_override: parseFloatOrNull(e.target.value) }))}
              />
            </div>

            {/* Visible */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <input
                id="chk-visible"
                type="checkbox"
                checked={!!form.visible}
                onChange={(e) => setForm(f => ({ ...f, visible: e.target.checked }))}
              />
              <label htmlFor="chk-visible">Visible</label>
            </div>

            {/* Orden */}
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Orden</label>
              <input
                className="prod-input"
                type="number"
                min={1}
                value={form.orden ?? 1}
                onChange={(e) => setForm(f => ({ ...f, orden: Number(e.target.value) || 1 }))}
              />
            </div>

            <div className="col-span-2" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() =>
                  setForm({
                    id_menu: 0,
                    id_producto: 0,
                    id_seccion: null,
                    precio_override: null,
                    visible: true,
                    orden: 1,
                  } as MenuItemCreate)
                }
              >
                Limpiar
              </button>
              <button className="btn btn-primary" type="submit">
                Crear
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla (sin columna de vigencias) */}
      <div className="prod-table">
        <table className="prod-table">
          <thead>
            <tr>
              <th style={{ width: 90 }}>ID</th>
              <th>Menú</th>
              <th>Sección</th>
              <th>Producto</th>
              <th style={{ width: 120, textAlign: "right" }}>Precio base</th>
              <th style={{ width: 130, textAlign: "right" }}>Override</th>
              <th style={{ width: 90, textAlign: "center" }}>Orden</th>
              <th style={{ width: 110, textAlign: "center" }}>Visible</th>
              {isAdmin && <th style={{ width: 220 }}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 9 : 8} className="subtle" style={{ textAlign: "center", padding: 16 }}>
                  Sin resultados
                </td>
              </tr>
            )}

            {filtered.map((r) => {
              const enEdicion = editingId === r.id_menu_item;
              const prodName = prodById.get(r.id_producto) ?? r.id_producto;
              const precioBase = asNumber(prodPrecioById.get(r.id_producto));

              return (
                <tr key={r.id_menu_item}>
                  <td>{r.id_menu_item}</td>
                  <td>{menuById.get(r.id_menu) ?? r.id_menu}</td>

                  {/* Sección (doble clic) */}
                  <td onDoubleClick={() => isAdmin && startEdit(r)}>
                    {enEdicion ? (
                      <select
                        className="prod-select"
                        value={draft.id_seccion ?? (r.id_seccion ?? "")}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraft(d => ({ ...d, id_seccion: val === "" ? null : Number(val) }));
                        }}
                      >
                        <option value="">— Sin sección —</option>
                        {secciones.filter(s => s.id_menu === r.id_menu).map(s => (
                          <option key={s.id_seccion} value={s.id_seccion!}>
                            {s.nombre}
                          </option>
                        ))}
                      </select>
                    ) : (
                      r.id_seccion ? (seccById.get(r.id_seccion) ?? r.id_seccion) : "—"
                    )}
                  </td>

                  {/* Producto */}
                  <td>{prodName}</td>

                  {/* Precio base */}
                  <td style={{ textAlign: "right" }}>{money(precioBase)}</td>

                  {/* Override (doble clic) */}
                  <td onDoubleClick={() => isAdmin && startEdit(r)} style={{ textAlign: "right" }}>
                    {enEdicion ? (
                      <input
                        className="prod-input"
                        value={draft.precio_override ?? (r.precio_override ?? "")}
                        onChange={(e) =>
                          setDraft(d => ({ ...d, precio_override: parseFloatOrNull(e.target.value) }))
                        }
                        style={{ textAlign: "right" }}
                      />
                    ) : (
                      r.precio_override != null ? money(r.precio_override) : "—"
                    )}
                  </td>

                  {/* Orden (doble clic) */}
                  <td onDoubleClick={() => isAdmin && startEdit(r)} style={{ textAlign: "center" }}>
                    {enEdicion ? (
                      <input
                        className="prod-input"
                        type="number"
                        min={1}
                        value={draft.orden ?? r.orden}
                        onChange={(e) => setDraft(d => ({ ...d, orden: Number(e.target.value) || 1 }))}
                        style={{ width: 90, textAlign: "center" }}
                      />
                    ) : (
                      r.orden
                    )}
                  </td>

                  {/* Visible (doble clic) */}
                  <td onDoubleClick={() => isAdmin && startEdit(r)} style={{ textAlign: "center" }}>
                    {enEdicion ? (
                      <input
                        type="checkbox"
                        checked={!!draft.visible}
                        onChange={(e) => setDraft(d => ({ ...d, visible: e.target.checked }))}
                      />
                    ) : (
                      <span className={`pill ${r.visible ? "ok" : ""}`}>{r.visible ? "Sí" : "No"}</span>
                    )}
                  </td>

                  {isAdmin && (
                    <td style={{ display: "flex", gap: 8 }}>
                      {enEdicion ? (
                        <>
                          <button className="btn btn-primary" onClick={() => saveEdit(r)}>Guardar</button>
                          <button className="btn btn-ghost" onClick={cancelEdit}>Cancelar</button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-ghost" onClick={() => onToggleVisible(r)}>
                            {r.visible ? "Ocultar" : "Mostrar"}
                          </button>
                          <button className="btn btn-ghost" onClick={() => onDelete(r)}>
                            Eliminar
                          </button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {loading && <div className="subtle">Cargando…</div>}
    </div>
  );
}

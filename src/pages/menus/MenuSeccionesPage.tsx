import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../app/useAuth";
import type { Menu } from "../../types/menus/menu";
import type { Categoria } from "../../types/catalogos/categorias";
import type { MenuSeccion, MenuSeccionCreate, MenuSeccionPatch } from "../../types/menus/menuSeccion";

import { listMenus } from "../../services/menus/menus";
import { listCategorias } from "../../services/catalogos/categorias";
import {
  listMenuSecciones,
  createMenuSeccion,
  updateMenuSeccion,
  toggleMenuSeccionVisible,
  deleteMenuSeccion,
} from "../../services/menus/menuSecciones";

export default function MenuSeccionesPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("ADMIN");

  // Data
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<MenuSeccion[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  // Filtros
  const [q, setQ] = useState("");
  const [fMenu, setFMenu] = useState<number | "ALL">("ALL");
  const [fVisible, setFVisible] = useState<"ALL" | "ON" | "OFF">("ALL");

  // Crear
  const [form, setForm] = useState<MenuSeccionCreate>({
    id_menu: 0,
    nombre: "",
    id_categoria: null,
    visible: true,
    orden: 1,
  });

  // Edición inline
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<MenuSeccionPatch>({});

  // Carga inicial
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [ms, cs] = await Promise.all([
          listMenus({ q: "", id_tienda: undefined, activo: "ALL" }),
          listCategorias(),
        ]);
        setMenus(Array.isArray(ms) ? ms : []);
        setCategorias(Array.isArray(cs) ? cs : []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Carga de secciones (cada vez que cambian filtros “server-side”)
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await listMenuSecciones({
          q,
          id_menu: fMenu === "ALL" ? undefined : Number(fMenu),
          visible: fVisible,
        });
        setRows(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }
    })();
  }, [q, fMenu, fVisible]);

  // Índices rápidos
  const menuById = useMemo(() => new Map(menus.map(m => [m.id_menu, m.nombre])), [menus]);
  const catById  = useMemo(() => new Map(categorias.map(c => [c.id_categoria, c.nombre])), [categorias]);

  // Filtro adicional (client-side) por si quieres afinar localmente
  const filtered = useMemo(() => {
    const out = rows.slice();

    // (Ya filtramos por q/visible/id_menu desde el servidor).
    // Orden por: id_menu asc, orden asc, nombre asc
    out.sort((a, b) => {
      if (a.id_menu !== b.id_menu) return a.id_menu - b.id_menu;
      if (a.orden !== b.orden) return a.orden - b.orden;
      return a.nombre.localeCompare(b.nombre);
    });

    return out;
  }, [rows]);

  // ----- Crear -----
  async function onCreate(e: React.FormEvent) {
    e.preventDefault();

    if (!form.id_menu || !form.nombre.trim()) {
      alert("Selecciona un menú y escribe un nombre.");
      return;
    }

    const resumen = [
      `Menú: ${menuById.get(form.id_menu) ?? form.id_menu}`,
      `Nombre: ${form.nombre}`,
      `Categoría: ${form.id_categoria ? catById.get(form.id_categoria) : "—"}`,
      `Visible: ${form.visible ? "Sí" : "No"}`,
      `Orden: ${form.orden ?? 1}`,
    ].join("\n");

    const ok = confirm(`¿Crear sección?\n\n${resumen}`);
    if (!ok) return;

    try {
      const created = await createMenuSeccion(form);
      setRows(prev => [created, ...prev]);
      setForm({ id_menu: 0, nombre: "", id_categoria: null, visible: true, orden: 1 });
    } catch {
      alert("No se pudo crear la sección.");
    }
  }

  // ----- Toggle visible -----
  async function onToggleVisible(row: MenuSeccion) {
    const ok = confirm(`${row.visible ? "Ocultar" : "Mostrar"} la sección "${row.nombre}"?`);
    if (!ok) return;
    const prev = rows;
    setRows(cur => cur.map(r => (r.id_seccion === row.id_seccion ? { ...r, visible: !r.visible } : r)));
    try {
      await toggleMenuSeccionVisible(row.id_seccion, !row.visible);
    } catch {
      setRows(prev);
      alert("No se pudo cambiar el estado de visible.");
    }
  }

  // ----- Eliminar -----
  async function onDelete(row: MenuSeccion) {
    const ok = confirm(`¿Eliminar la sección "${row.nombre}"?\nEsta acción es permanente.`);
    if (!ok) return;
    const prev = rows;
    setRows(cur => cur.filter(r => r.id_seccion !== row.id_seccion));
    try {
      await deleteMenuSeccion(row.id_seccion);
    } catch {
      setRows(prev);
      alert("No se pudo eliminar (¿tiene items asociados?).");
    }
  }

  // ----- Edición inline -----
  function startEdit(row: MenuSeccion) {
    setEditingId(row.id_seccion);
    setDraft({
      nombre: row.nombre,
      id_categoria: row.id_categoria ?? null,
      visible: row.visible,
      orden: row.orden,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft({});
  }

  async function saveEdit(row: MenuSeccion) {
    const patch: MenuSeccionPatch = {};
    if (draft.nombre !== undefined && draft.nombre !== row.nombre) patch.nombre = draft.nombre;
    if (draft.id_categoria !== undefined && draft.id_categoria !== row.id_categoria) {
      patch.id_categoria = draft.id_categoria;
    }
    if (draft.visible !== undefined && draft.visible !== row.visible) patch.visible = draft.visible;
    if (draft.orden !== undefined && draft.orden !== row.orden) patch.orden = draft.orden;

    if (Object.keys(patch).length === 0) {
      cancelEdit();
      return;
    }

    const resumen = [
      patch.nombre !== undefined ? `Nombre: "${row.nombre}" → "${patch.nombre}"` : null,
      patch.id_categoria !== undefined
        ? `Categoría: "${row.id_categoria ? catById.get(row.id_categoria) : "—"}" → "${patch.id_categoria ? catById.get(patch.id_categoria) : "—"}"`
        : null,
      patch.visible !== undefined ? `Visible: ${row.visible ? "Sí" : "No"} → ${patch.visible ? "Sí" : "No"}` : null,
      patch.orden !== undefined ? `Orden: ${row.orden} → ${patch.orden}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const ok = confirm(`¿Guardar cambios de la sección "${row.nombre}"?\n\n${resumen}`);
    if (!ok) return;

    const prev = rows;
    setRows(cur => cur.map(r => (r.id_seccion === row.id_seccion ? { ...r, ...patch } : r)));
    try {
      const updated = await updateMenuSeccion(row.id_seccion, patch);
      setRows(cur => cur.map(r => (r.id_seccion === row.id_seccion ? updated : r)));
      cancelEdit();
    } catch {
      setRows(prev);
      alert("No se pudo guardar los cambios.");
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Título */}
      <div className="prod-toolbar">
        <h2 className="h1" style={{ margin: 0 }}>Secciones de menú</h2>
      </div>

      {/* Filtros */}
      <div className="ui-card" style={{ display: "grid", gap: 8, padding: 12 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <input
            className="prod-input"
            placeholder="Buscar por nombre…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <select
            className="prod-select"
            value={fMenu}
            onChange={(e) => setFMenu(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
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
            value={fVisible}
            onChange={(e) => setFVisible(e.target.value as "ALL" | "ON" | "OFF")}
          >
            <option value="ALL">Todas</option>
            <option value="ON">Visibles</option>
            <option value="OFF">Ocultas</option>
          </select>

          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              setQ("");
              setFMenu("ALL");
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
          <h3 style={{ marginTop: 0 }}>Crear sección</h3>
          <form className="prod-form" onSubmit={onCreate}>
            {/* Menú */}
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Menú</label>
              <select
                className="prod-select"
                value={form.id_menu || 0}
                onChange={(e) => setForm(f => ({ ...f, id_menu: Number(e.target.value) }))}
              >
                <option value={0}>-- Selecciona un menú --</option>
                {menus.map(m => (
                  <option key={m.id_menu} value={m.id_menu}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Nombre */}
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Nombre</label>
              <input
                className="prod-input"
                value={form.nombre}
                onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Bebidas, Hamburguesas, Promos…"
              />
            </div>

            {/* Categoría opcional */}
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Categoría (opcional)</label>
              <select
                className="prod-select"
                value={form.id_categoria ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm(f => ({ ...f, id_categoria: val === "" ? null : Number(val) }));
                }}
              >
                <option value="">— Sin categoría —</option>
                {categorias.map(c => (
                  <option key={c.id_categoria} value={c.id_categoria}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Visible (fila aparte) */}
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
                onClick={() => setForm({ id_menu: 0, nombre: "", id_categoria: null, visible: true, orden: 1 })}
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

      {/* Tabla */}
      <div className="prod-table">
        <table className="prod-table">
          <thead>
            <tr>
              <th style={{ width: 90 }}>ID</th>
              <th>Menú</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th style={{ width: 90 }}>Orden</th>
              <th style={{ width: 110 }}>Visible</th>
              {isAdmin && <th style={{ width: 240 }}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="subtle" style={{ textAlign: "center", padding: 16 }}>
                  Sin resultados
                </td>
              </tr>
            )}

            {filtered.map((r) => {
              const enEdicion = editingId === r.id_seccion;
              return (
                <tr key={r.id_seccion}>
                  <td>{r.id_seccion}</td>
                  <td>{menuById.get(r.id_menu) ?? r.id_menu}</td>

                  {/* Nombre (doble clic) */}
                  <td onDoubleClick={() => isAdmin && startEdit(r)}>
                    {enEdicion ? (
                      <input
                        className="prod-input"
                        value={draft.nombre ?? ""}
                        onChange={(e) => setDraft(d => ({ ...d, nombre: e.target.value }))}
                      />
                    ) : (
                      r.nombre
                    )}
                  </td>

                  {/* Categoría (doble clic) */}
                  <td onDoubleClick={() => isAdmin && startEdit(r)}>
                    {enEdicion ? (
                      <select
                        className="prod-select"
                        value={draft.id_categoria ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraft(d => ({ ...d, id_categoria: val === "" ? null : Number(val) }));
                        }}
                      >
                        <option value="">— Sin categoría —</option>
                        {categorias.map(c => (
                          <option key={c.id_categoria} value={c.id_categoria}>
                            {c.nombre}
                          </option>
                        ))}
                      </select>
                    ) : (
                      r.id_categoria ? (catById.get(r.id_categoria) ?? r.id_categoria) : "—"
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

                  {/* Visible (doble clic para editar boolean) */}
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
                          <button className="btn btn-ghost" onClick={() => onDelete(r)}>Eliminar</button>
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

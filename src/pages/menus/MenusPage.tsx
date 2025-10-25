import { useEffect, useMemo, useState } from "react";
import "../../theme/menus/menus.css";
import { useAuth } from "../../app/useAuth";

import type { Menu, MenuCreate, MenuPatch } from "../../types/menus/menu";
import { listMenus, createMenu, updateMenu, deleteMenu, toggleMenuActivo } from "../../services/menus/menus";

import type { Tienda } from "../../types/pedidos/tienda";
import { listTiendas } from "../../services/pedidos/tiendas";

export default function MenusPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("ADMIN");

  // datos
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Menu[]>([]);
  const [tiendas, setTiendas] = useState<Tienda[]>([]);

  // filtros
  const [q, setQ] = useState("");
  const [fActivo, setFActivo] = useState<"ALL" | "ON" | "OFF">("ALL");
  const [fTienda, setFTienda] = useState<number>(0);

  // form crear
  const [form, setForm] = useState<MenuCreate>({
    id_tienda: 0,
    nombre: "",
    canal: "",
    activo: true,
  });

  // edición inline
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<MenuPatch>({});

  // carga inicial (menús + tiendas reales)
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [menusData, tiendasData] = await Promise.all([listMenus(), listTiendas()]);
        setRows(Array.isArray(menusData) ? menusData : []);
        setTiendas(Array.isArray(tiendasData) ? tiendasData : []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let out = rows.slice();

    const t = q.trim().toLowerCase();
    if (t) {
      out = out.filter((r) =>
        (r.nombre?.toLowerCase().includes(t) || "") ||
        (r.canal?.toLowerCase().includes(t) || "")
      );
    }

    if (fActivo !== "ALL") {
      out = out.filter((r) => r.activo === (fActivo === "ON"));
    }

    if (fTienda > 0) {
      out = out.filter((r) => r.id_tienda === fTienda);
    }

    // orden
    out.sort((a, b) => {
      if (a.id_tienda !== b.id_tienda) return a.id_tienda - b.id_tienda;
      if (a.activo !== b.activo) return Number(b.activo) - Number(a.activo);
      return a.nombre.localeCompare(b.nombre);
    });

    return out;
  }, [rows, q, fActivo, fTienda]);

  // crear
  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.id_tienda || !form.nombre.trim()) {
      alert("Selecciona tienda y escribe el nombre del menú.");
      return;
    }
    const tiendaNombre = tiendas.find(t => t.id_tienda === form.id_tienda)?.nombre ?? `#${form.id_tienda}`;
    const ok = confirm(`¿Crear menú?\n\nTienda: ${tiendaNombre}\nNombre: ${form.nombre}\nCanal: ${form.canal || "-"}\nActivo: ${form.activo ? "Sí" : "No"}`);
    if (!ok) return;

    try {
      const created = await createMenu(form);
      setRows((prev) => [created, ...prev]);
      setForm({ id_tienda: 0, nombre: "", canal: "", activo: true });
    } catch {
      alert("No se pudo crear. ¿Nombre duplicado en la misma tienda?");
    }
  }

  // toggle activo
  async function onToggle(row: Menu) {
    const ok = confirm(`${row.activo ? "Desactivar" : "Activar"} el menú "${row.nombre}"?`);
    if (!ok) return;
    const prev = rows;
    setRows(cur => cur.map(r => r.id_menu === row.id_menu ? { ...r, activo: !r.activo } : r));
    try {
      await toggleMenuActivo(row.id_menu, !row.activo);
    } catch {
      setRows(prev);
      alert("No se pudo cambiar el estado.");
    }
  }

  // eliminar
  async function onDelete(row: Menu) {
    const ok = confirm(`¿Eliminar el menú "${row.nombre}"? Esta acción es permanente.`);
    if (!ok) return;
    const prev = rows;
    setRows(cur => cur.filter(r => r.id_menu !== row.id_menu));
    try {
      await deleteMenu(row.id_menu);
    } catch {
      setRows(prev);
      alert("No se pudo eliminar (¿tiene secciones/items asociados?).");
    }
  }

  // edición inline
  function startEdit(row: Menu) {
    setEditingId(row.id_menu);
    setDraft({ nombre: row.nombre, canal: row.canal ?? "" });
  }
  function cancelEdit() {
    setEditingId(null);
    setDraft({});
  }
  async function saveEdit(row: Menu) {
    const patch: MenuPatch = {};
    if (draft.nombre !== undefined && draft.nombre !== row.nombre) patch.nombre = draft.nombre;
    if (draft.canal !== undefined && draft.canal !== (row.canal ?? "")) patch.canal = draft.canal;

    if (Object.keys(patch).length === 0) {
      cancelEdit();
      return;
    }

    const resumen = [
      patch.nombre !== undefined ? `Nombre: "${row.nombre}" → "${patch.nombre}"` : null,
      patch.canal !== undefined ? `Canal: "${row.canal ?? ""}" → "${patch.canal}"` : null,
    ].filter(Boolean).join("\n");

    const ok = confirm(`¿Guardar cambios del menú "${row.nombre}"?\n\n${resumen}`);
    if (!ok) return;

    const prev = rows;
    setRows(cur => cur.map(r => r.id_menu === row.id_menu ? { ...r, ...patch } : r));
    try {
      const updated = await updateMenu(row.id_menu, patch);
      setRows(cur => cur.map(r => r.id_menu === row.id_menu ? updated : r));
      cancelEdit();
    } catch {
      setRows(prev);
      alert("No se pudo guardar los cambios.");
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="prod-toolbar">
        <h2 className="h1" style={{ margin: 0 }}>Menús</h2>
      </div>

      {/* Filtros */}
      <div className="ui-card" style={{ display: "grid", gap: 8, padding: 12 }}>
        <div className="menus-toolbar">
          <input
            className="prod-input"
            placeholder="Buscar por nombre o canal…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <select
            className="prod-select"
            value={fActivo}
            onChange={(e) => setFActivo(e.target.value as "ALL" | "ON" | "OFF")}
          >
            <option value="ALL">Todos</option>
            <option value="ON">Activos</option>
            <option value="OFF">Inactivos</option>
          </select>

          <select
            className="prod-select"
            value={fTienda}
            onChange={(e) => setFTienda(Number(e.target.value))}
          >
            <option value={0}>Todas las tiendas</option>
            {tiendas.map(t => (
              <option key={t.id_tienda} value={t.id_tienda}>{t.nombre}</option>
            ))}
          </select>

          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              setQ("");
              setFActivo("ALL");
              setFTienda(0);
            }}
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Crear (solo ADMIN) */}
      {isAdmin && (
        <div className="ui-card" style={{ maxWidth: 900 }}>
          <h3 style={{ marginTop: 0 }}>Crear menú</h3>
          <form className="prod-form" onSubmit={onCreate}>
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Tienda</label>
              <select
                className="prod-select"
                value={form.id_tienda}
                onChange={(e) => setForm(f => ({ ...f, id_tienda: Number(e.target.value) }))}
              >
                <option value={0}>Seleccione…</option>
                {tiendas.map(t => (
                  <option key={t.id_tienda} value={t.id_tienda}>{t.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Nombre</label>
              <input
                className="prod-input"
                value={form.nombre}
                onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Menú General"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Canal</label>
              <input
                className="prod-input"
                value={form.canal ?? ""}
                onChange={(e) => setForm(f => ({ ...f, canal: e.target.value }))}
                placeholder="Opcional"
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8,marginTop: 90 }}>
              <input
                id="chk-activo"
                type="checkbox"
                checked={!!form.activo}
                onChange={(e) => setForm(f => ({ ...f, activo: e.target.checked }))}
              />
              <label htmlFor="chk-activo">Activo</label>
            </div>

            <div className="col-span-2" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="btn btn-ghost" type="button" onClick={() => setForm({ id_tienda: 0, nombre: "", canal: "", activo: true })}>
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
              <th>Tienda</th>
              <th>Nombre</th>
              <th>Canal</th>
              <th>Activo</th>
              {isAdmin && <th style={{ width: 220 }}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="subtle" style={{ textAlign: "center", padding: 16 }}>
                  Sin resultados
                </td>
              </tr>
            )}

            {filtered.map((r) => {
              const enEdicion = editingId === r.id_menu;
              const tiendaNombre = tiendas.find(t => t.id_tienda === r.id_tienda)?.nombre ?? `#${r.id_tienda}`;

              return (
                <tr key={r.id_menu}>
                  <td>{r.id_menu}</td>
                  <td>{tiendaNombre}</td>

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

                  <td onDoubleClick={() => isAdmin && startEdit(r)}>
                    {enEdicion ? (
                      <input
                        className="prod-input"
                        value={draft.canal ?? ""}
                        onChange={(e) => setDraft(d => ({ ...d, canal: e.target.value }))}
                      />
                    ) : (
                      r.canal ?? ""
                    )}
                  </td>

                  <td>
                    <span className={`pill ${r.activo ? "ok" : ""}`}>{r.activo ? "Activo" : "Inactivo"}</span>
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
                          <button className="btn btn-ghost" onClick={() => onToggle(r)}>
                            {r.activo ? "Desactivar" : "Activar"}
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

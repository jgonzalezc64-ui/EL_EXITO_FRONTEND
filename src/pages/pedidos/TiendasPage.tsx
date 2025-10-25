import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../app/useAuth";
import type { Tienda, TiendaCreate, TiendaPatch } from "../../types/pedidos/tienda";
import {
  listTiendas,
  createTienda,
  updateTienda,
  toggleTiendaActiva,
  deleteTienda,
} from "../../services/pedidos/tiendas";

export default function TiendasPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("ADMIN");

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Tienda[]>([]);
  const [q, setQ] = useState("");
  const [fActiva, setFActiva] = useState<"ALL" | "ON" | "OFF">("ALL");

  // Crear
  const [form, setForm] = useState<TiendaCreate>({ nombre: "", codigo: "", activa: true });

  // Edición inline
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<TiendaPatch>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await listTiendas();
        setRows(Array.isArray(data) ? data : []);
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
        (r.codigo?.toLowerCase().includes(t) || "")
      );
    }

    if (fActiva !== "ALL") {
      out = out.filter((r) => r.activa === (fActiva === "ON"));
    }

    // Orden: activa desc, nombre asc
    out.sort((a, b) => {
      if (a.activa !== b.activa) return Number(b.activa) - Number(a.activa);
      return a.nombre.localeCompare(b.nombre);
    });

    return out;
  }, [rows, q, fActiva]);

  // Crear
  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
        if (!form.nombre.trim() || !form.codigo.trim()) {
            alert("Completa nombre y código.");
            return;
        }

        const ok = confirm(
            `¿Crear tienda?\n\nNombre: ${form.nombre}\nCódigo: ${form.codigo}\nActiva: ${form.activa ? "Sí" : "No"}`
        );
        if (!ok) return;

        try {
            const created = await createTienda(form);
            setRows((prev) => [created, ...prev]);
            setForm({ nombre: "", codigo: "", activa: true });
        } catch {
            alert("No se pudo crear (¿código duplicado?).");
        }
    }

  // Toggle activa
  async function onToggle(row: Tienda) {
    const ok = confirm(`${row.activa ? "Desactivar" : "Activar"} la tienda "${row.nombre}"?`);
    if (!ok) return;
    const prev = rows;
    setRows((cur) => cur.map((r) => (r.id_tienda === row.id_tienda ? { ...r, activa: !r.activa } : r)));
    try {
      await toggleTiendaActiva(row.id_tienda, !row.activa);
    } catch {
      setRows(prev);
      alert("No se pudo cambiar el estado.");
    }
  }

  // Eliminar
  async function onDelete(row: Tienda) {
    const ok = confirm(`¿Eliminar la tienda "${row.nombre}"? Esta acción es permanente.`);
    if (!ok) return;
    const prev = rows;
    setRows((cur) => cur.filter((r) => r.id_tienda !== row.id_tienda));
    try {
      await deleteTienda(row.id_tienda);
    } catch {
      setRows(prev);
      alert("No se pudo eliminar (¿tiene mesas/menús asociados?).");
    }
  }

  // Edición inline
  function startEdit(row: Tienda) {
    setEditingId(row.id_tienda);
    setDraft({ nombre: row.nombre, codigo: row.codigo });
  }
  function cancelEdit() {
    setEditingId(null);
    setDraft({});
  }
  async function saveEdit(row: Tienda) {
    const patch: TiendaPatch = {};
        if (draft.nombre !== undefined && draft.nombre !== row.nombre) patch.nombre = draft.nombre;
        if (draft.codigo !== undefined && draft.codigo !== row.codigo) patch.codigo = draft.codigo;

        if (Object.keys(patch).length === 0) {
            cancelEdit();
            return;
        }

        const resumen = [
            patch.nombre !== undefined ? `Nombre: "${row.nombre}" → "${patch.nombre}"` : null,
            patch.codigo !== undefined ? `Código: "${row.codigo}" → "${patch.codigo}"` : null,
        ].filter(Boolean).join("\n");

        const ok = confirm(`¿Guardar cambios de la tienda "${row.nombre}"?\n\n${resumen}`);
        if (!ok) return;

        const prev = rows;
        setRows((cur) => cur.map((r) => (r.id_tienda === row.id_tienda ? { ...r, ...patch } : r)));
        try {
            const updated = await updateTienda(row.id_tienda, patch);
            setRows((cur) => cur.map((r) => (r.id_tienda === row.id_tienda ? updated : r)));
            cancelEdit();
        } catch {
            setRows(prev);
            alert("No se pudo guardar los cambios.");
        }
    }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="prod-toolbar">
        <h2 className="h1" style={{ margin: 0 }}>Tiendas</h2>
      </div>

      {/* Filtros */}
      <div className="ui-card" style={{ display: "grid", gap: 8, padding: 12 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <input
            className="prod-input"
            placeholder="Buscar por nombre o código…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="prod-select"
            value={fActiva}
            onChange={(e) => setFActiva(e.target.value as "ALL" | "ON" | "OFF")}
          >
            <option value="ALL">Todas</option>
            <option value="ON">Activas</option>
            <option value="OFF">Inactivas</option>
          </select>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              setQ("");
              setFActiva("ALL");
            }}
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Crear (solo ADMIN) */}
      {isAdmin && (
        <div className="ui-card" style={{ maxWidth: 900 }}>
          <h3 style={{ marginTop: 0 }}>Crear tienda</h3>
          <form className="prod-form" onSubmit={onCreate}>
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Nombre</label>
              <input
                className="prod-input"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Tienda"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Código</label>
              <input
                className="prod-input"
                value={form.codigo}
                onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
                placeholder="Código"
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                id="chk-activa"
                type="checkbox"
                checked={!!form.activa}
                onChange={(e) => setForm((f) => ({ ...f, activa: e.target.checked }))}
              />
              <label htmlFor="chk-activa">Activa</label>
            </div>

            <div className="col-span-2" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setForm({ nombre: "", codigo: "", activa: true })}
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
              <th>Nombre</th>
              <th>Código</th>
              <th>Activa</th>
              {isAdmin && <th style={{ width: 200 }}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="subtle" style={{ textAlign: "center", padding: 16 }}>
                  Sin resultados
                </td>
              </tr>
            )}

            {filtered.map((r) => {
              const enEdicion = editingId === r.id_tienda;
              return (
                <tr key={r.id_tienda}>
                  <td>{r.id_tienda}</td>

                  {/* Nombre (doble clic para editar) */}
                  <td onDoubleClick={() => isAdmin && startEdit(r)}>
                    {enEdicion ? (
                      <input
                        className="prod-input"
                        value={draft.nombre ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, nombre: e.target.value }))}
                      />
                    ) : (
                      r.nombre
                    )}
                  </td>

                  {/* Código (doble clic para editar) */}
                  <td onDoubleClick={() => isAdmin && startEdit(r)}>
                    {enEdicion ? (
                      <input
                        className="prod-input"
                        value={draft.codigo ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, codigo: e.target.value }))}
                      />
                    ) : (
                      r.codigo
                    )}
                  </td>

                  <td>
                    <span className={`pill ${r.activa ? "ok" : ""}`}>{r.activa ? "Activa" : "Inactiva"}</span>
                  </td>

                  {isAdmin && (
                    <td style={{ display: "flex", gap: 8 }}>
                      {enEdicion ? (
                        <>
                          <button className="btn btn-primary" onClick={() => saveEdit(r)}>
                            Guardar
                          </button>
                          <button className="btn btn-ghost" onClick={cancelEdit}>
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-ghost" onClick={() => onToggle(r)}>
                            {r.activa ? "Desactivar" : "Activar"}
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

// frontend/src/pages/pedidos/MesasPage.tsx
// jose: pantalla CRUD de Mesas, sin “pedidos-admin” en la ruta del front

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../app/useAuth";                         // jose
import type { Mesa, Tienda } from "../../types/pedidos";             // jose
import {
  listMesas,
  createMesa,
  updateMesa,
  deleteMesa,
} from "../../services/pedidos/mesas";                               // jose
import { listTiendas } from "../../services/pedidos/catalogos";       // jose

/* ---------------- helpers estrictos (sin any) ---------------- */

// typeguard objeto
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

// acepta arreglo plano o respuesta paginada { results: T[] }
function asArray<T>(d: unknown): T[] {
  if (Array.isArray(d)) return d as T[];
  if (isObject(d) && Array.isArray((d as { results?: unknown[] }).results)) {
    return ((d as { results: unknown[] }).results ?? []) as T[];
  }
  return [];
}

type MaybeAxiosError = {
  response?: { data?: unknown; statusText?: string };
  message?: string;
  toString?: () => string;
};

function errorMsg(err: unknown): string {
  if (typeof err === "string") return err;
  if (isObject(err)) {
    const e = err as MaybeAxiosError;
    const fromData =
      typeof e.response?.data === "string"
        ? e.response?.data
        : undefined;
    const text =
      fromData ??
      e.response?.statusText ??
      e.message ??
      e.toString?.();
    return typeof text === "string" && text.trim() ? text : "Error desconocido";
  }
  return "Error desconocido";
}

/* --------------------------- Componente --------------------------- */

export default function MesasPage() {
  const { hasRole } = useAuth();
  const canAdmin = hasRole("ADMIN");

  // datos
  const [rows, setRows] = useState<Mesa[]>([]);
  const [tiendas, setTiendas] = useState<Tienda[]>([]);

  // ui/estado
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [fTienda, setFTienda] = useState<number | undefined>(undefined);
  const [edit, setEdit] = useState<Partial<Mesa> | null>(null);

  // mapa de tiendas para lookup rápido (evita tiendas.find)
  const tiendaMap = useMemo(() => {
    const m = new Map<number, Tienda>();
    tiendas.forEach((t) => m.set(t.id_tienda, t));
    return m;
  }, [tiendas]);

  // carga inicial de catálogos y primer listado
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const ts = await listTiendas();
        setTiendas(asArray<Tienda>(ts));
        await reload(); // primer query con filtros por defecto
      } catch (err) {
        console.error(err);
        alert("No se pudieron cargar los catálogos de pedidos.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // recarga con filtros actuales
  async function reload() {
    setLoading(true);
    try {
      const ms = await listMesas({
        search: q || undefined,
        id_tienda: typeof fTienda === "number" ? fTienda : undefined,
      });
      setRows(ms);
    } catch (err) {
      console.error(err);
      alert("No se pudieron cargar las mesas.");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!edit) return;
    try {
      const payload: Partial<Mesa> = {
        codigo: edit.codigo?.trim(),
        ubicacion: (edit.ubicacion ?? "").trim() || undefined,
        activa: edit.activa ?? true,
        id_tienda: edit.id_tienda ?? undefined,
      };

      if (edit.id_mesa) {
        await updateMesa(edit.id_mesa, payload);
      } else {
        await createMesa(payload);
      }
      setEdit(null);
      await reload();
    } catch (err) {
      console.error(err);
      alert("No se pudo guardar la mesa.\n" + errorMsg(err));
    }
  }

  async function del(m: Mesa) {
    if (!confirm(`¿Eliminar la mesa "${m.codigo}"?`)) return;
    try {
      await deleteMesa(m.id_mesa);
      await reload();
    } catch (err) {
      console.error(err);
      alert("No se pudo eliminar la mesa.");
    }
  }

  // render
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <h1 className="h1" style={{ marginTop: 0 }}>
        Mesas
      </h1>

      {/* Filtros */}
      <div className="ped-row" style={{ gap: 8, flexWrap: "wrap" }}>
        <select
          className="ped-select"
          value={fTienda ?? ""}
          onChange={(e) =>
            setFTienda(e.target.value ? Number(e.target.value) : undefined)
          }
          title="Filtrar por tienda"
        >
          <option value="">(todas las tiendas)</option>
          {tiendas.map((t) => (
            <option key={t.id_tienda} value={t.id_tienda}>
              {t.nombre}
            </option>
          ))}
        </select>

        <input
          className="ped-input"
          placeholder="Buscar…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn btn-ghost" onClick={() => setQ("")}>
          Limpiar
        </button>
        <button className="btn btn-primary" onClick={reload}>
          Buscar
        </button>

        {canAdmin && (
          <button
            className="btn btn-primary"
            style={{ marginLeft: "auto" }}
            onClick={() =>
              setEdit({
                activa: true,
              })
            }
          >
            Nueva mesa
          </button>
        )}
      </div>

      {/* Tabla */}
      <div style={{ overflowX: "auto" }}>
        <table className="cat-table" style={{ minWidth: 820 }}>
          <thead>
            <tr>
              <th style={{ width: 70 }}>#</th>
              <th style={{ width: 160 }}>Código</th>
              <th>Ubicación</th>
              <th>Tienda</th>
              <th style={{ width: 90 }}>Activa</th>
              <th style={{ width: 220 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id_mesa}>
                <td>#{m.id_mesa}</td>
                <td>{m.codigo}</td>
                <td>{m.ubicacion ?? ""}</td>
                <td>{tiendaMap.get(m.id_tienda ?? -1)?.nombre ?? "-"}</td>
                <td>{m.activa ? "Sí" : "No"}</td>
                <td className="cat-actions">
                  {canAdmin && (
                    <>
                      <button
                        className="btn btn-primary"
                        onClick={() => setEdit(m)}
                      >
                        Editar
                      </button>
                      <button className="btn btn-ghost" onClick={() => del(m)}>
                        Eliminar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {loading && (
              <tr>
                <td colSpan={6}>
                  <div className="subtle">Cargando…</div>
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="subtle">Sin resultados</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Form de edición/alta */}
      {canAdmin && edit && (
        <div className="ped-card">
          <h3 style={{ marginTop: 0 }}>
            {edit.id_mesa ? "Editar mesa" : "Nueva mesa"}
          </h3>

          <div className="ped-form-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
            <div>
              <label style={{ fontSize: 12, marginBottom: 6, display: "block" }}>
                Código
              </label>
              <input
                className="ped-input"
                value={edit.codigo ?? ""}
                onChange={(e) =>
                  setEdit((s) => ({ ...(s ?? {}), codigo: e.target.value }))
                }
              />
            </div>

            <div>
              <label style={{ fontSize: 12, marginBottom: 6, display: "block" }}>
                Ubicación
              </label>
              <input
                className="ped-input"
                value={edit.ubicacion ?? ""}
                onChange={(e) =>
                  setEdit((s) => ({ ...(s ?? {}), ubicacion: e.target.value }))
                }
              />
            </div>

            <div>
              <label style={{ fontSize: 12, marginBottom: 6, display: "block" }}>
                Tienda
              </label>
              <select
                className="ped-select"
                value={edit.id_tienda ?? ""}
                onChange={(e) =>
                  setEdit((s) => ({
                    ...(s ?? {}),
                    id_tienda: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              >
                <option value="">(sin asignar)</option>
                {tiendas.map((t) => (
                  <option key={t.id_tienda} value={t.id_tienda}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, marginBottom: 6, display: "block" }}>
                Activa
              </label>
              <select
                className="ped-select"
                value={edit.activa ? "1" : "0"}
                onChange={(e) =>
                  setEdit((s) => ({ ...(s ?? {}), activa: e.target.value === "1" }))
                }
              >
                <option value="1">Sí</option>
                <option value="0">No</option>
              </select>
            </div>

            <div className="ped-actions" style={{ gridColumn: "1 / span 4", justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setEdit(null)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={save}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

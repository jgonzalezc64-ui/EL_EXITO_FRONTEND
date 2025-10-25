// frontend/src/pages/pedidos/PedidosPage.tsx
import { useEffect, useMemo, useState } from "react";
import "../../theme/pedidos/pedidos.css";
import { useAuth } from "../../app/useAuth";
import { isAxiosError } from "axios";
import {
  listOrdenes,
  abrirOrden,
  getOrden,
  aplicarDescuento,
  // cambiarEstado,                                  // jose: NO usar el viejo
  cambiarEstadoOrden,                                // jose: usar esta función que pega a /pedidos/ordenes/${id}/cambiar-estado/
} from "../../services/pedidos/ordenes";             // jose
import {
  listTiendas,
  listMesas,
  listEstadosOrden,
  listTiposServicio,
} from "../../services/pedidos/catalogos";
import type {
  Orden,
  Tienda,
  Mesa,
  EstadoOrden,
  TipoServicio,
  AbrirOrdenPayload,
} from "../../types/pedidos";
import OrderEditor from "./components/OrderEditor";

/* -------------------- helpers seguros para montos -------------------- */
function num(v: unknown): number {
  const n =
    typeof v === "number"
      ? v
      : v == null
      ? 0
      : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
function money(v: unknown): string {
  return num(v).toFixed(2);
}

/* ------------------------- helper de seguridad ------------------------ */
// Asegura que lo que llega sea arreglo. Si no, devuelve [].
function ensureArray<T>(x: unknown): T[] {
  return Array.isArray(x) ? (x as T[]) : [];
}

export default function PedidosPage() {
  const { hasRole } = useAuth();

  // Antes: solo ADMIN o MESERO. Ahora también CAJA; COCINA queda fuera
  const canEdit = hasRole("ADMIN") || hasRole("MESERO") || hasRole("CAJA");

  // Arranques tipados como arreglos vacíos (evita map sobre undefined)
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [estados, setEstados] = useState<EstadoOrden[]>([]);
  const [tiposServ, setTiposServ] = useState<TipoServicio[]>([]);

  const [items, setItems] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<Orden | null>(null);

  // Form para abrir orden
  const [f, setF] = useState<{
    id_tipo_servicio?: number;
    id_tienda?: number;
    id_mesa?: number | null;
    observaciones?: string;
  }>({});

  const isMesa = useMemo(() => {
    const ts = tiposServ.find((t) => t.id_tipo_servicio === f.id_tipo_servicio);
    return (ts?.nombre ?? "").toUpperCase() === "MESA";
  }, [f.id_tipo_servicio, tiposServ]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [os, ts, ms, es, tps] = await Promise.all([
          listOrdenes(),
          listTiendas(),
          listMesas(),
          listEstadosOrden(),
          listTiposServicio(),
        ]);

        // 🔒 Siempre forzar a arreglo para no romper los .map
        setItems(ensureArray<Orden>(os));
        setTiendas(ensureArray<Tienda>(ts));
        setMesas(ensureArray<Mesa>(ms));
        setEstados(ensureArray<EstadoOrden>(es));
        setTiposServ(ensureArray<TipoServicio>(tps));

        const first = ensureArray<Orden>(os)[0] ?? null;
        setSel(first);
      } catch (err) {
        console.error(err);
        alert("No se pudieron cargar los datos de pedidos.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function reloadOrden(id: number) {
    try {
      const o = await getOrden(id);
      setSel(o);
      setItems((prev) => prev.map((x) => (x.id_orden === id ? o : x)));
    } catch (err) {
      console.error(err);
      alert("No se pudo recargar la orden seleccionada.");
    }
  }

  async function onAbrir(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;

    if (!f.id_tipo_servicio) {
      alert("Selecciona un tipo de servicio");
      return;
    }
    if (isMesa && !f.id_mesa) {
      alert("Selecciona una mesa");
      return;
    }
    if (!confirm("¿Abrir nueva orden?")) return;

    const payload: AbrirOrdenPayload = {
      id_tipo_servicio: f.id_tipo_servicio,
      id_mesa: isMesa ? f.id_mesa ?? null : null,
      observaciones: f.observaciones || undefined,
    };
    try {
      const created = await abrirOrden(payload);
      setItems((prev) => [created, ...prev]);
      setSel(created);
      setF({});
    } catch (err) {
      console.error(err);
      alert("No se pudo abrir la orden.");
    }
  }

  async function onAplicarDesc(idOrden: number, descuento: number) {
    if (!canEdit) return;
    const d = num(descuento);
    if (!confirm(`¿Aplicar descuento Q${money(d)} a la orden #${idOrden}?`))
      return;
    try {
      const updated = await aplicarDescuento(idOrden, d);
      setItems((prev) => prev.map((x) => (x.id_orden === idOrden ? updated : x)));
      setSel(updated);
    } catch (err) {
      console.error(err);
      alert("No se pudo aplicar el descuento.");
    }
  }

  async function onCambiarEstado(idOrden: number, id_estado: number) {
    if (!canEdit) return;

    const est = estados.find((e) => e.id_estado === id_estado)?.nombre ?? "";
    if (!confirm(`¿Cambiar estado a "${est}"?`)) return;

    try {
      // IMPORTANTÍSIMO: usar el servicio con URL correcta /pedidos/ordenes/${id}/cambiar-estado/  // jose
      const updated = await cambiarEstadoOrden(idOrden, { id_estado });                                            // jose
      setItems((prev) => prev.map((x) => (x.id_orden === idOrden ? updated : x)));
      setSel(updated);
    } catch (err: unknown) { // jose
  const detail =
    isAxiosError(err)                       // jose
      ? (err.response?.data ?? err.message) // jose
      : err instanceof Error
      ? err.message
      : String(err);

  console.error("Cambiar estado ERROR:", detail, err); // jose
  alert("No se pudo cambiar el estado.");              // jose
}

  }

  const mesasDeTienda = useMemo(() => {
    if (!f.id_tienda) return mesas.filter((m) => m.activa);
    return mesas.filter((m) => m.activa && m.id_tienda === f.id_tienda);
  }, [f.id_tienda, mesas]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <h1 className="h1" style={{ marginTop: 0 }}>
        Pedidos
      </h1>

      <div className="ped-grid">
        {/* Columna izquierda: abrir + lista */}
        <div className="ped-card">
          {canEdit && (
            <>
              <h3 style={{ marginBottom: 8 }}>Abrir orden</h3>
              <form
                onSubmit={onAbrir}
                className="ped-form-grid"
                style={{ marginBottom: 12 }}
              >
                <div>
                  <label
                    style={{ fontSize: 12, marginBottom: 6, display: "block" }}
                  >
                    Tipo de servicio
                  </label>
                  <select
                    className="ped-select"
                    value={f.id_tipo_servicio ?? ""}
                    onChange={(e) =>
                      setF((s) => ({
                        ...s,
                        id_tipo_servicio: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      }))
                    }
                  >
                    <option value="">Selecciona</option>
                    {(tiposServ ?? []).map((t) => (
                      <option key={t.id_tipo_servicio} value={t.id_tipo_servicio}>
                        {t.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{ fontSize: 12, marginBottom: 6, display: "block" }}
                  >
                    Tienda (para mesas)
                  </label>
                  <select
                    className="ped-select"
                    value={f.id_tienda ?? ""}
                    onChange={(e) =>
                      setF((s) => ({
                        ...s,
                        id_tienda: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                        id_mesa: undefined,
                      }))
                    }
                  >
                    <option value="">(todas)</option>
                    {(tiendas ?? []).map((t) => (
                      <option key={t.id_tienda} value={t.id_tienda}>
                        {t.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ gridColumn: "1 / span 2" }}>
                  <label
                    style={{ fontSize: 12, marginBottom: 6, display: "block" }}
                  >
                    Mesa (si aplica)
                  </label>
                  <select
                    className="ped-select"
                    value={f.id_mesa ?? ""}
                    onChange={(e) =>
                      setF((s) => ({
                        ...s,
                        id_mesa: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      }))
                    }
                    disabled={!isMesa}
                  >
                    <option value="">
                      {isMesa ? "Selecciona" : "(no requerido)"}
                    </option>
                    {(mesasDeTienda ?? []).map((m) => (
                      <option key={m.id_mesa} value={m.id_mesa}>
                        {m.codigo} {m.ubicacion ? `- ${m.ubicacion}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ gridColumn: "1 / span 2" }}>
                  <label
                    style={{ fontSize: 12, marginBottom: 6, display: "block" }}
                  >
                    Observaciones
                  </label>
                  <textarea
                    className="ped-textarea"
                    value={f.observaciones ?? ""}
                    onChange={(e) =>
                      setF((s) => ({ ...s, observaciones: e.target.value }))
                    }
                  />
                </div>

                <div
                  className="ped-actions"
                  style={{ gridColumn: "1 / span 2", justifyContent: "flex-end" }}
                >
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => setF({})}
                  >
                    Limpiar
                  </button>
                  <button className="btn btn-primary" type="submit">
                    Abrir
                  </button>
                </div>
              </form>
            </>
          )}

          <h3 style={{ margin: "8px 0" }}>Órdenes recientes</h3>
          <div className="ped-list">
            {(items ?? []).map((o) => {
              const activo = sel?.id_orden === o.id_orden;
              return (
                <div
                  key={o.id_orden}
                  className={`ped-item ${activo ? "active" : ""}`}
                  onClick={() => setSel(o)}
                >
                  <div>
                    <div className="ped-row" style={{ gap: 6 }}>
                      <b>Orden #{o.id_orden}</b>
                      <span className="ped-kv">
                        {new Date(o.fecha_hora).toLocaleString()}
                      </span>
                    </div>
                    <div className="ped-kv">
                      Estado:{" "}
                      {estados.find((e) => e.id_estado === o.id_estado)?.nombre ??
                        o.id_estado}
                    </div>
                  </div>
                  <div className="ped-total">Q{money(o.total)}</div>
                </div>
              );
            })}
            {loading && <div className="subtle">Cargando…</div>}
            {!loading && (items ?? []).length === 0 && (
              <div className="subtle">No hay órdenes</div>
            )}
          </div>
        </div>

        {/* Columna derecha: editor */}
        <div className="ped-card">
          {sel ? (
            <OrderEditor
              orden={{
                ...sel,
                // Aseguramos número por si el backend envía string
                subtotal: num(sel.subtotal),
                descuento: num(sel.descuento),
                total: num(sel.total),
              }}
              onRefresh={() => reloadOrden(sel.id_orden)}
              estados={estados}
              onAplicarDesc={onAplicarDesc}
              onCambiarEstado={onCambiarEstado} // jose (usa cambiarEstadoOrden por dentro)
            />
          ) : (
            <div className="subtle">Selecciona una orden para editar</div>
          )}
        </div>
      </div>
    </div>
  );
}

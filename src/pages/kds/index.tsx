// jose
import { useEffect, useMemo, useState } from "react";
import {
  kdsList,
  kdsMarkReady,
  kdsGetOrden,
  // ⬇︎ usamos la vista con nombre_producto
  kdsGetDetallesVW,
} from "../../services/kds";
import "../../theme/kds/kds.css";

/* ===== Tipos ===== */
type KdsOrden = {
  id_orden: number;
  fecha_hora: string;
  id_estado: { id_estado: number; nombre: string };
  id_tipo_servicio: { id_tipo_servicio: number; nombre: string };
  id_mesa?: number | null;
  id_mesero?: number | null;
  observaciones?: string | null;
  subtotal?: number;
  total?: number;
  descuento?: number;
};

/** Detalle proveniente de la vista pos.vw_OrdenDetalleProducto */
type KdsDetalle = {
  id_detalle: number;
  id_producto: number | null;
  nombre_producto: string | null;
  cantidad: number;
  precio_unitario: number | string | null;
  nota?: string | null;
};

/* ===== Utils ===== */
const fmtQ = (v: number | string | null | undefined) => {
  const n = Number(v ?? 0);
  if (Number.isNaN(n)) return "Q0.00";
  return `Q${n.toFixed(2)}`;
};

/* ===== Page ===== */
export default function KdsPage() {
  const [items, setItems] = useState<KdsOrden[]>([]);
  const [loading, setLoading] = useState(false);

  // cache de detalles por orden
  const [details, setDetails] = useState<Record<number, KdsDetalle[]>>({});
  const [loadingDetails, setLoadingDetails] =
    useState<Record<number, boolean>>({});

  const load = async () => {
    setLoading(true);
    try {
      const data = (await kdsList()) as KdsOrden[];
      setItems(data);

      const ids: number[] = data.map((o: KdsOrden) => o.id_orden);
      if (ids.length === 0) {
        setDetails({});
        setLoading(false);
        return;
      }

      // marcar como "cargando" por orden
      const nextLoading: Record<number, boolean> = {};
      ids.forEach((id: number) => (nextLoading[id] = true));
      setLoadingDetails((s) => ({ ...s, ...nextLoading }));

      // cargar detalles en paralelo (desde la VISTA)
      const pairs = await Promise.all(
        ids.map(async (id: number) => {
          try {
            // opcional: refrescar cabecera
            await kdsGetOrden(id);
            const dets = (await kdsGetDetallesVW(id)) as KdsDetalle[];
            return [id, dets] as const;
          } catch {
            return [id, [] as KdsDetalle[]] as const;
          }
        })
      );

      const next: Record<number, KdsDetalle[]> = {};
      pairs.forEach(([id, dets]) => (next[id] = dets));
      setDetails((s) => ({ ...s, ...next }));

      const done: Record<number, boolean> = {};
      ids.forEach((id: number) => (done[id] = false));
      setLoadingDetails((s) => ({ ...s, ...done }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const markReady = async (id: number) => {
    setItems((prev) => prev.filter((o) => o.id_orden !== id));
    try {
      await kdsMarkReady(id);
      await load();
    } catch {
      await load();
    }
  };

  const itemsSorted = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          new Date(b.fecha_hora ?? 0).getTime() -
          new Date(a.fecha_hora ?? 0).getTime()
      ),
    [items]
  );

  return (
    <div className="p-4">
      <h1 className="h1">KDS - Cocina</h1>

      {loading && <div className="subtle">Cargando…</div>}
      {!loading && itemsSorted.length === 0 && (
        <div className="subtle">Sin órdenes en cocina</div>
      )}

      <div className="kds-stack">
        {itemsSorted.map((o) => {
          const dets: KdsDetalle[] = details[o.id_orden] ?? [];
          const detsLoading = !!loadingDetails[o.id_orden];

          const total = o.total ?? 0;
          const subtotal = o.subtotal ?? 0;
          const descuento = o.descuento ?? 0;

          return (
            <section className="kds-card ped-card" key={o.id_orden}>
              {/* Header igual al de Órdenes */}
              <div className="kds-header">
                <div className="kds-title">
                  <div className="kds-order">
                    Orden #{o.id_orden}{" "}
                    <span className="subtle">({o.id_estado?.nombre})</span>
                  </div>
                </div>

                <div className="kds-total">
                  <div className="kds-total-main">Total: {fmtQ(total)}</div>
                  <div className="kds-total-sub">
                    (Sub: {fmtQ(subtotal)} / Desc: {fmtQ(descuento)})
                  </div>
                </div>

                <div className="kds-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => markReady(o.id_orden)}
                  >
                    Marcar lista
                  </button>
                </div>
              </div>

              {/* Info (sin edición) */}
              <div className="kds-meta">
                <span>
                  <b>Servicio:</b> {o.id_tipo_servicio?.nombre ?? "—"}
                </span>
                <span>
                  <b>Mesa:</b> {o.id_mesa ? o.id_mesa : "Mostrador"}
                </span>
                {o.observaciones && (
                  <span className="subtle">
                    <b>Nota:</b> {o.observaciones}
                  </span>
                )}
              </div>

              {/* Detalles (misma tabla que Pedidos) */}
              <div className="kds-details">
                <h3 className="kds-details-title">Detalles</h3>

                {detsLoading && (
                  <div className="subtle">Cargando detalles…</div>
                )}

                {!detsLoading && dets.length === 0 && (
                  <div className="subtle">No hay detalles</div>
                )}

                {!detsLoading && dets.length > 0 && (
                  <table className="ped-details">
                    <thead>
                      <tr>
                        <th>Detalle</th>
                        <th>Producto</th>
                        <th>Cant.</th>
                        <th>P. Unit (Q)</th>
                        <th>Nota</th>
                        <th className="text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dets.map((d) => {
                        const nombre =
                          d.nombre_producto ?? `#${d.id_producto ?? ""}`;
                        return (
                          <tr key={d.id_detalle}>
                            <td>#{d.id_detalle}</td>
                            <td>{nombre}</td>
                            <td>{d.cantidad}</td>
                            <td>{fmtQ(d.precio_unitario)}</td>
                            <td>{d.nota ?? "—"}</td>
                            <td className="ped-actions-cell">—</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

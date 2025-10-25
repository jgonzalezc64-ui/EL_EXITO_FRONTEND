// frontend/src/pages/pagos/PagosListPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { isAxiosError } from "axios";

import { listOrdenes, getOrden, getOrdenDetallesVW } from "../../services/pedidos/ordenes";
import type { Orden } from "../../types/pedidos";

type OrdenWithRefs = Orden & {
  estado?: { id_estado?: number; nombre?: string };
  tipo_servicio?: { id_tipo_servicio?: number; nombre?: string };
  fecha_hora?: string | Date;
};

type OrdenDetalleVW = {
  id_detalle: number;
  id_orden: number;
  id_producto: number;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number | string;
  nota?: string | null;
};

const fmtQ = (n: number | undefined) => `Q${Number(n ?? 0).toFixed(2)}`;

export default function PagosListPage() {
  const [rows, setRows] = useState<OrdenWithRefs[]>([]);
  const [detallesByOrden, setDetallesByOrden] = useState<Record<number, OrdenDetalleVW[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingDetalles, setLoadingDetalles] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = (await listOrdenes()) as OrdenWithRefs[];
        setRows(data);
      } catch (err: unknown) {
        const msg = isAxiosError(err)
          ? (err.response?.data as { detail?: string } | undefined)?.detail ?? "No se pudo cargar órdenes."
          : "No se pudo cargar órdenes.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const entregadas = useMemo(
    () =>
      rows
        .filter((o) => o.estado?.nombre === "ENTREGADA")
        .sort((a, b) => (b.id_orden ?? 0) - (a.id_orden ?? 0)),
    [rows]
  );

  useEffect(() => {
    if (!entregadas.length) return;
    (async () => {
      setLoadingDetalles(true);
      try {
        const acc: Record<number, OrdenDetalleVW[]> = {};
        for (const o of entregadas) {
          if (o.id_orden != null) {
            await getOrden(o.id_orden);
            acc[o.id_orden] = await getOrdenDetallesVW(o.id_orden);
          }
        }
        setDetallesByOrden(acc);
      } finally {
        setLoadingDetalles(false);
      }
    })();
  }, [entregadas]);

  if (loading) return <div className="container mx-auto p-4">Cargando…</div>;
  if (error) return <div className="container mx-auto p-4 text-red-600">{error}</div>;

  return (
    <div className="container mx-auto p-4">
      <div className="ui-title">Pagos</div>
      <div className="ui-subtle mb-4">
        Tarjetas por <b>orden ENTREGADA</b>. Revisa detalles y <b>cobra</b> desde aquí.
      </div>

      {entregadas.length === 0 ? (
        <div className="ui-card">No hay órdenes ENTREGADA pendientes de cobro.</div>
      ) : (
        <div className="flex flex-col gap-4">
          {entregadas.map((o) => {
            const dets = o.id_orden != null ? (detallesByOrden[o.id_orden] ?? []) : [];
            return (
              <article key={o.id_orden} className="ui-card">
                {/* Header con botón a la derecha */}
                <header
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 8,
                  }}
                >
                  <div>
                    <div className="text-lg font-semibold">
                      Orden #{o.id_orden}{" "}
                      <span className="text-sm text-gray-500">({o.estado?.nombre ?? "—"})</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div className="text-base" style={{ fontWeight: 600 }}>
                        Total: {fmtQ(o.total)}
                      </div>
                      <div className="text-sm text-gray-500">
                        (Sub: {fmtQ(o.subtotal)} / Desc: {fmtQ(o.descuento)})
                      </div>
                    </div>
                  </div>

                  <Link
                    className="btn btn-primary"
                    to={`/pagos/${o.id_orden}`}
                    aria-label={`Cobrar orden #${o.id_orden}`}
                    style={{ alignSelf: "flex-start" }}
                  >
                    Cobrar
                  </Link>
                </header>

                {/* Metadatos */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3 text-sm">
                  <div><span className="text-gray-500">Servicio: </span>{o.tipo_servicio?.nombre ?? "—"}</div>
                  <div><span className="text-gray-500">Mesa: </span>{o.id_mesa ?? "Mostrador"}</div>
                  <div>
                    <span className="text-gray-500">Fecha/Hora: </span>
                    {o.fecha_hora ? new Date(o.fecha_hora as string).toLocaleString() : "—"}
                  </div>
                </div>

                {/* Detalles */}
                <div className="font-medium mb-2">Detalles</div>
                {loadingDetalles && !dets.length ? (
                  <div className="text-sm text-gray-500">Cargando detalles…</div>
                ) : dets.length === 0 ? (
                  <div className="text-sm text-gray-500">Esta orden no tiene detalles.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="ui-table">
                      <thead>
                        <tr>
                          <th>Detalle</th>
                          <th>Producto</th>
                          <th>Cant.</th>
                          <th>P. Unit (Q)</th>
                          <th>Nota</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dets.map((d) => (
                          <tr key={d.id_detalle}>
                            <td>#{d.id_detalle}</td>
                            <td>{d.nombre_producto ?? `#${d.id_producto}`}</td>
                            <td>{d.cantidad}</td>
                            <td>{fmtQ(Number(d.precio_unitario as number))}</td>
                            <td>{d.nota ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

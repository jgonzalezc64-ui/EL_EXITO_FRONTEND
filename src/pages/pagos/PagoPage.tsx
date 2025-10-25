// frontend/src/pages/pagos/PagoPage.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { isAxiosError } from "axios";
import { getOrden, getOrdenDetallesVW, cerrarOrden } from "../../services/pedidos/ordenes";
import type { Orden, OrdenDetalleVW } from "../../types/pedidos";

type MetodoPago = "EFECTIVO" | "TARJETA";

const fmtQ = (n?: number) => `Q${Number(n ?? 0).toFixed(2)}`;

export default function PagoPage() {
  const { id_orden } = useParams<{ id_orden: string }>();
  const navigate = useNavigate();

  const [orden, setOrden] = useState<Orden | null>(null);
  const [detalles, setDetalles] = useState<OrdenDetalleVW[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const [metodo, setMetodo] = useState<MetodoPago | null>(null);
  const [referencia, setReferencia] = useState("");

  useEffect(() => {
    (async () => {
      if (!id_orden) return;
      setLoading(true);
      setError("");
      try {
        const o = (await getOrden(Number(id_orden))) as Orden;
        const dets = await getOrdenDetallesVW(Number(id_orden));
        setOrden(o);
        setDetalles(dets);
      } catch (err: unknown) {
        const msg = isAxiosError(err)
          ? (err.response?.data as { detail?: string } | undefined)?.detail ?? "No se pudo cargar la orden."
          : "No se pudo cargar la orden.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [id_orden]);

  const pagar = async () => {
    if (!id_orden || !metodo) return;
    // En esta app el cobro se hace MANUAL: aquí sólo registramos la acción
    // cambiando el estado a CERRADA y regresamos a /pagos
    try {
      await cerrarOrden(Number(id_orden)); // backend: /pedidos/ordenes/:id/cerrar/
      // si quisieras guardar "metodo" y "referencia" se puede agregar un endpoint luego
    } finally {
      navigate("/pagos", { replace: true });
    }
  };

  if (loading) return <div className="container mx-auto p-4">Cargando…</div>;

  return (
    <div className="container mx-auto p-4 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
      <div className="ui-card">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold">Orden #{id_orden}</h2>
          <Link to="/pagos" className="btn btn-secondary text-sm">← Regresar a Pagos</Link>
        </div>

        {error && <div className="ui-alert warn mb-2">{error}</div>}

        <div className="text-sm text-gray-600 mb-2">
          Sub: {fmtQ(orden?.subtotal)} · Desc: {fmtQ(orden?.descuento)}
        </div>

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
              {detalles.map((d) => (
                <tr key={d.id_detalle}>
                  <td>#{d.id_detalle}</td>
                  <td>{d.nombre_producto ?? `#${d.id_producto}`}</td>
                  <td>{d.cantidad}</td>
                  <td>{fmtQ(d.precio_unitario as number | undefined)}</td>
                  <td>{d.nota ?? "—"}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={3} className="text-right font-semibold">TOTAL</td>
                <td className="font-bold">{fmtQ(orden?.total)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Panel de pago */}
      <div className="ui-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-gray-600">Subtotal</div>
          <div>{fmtQ(orden?.subtotal)}</div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-gray-600">Descuento</div>
          <div>{fmtQ(orden?.descuento)}</div>
        </div>
        <div className="flex items-center justify-between text-lg font-bold">
          <div>Total</div>
          <div>{fmtQ(orden?.total)}</div>
        </div>

        <hr />

        <div>
          <div className="font-semibold mb-2">Método de pago</div>

          {/* Radios: Efectivo / Tarjeta */}
          <div className="flex gap-3">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="metodo"
                value="EFECTIVO"
                checked={metodo === "EFECTIVO"}
                onChange={() => setMetodo("EFECTIVO")}
              />
              <span>Efectivo</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="metodo"
                value="TARJETA"
                checked={metodo === "TARJETA"}
                onChange={() => setMetodo("TARJETA")}
              />
              <span>Tarjeta</span>
            </label>
          </div>

          <div className="text-xs text-gray-500 mt-1">
            * El cobro se realiza manualmente en caja; aquí sólo registramos el cierre de la orden.
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Referencia (opcional)</label>
          <input
            className="input"
            placeholder="Últimos 4 / voucher / etc."
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Link to="/pagos" className="btn btn-secondary">Cancelar</Link>
          <button
            className="btn btn-primary"
            onClick={pagar}
            disabled={!metodo}
            title={!metodo ? "Selecciona un método de pago" : "Pagar y cerrar"}
          >
            Pagar {fmtQ(orden?.total)}
          </button>
        </div>
      </div>
    </div>
  );
}

// frontend/src/pages/pedidos/components/OrderEditor.tsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../app/useAuth";
import type { Orden, EstadoOrden, OrdenDetalle } from "../../../types/pedidos";
import {
  agregarDetalle,
  editarDetalle,
  eliminarDetalle,
  // cerrarOrden, // jose: ya no se usa al cerrar por “siguiente paso”
} from "../../../services/pedidos/ordenes"; // jose
import { listProductos } from "../../../services/catalogos/productos";
import type { Producto } from "../../../types/catalogos/productos";

// Extras (modificadores)
import { listModificadores } from "../../../services/catalogos/modificadores";
type Modificador = {
  id_modificador: number;
  nombre: string;
  precio_extra?: number;
};

// Detalles
import { listDetalles } from "../../../services/pedidos/detalles";

/* ----------------- tipos locales para evitar any/mismatches ----------------- */
type ExtraSel = {
  id_modificador: number;
  cantidad: number; // requerido para simplificar setState
  precio_extra?: number;
  nombre?: string;
};

// jose: helper para buscar ID de estado por nombre (case-insensitive)
function findEstadoIdByName(estados: EstadoOrden[], name: string): number | undefined { // jose
  const up = name.toUpperCase(); // jose
  return estados.find((e) => e.nombre.toUpperCase() === up)?.id_estado; // jose
} // jose

// jose: define el flujo (siguiente acción y siguiente estado)
function getNextAction(estadoNombre: string): { label: string; nextName?: string; needsPayment?: boolean } { // jose
  const s = estadoNombre.toUpperCase(); // jose
  if (s === "ABIERTA") return { label: "Enviar a cocina", nextName: "EN_COCINA" }; // jose
  if (s === "EN_COCINA") return { label: "Marcar lista", nextName: "LISTA" }; // jose
  if (s === "LISTA") return { label: "Marcar entregada", nextName: "ENTREGADA" }; // jose
  if (s === "ENTREGADA") return { label: "Cobrar", nextName: "COBRADA", needsPayment: true }; // jose
  return { label: "Sin acción" }; // jose
}

export default function OrderEditor({
  orden,
  estados,
  onRefresh,
  onAplicarDesc,
  onCambiarEstado,
}: {
  orden: Orden;
  estados: EstadoOrden[];
  onRefresh: () => void;
  onAplicarDesc: (idOrden: number, descuento: number) => Promise<void>;
  onCambiarEstado: (idOrden: number, id_estado: number) => Promise<void>;
}) {
  const { hasRole } = useAuth();
  const canEdit = hasRole("ADMIN") || hasRole("MESERO");

  /* ----------------------------- Catálogos ----------------------------- */
  const [prods, setProds] = useState<Producto[]>([]);
  const [extras, setExtras] = useState<Modificador[]>([]);

  /* -------------------------- Form: producto -------------------------- */
  const [fd, setFd] = useState<{
    id_producto?: number;
    cantidad: number;
    precio_unitario?: number;
    nota?: string;
  }>({ cantidad: 1 });

  /* ---------------------------- Form: extra ---------------------------- */
  const [fExtra, setFExtra] = useState<{
    id_modificador?: number;
    cantidad: number;
    precio_extra?: number;
  }>({ cantidad: 1 });

  const [extrasSel, setExtrasSel] = useState<ExtraSel[]>([]);

  /* -------------------- Descuento / Estado seleccionado -------------------- */
  const [desc, setDesc] = useState<number>(orden.descuento ?? 0);
  const [estSel, setEstSel] = useState<number>(orden.id_estado);

   const [tablaDetalle, setTablaDetalle] = useState<OrdenDetalle[]>([]);


  /* ---------------- Reglas para habilitar acciones (orden) ---------------- */
  const estadoActual = useMemo(
    () => estados.find((e) => e.id_estado === orden.id_estado)?.nombre?.toUpperCase() ?? "",
    [estados, orden.id_estado]
  );

  // jose: “cerradas” según la línea propuesta (ya no se edita)
  const CLOSED_STATE_NAMES = ["COBRADA", "ANULADA", "ENTREGADA"]; // jose
  const isAbierta = estadoActual === "ABIERTA";
  const isCerrada = CLOSED_STATE_NAMES.includes(estadoActual); // jose
  const canModify = canEdit && isAbierta;
  const canClose = canEdit && !isCerrada && orden.total >= 0;

  /* -------------------------- Carga de catálogos -------------------------- */
  useEffect(() => {
    (async () => {
      const ps = await listProductos();
      setProds(ps);
      try {
        const ms = await listModificadores();
        setExtras(ms);
      } catch {
        setExtras([]);
      }
    })();
  }, []);

  useEffect(() => {
    setDesc(orden.descuento ?? 0);
    setEstSel(orden.id_estado);
    cargarDetalle(orden.id_orden)
  }, [orden.id_orden, orden.descuento, orden.id_estado]);

  /* ------------------------------ Mapas ------------------------------ */
  const prodMap = useMemo(() => {
    const m = new Map<number, Producto>();
    prods.forEach((p) => m.set(p.id_producto, p));
    return m;
  }, [prods]);

  const extraMap = useMemo(() => {
    const m = new Map<number, Modificador>();
    extras.forEach((x) => m.set(x.id_modificador, x));
    return m;
  }, [extras]);

  const cargarDetalle = async (idOrden:number) => {
    try {
        const ds = await listDetalles(idOrden);
        setTablaDetalle(ds);
      } finally {
        console.log();
        
      }
  }
  

  /* --------------- Autofill de precios al seleccionar item --------------- */
  function onSelectProducto(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value ? Number(e.target.value) : undefined;
    if (!val) {
      setFd((s) => ({ ...s, id_producto: undefined, precio_unitario: undefined }));
      return;
    }
    const p = prodMap.get(val);
    setFd((s) => ({
      ...s,
      id_producto: val,
      precio_unitario: p?.precio_base ?? undefined,
    }));
  }

  function onSelectExtra(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value ? Number(e.target.value) : undefined;
    if (!val) {
      setFExtra((s) => ({ ...s, id_modificador: undefined, precio_extra: undefined }));
      return;
    }
    const x = extraMap.get(val);
    setFExtra((s) => ({
      ...s,
      id_modificador: val,
      precio_extra: x?.precio_extra ?? undefined,
    }));
  }

  // Fallbacks si cambia el catálogo después de elegir
  useEffect(() => {
    if (fd.id_producto && fd.precio_unitario == null) {
      const p = prodMap.get(fd.id_producto);
      if (p?.precio_base != null) setFd((s) => ({ ...s, precio_unitario: p.precio_base }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fd.id_producto, prodMap]);

  useEffect(() => {
    if (fExtra.id_modificador && fExtra.precio_extra == null) {
      const x = extraMap.get(fExtra.id_modificador);
      if (x?.precio_extra != null) setFExtra((s) => ({ ...s, precio_extra: x.precio_extra }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fExtra.id_modificador, extraMap]);

  /* ----------------------- Manejo de lista de extras ----------------------- */
  function pushExtraActual() {
    if (!fExtra.id_modificador) {
      alert("Selecciona un extra");
      return;
    }
    const x = extraMap.get(fExtra.id_modificador);
    setExtrasSel((prev): ExtraSel[] => [
      ...prev,
      {
        id_modificador: fExtra.id_modificador!,
        cantidad: fExtra.cantidad ?? 1,
        precio_extra: fExtra.precio_extra,
        nombre: x?.nombre,
      },
    ]);
    setFExtra({ cantidad: 1 });
  }

  function removeExtra(idx: number) {
    setExtrasSel((prev) => prev.filter((_, i) => i !== idx));
  }

  /* ------------------------------ Acciones ------------------------------ */

  // jose: botón único que avanza al “siguiente estado” del flujo
  async function onCerrar() { // jose
    if (!canClose) return; // jose
    const { label, nextName, needsPayment } = getNextAction(estadoActual); // jose
    if (!nextName) return; // jose
    if (!confirm(`¿${label} la orden #${orden.id_orden}?`)) return; // jose

    if (needsPayment) {
      // Redirigir a la página de pagos
      window.location.href = `/pagos/${orden.id_orden}`;
      return;
    }

    const nextId = findEstadoIdByName(estados, nextName); // jose
    if (!nextId) { // jose
      alert(`No se encontró el estado "${nextName}" en el catálogo.`); // jose
      return; // jose
    } // jose

    await onCambiarEstado(orden.id_orden, nextId); // jose
    await onRefresh(); // jose
  } // jose

  async function onAddDetalle(e: React.FormEvent) {
    e.preventDefault();
    if (!canModify) return;

    if (!fd.id_producto) {
      alert("Selecciona producto");
      return;
    }

    const prod = prodMap.get(fd.id_producto);
    const punit = fd.precio_unitario ?? prod?.precio_base ?? 0;

    const extrasTxt =
      extrasSel.length > 0
        ? `\nExtras:\n  - ${extrasSel
            .map((x) => `${x.nombre ?? x.id_modificador} x ${x.cantidad} (Q${(x.precio_extra ?? 0).toFixed(2)})`)
            .join("\n  - ")}`
        : "";

    if (!confirm(`¿Agregar "${prod?.nombre}" x ${fd.cantidad} a la orden?${extrasTxt}`)) return;

    await agregarDetalle(orden.id_orden, {
      id_producto: fd.id_producto,
      cantidad: fd.cantidad,
      precio_unitario: punit,
      nota: fd.nota || undefined,
      // enviamos extras junto al detalle
      modificadores:
        extrasSel.length > 0
          ? extrasSel.map((x) => ({
              id_modificador: x.id_modificador,
              cantidad: x.cantidad,
              precio_extra: x.precio_extra,
            }))
          : undefined,
    });

    setFd({ cantidad: 1 });
    setExtrasSel([]);
     cargarDetalle(orden.id_orden)
    await onRefresh();
  }




  async function onEditDetalleHandler(d: OrdenDetalle, patch: Partial<OrdenDetalle>) {
    if (!canModify) return;
    const nuevoCant = patch.cantidad ?? d.cantidad;
    const nuevoPrecio = patch.precio_unitario ?? d.precio_unitario;
    if (
      !confirm(
        `¿Guardar cambios de detalle #${d.id_detalle}?\nCant: ${d.cantidad} → ${nuevoCant}\nP.Unit: Q${d.precio_unitario} → Q${nuevoPrecio}`
      )
    )
      return;

    await editarDetalle(orden.id_orden, {
      id_detalle: d.id_detalle,
      cantidad: patch.cantidad,
      precio_unitario: patch.precio_unitario,
      nota: patch.nota,
    });
    await onRefresh();
  }

  async function onDeleteDetalleHandler(d: OrdenDetalle) {
    if (!canModify) return;
    if (!confirm(`¿Eliminar detalle #${d.id_detalle}?`)) return;
    await eliminarDetalle(orden.id_orden, d.id_detalle);
    await onRefresh();
  }



  /* --------------------------------- UI --------------------------------- */
  const next = getNextAction(estadoActual); // jose

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h3 style={{ margin: 0 }}>Orden #{orden.id_orden}</h3>
          <span className="ped-kv">({estadoActual || orden.id_estado})</span>
        </div>

        <div className="ped-row" style={{ gap: 12 }}>
          <div>
            <b>Total:</b> Q{orden.total.toFixed(2)}{" "}
            <span className="ped-kv">
              (Sub: Q{orden.subtotal.toFixed(2)} / Desc: Q{orden.descuento.toFixed(2)})
            </span>
          </div>

          {/* jose: botón contextual “siguiente paso” */}
          {canClose && next.nextName && ( // jose
            <button className="btn btn-primary" onClick={onCerrar} title={next.label}>
              {next.label} {/* jose */}
            </button>
          )} {/* jose */}
        </div>
      </div>

      {/* Estado + Descuento */}
      <div className="ped-row" style={{ gap: 12, flexWrap: "wrap" }}>
        <div>
          <label style={{ fontSize: 12, marginBottom: 6, display: "block" }}>Estado</label>
          <select
            className="ped-select"
            value={estSel}
            onChange={(e) => setEstSel(Number(e.target.value))}
            disabled={!canEdit}
          >
            {estados.map((e) => (
              <option key={e.id_estado} value={e.id_estado}>
                {e.nombre}
              </option>
            ))}
          </select>
        </div>
        {canEdit && (
          <button
            className="btn btn-primary"
            onClick={() => onCambiarEstado(orden.id_orden, estSel)}
            disabled={isCerrada}
            title={isCerrada ? "La orden está cerrada" : "Aplicar cambio de estado"}
          >
            Cambiar estado
          </button>
        )}

        <div>
          <label style={{ fontSize: 12, marginBottom: 6, display: "block" }}>Descuento (Q)</label>
          <input
            className="ped-num"
            type="number"
            step="0.01"
            value={desc}
            onChange={(e) => setDesc(Number(e.target.value))}
            disabled={!canModify}
          />
        </div>
        {canModify && (
          <button className="btn btn-primary" onClick={() => onAplicarDesc(orden.id_orden, desc)}>
            Aplicar descuento
          </button>
        )}
      </div>

      {/* Agregar producto */}
      {canModify && (
        <div className="ped-card">
          <h4 style={{ marginTop: 0 }}>Agregar producto</h4>
          <form onSubmit={onAddDetalle} style={{ display: "grid", gap: 8, gridTemplateColumns: "2fr 1fr 1fr 1fr" }}>
            <select className="ped-select" value={fd.id_producto ?? ""} onChange={onSelectProducto}>
              <option value="">Selecciona producto</option>
              {prods.map((p) => (
                <option key={p.id_producto} value={p.id_producto}>
                  {p.nombre}
                </option>
              ))}
            </select>

            <input
              className="ped-num"
              type="number"
              min={0.01}
              step="0.01"
              placeholder="P. Unit"
              value={fd.precio_unitario ?? ""}
              onChange={(e) =>
                setFd((s) => ({
                  ...s,
                  precio_unitario: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />

            <input
              className="ped-num"
              type="number"
              min={1}
              step={1}
              placeholder="Cant"
              value={fd.cantidad}
              onChange={(e) => setFd((s) => ({ ...s, cantidad: Number(e.target.value) }))}
            />

            <button className="btn btn-primary" type="submit">
              Agregar
            </button>

            <div style={{ gridColumn: "1 / span 4" }}>
              <input
                className="ped-input"
                placeholder="Nota (opcional)"
                value={fd.nota ?? ""}
                onChange={(e) => setFd((s) => ({ ...s, nota: e.target.value }))}
              />
            </div>
          </form>

          {/* Agregar extras vinculados al producto */}
          <div style={{ marginTop: 16 }}>
            <h5 style={{ margin: "8px 0" }}>Agregar extras</h5>
            <div className="ped-row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select
                className="ped-select"
                value={fExtra.id_modificador ?? ""}
                onChange={onSelectExtra}
                style={{ minWidth: 240 }}
              >
                <option value="">Selecciona extra</option>
                {extras.map((x) => (
                  <option key={x.id_modificador} value={x.id_modificador}>
                    {x.nombre}
                  </option>
                ))}
              </select>

              <input
                className="ped-num"
                type="number"
                min={0.01}
                step="0.01"
                placeholder="P. Extra"
                value={fExtra.precio_extra ?? ""}
                onChange={(e) =>
                  setFExtra((s) => ({
                    ...s,
                    precio_extra: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              />

              <input
                className="ped-num"
                type="number"
                min={1}
                step={1}
                placeholder="Cant"
                value={fExtra.cantidad}
                onChange={(e) => setFExtra((s) => ({ ...s, cantidad: Number(e.target.value) }))}
              />

              <button type="button" className="btn btn-ghost" onClick={pushExtraActual}>
                Añadir a la lista
              </button>
            </div>

            {extrasSel.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {extrasSel.map((x, i) => (
                  <span
                    key={`${x.id_modificador}-${i}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "var(--chip-bg, #f2f2f2)",
                      border: "1px solid var(--border)",
                      borderRadius: 20,
                      padding: "4px 10px",
                      fontSize: 13,
                    }}
                  >
                    {x.nombre ?? `#${x.id_modificador}`} · {x.cantidad} · Q{(x.precio_extra ?? 0).toFixed(2)}
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => removeExtra(i)}
                      title="Quitar"
                      style={{ padding: "0 6px" }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="ped-kv" style={{ marginTop: 6 }}>
              * Estos extras se enviarán junto con el producto al presionar <b>Agregar</b>.
            </div>
          </div>
        </div>
      )}

      {/* Detalles */}
      <OrderDetailsTable
        idOrden={orden.id_orden}
        canEdit={canModify}
        onEdit={onEditDetalleHandler}
        onDelete={onDeleteDetalleHandler}
        produtosDetalle={tablaDetalle}
        prodName={(idProd: number) => prodMap.get(idProd)?.nombre ?? `#${idProd}`}
      />
    </div>
  );
}

/* --------------------- Tabla de Detalles (sin any) --------------------- */
type EditableKey = "cantidad" | "precio_unitario" | "nota";
type Patch = Partial<Pick<OrdenDetalle, EditableKey>>;

function OrderDetailsTable({
  idOrden,
  canEdit,
  onEdit,
  onDelete,
  produtosDetalle,
  prodName,
}: {
  idOrden: number;
  canEdit: boolean;
  onEdit: (d: OrdenDetalle, patch: Partial<OrdenDetalle>) => Promise<void>;
  onDelete: (d: OrdenDetalle) => Promise<void>;
  produtosDetalle:   OrdenDetalle[];
  prodName: (idProd: number) => string;
}) {
  //const [rows, setRows] = useState<OrdenDetalle[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Record<number, Patch>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
       // const ds = await listDetalles(idOrden);
        //setRows(ds);
        setEdit({});
      } finally {
        setLoading(false);
      }
    })();
  }, [idOrden]);

  function setField<K extends EditableKey>(d: OrdenDetalle, k: K, v: OrdenDetalle[K]) {
    setEdit((prev) => {
      const prevRow: Patch = prev[d.id_detalle] ?? {};
      const nextRow: Patch = { ...prevRow, [k]: v };
      return { ...prev, [d.id_detalle]: nextRow };
    });
  }

  async function save(d: OrdenDetalle) {
    const patch: Patch = edit[d.id_detalle] ?? {};
    if (Object.keys(patch).length === 0) return;
    await onEdit(d, patch);
    //const ds = await listDetalles(idOrden);
   // setRows(ds);
    setEdit((prev) => {
      const n = { ...prev };
      delete n[d.id_detalle];
      return n;
    });
  }

  return (
    <div>
      <h4 style={{ margin: "6px 0" }}>Detalles</h4>
      {/* scroll horizontal + vertical */}
      <div style={{ overflowX: "auto", maxHeight: 380, overflowY: "auto" }}>
        <table className="cat-table" style={{ minWidth: 780 }}>
          <thead>
            <tr>
              <th style={{ width: 70 }}>Detalle</th>
              <th>Producto</th>
              <th style={{ width: 120 }}>Cant.</th>
              <th style={{ width: 140 }}>P. Unit (Q)</th>
              <th>Nota</th>
              <th style={{ width: 200 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {produtosDetalle.map((d) => {
              const e = edit[d.id_detalle] ?? {};
              return (
                <tr key={d.id_detalle}>
                  <td>#{d.id_detalle}</td>
                  <td>{prodName(d.id_producto)}</td>
                  <td>
                    {canEdit ? (
                      <input
                        className="ped-num"
                        type="number"
                        min={1}
                        step={1}
                        value={(e.cantidad ?? d.cantidad).toString()}
                        onChange={(ev) => setField(d, "cantidad", Number(ev.target.value))}
                      />
                    ) : (
                      d.cantidad
                    )}
                  </td>
                  <td>
                    {canEdit ? (
                      <input
                        className="ped-num"
                        type="number"
                        min={0.01}
                        step="0.01"
                        value={(e.precio_unitario ?? d.precio_unitario).toString()}
                        onChange={(ev) => setField(d, "precio_unitario", Number(ev.target.value))}
                      />
                    ) : (
                      `Q${d.precio_unitario.toFixed(2)}`
                    )}
                  </td>
                  <td>
                    {canEdit ? (
                      <input
                        className="ped-input"
                        value={e.nota ?? (d.nota ?? "")}
                        onChange={(ev) => setField(d, "nota", ev.target.value)}
                        placeholder="(opcional)"
                      />
                    ) : (
                      d.nota ?? <span className="subtle">—</span>
                    )}
                  </td>
                  <td className="cat-actions">
                    {canEdit && (
                      <>
                        <button className="btn btn-primary" onClick={() => save(d)}>
                          Guardar
                        </button>
                        <button
                          className="btn btn-ghost"
                          onClick={async () => {
                            if (!confirm(`¿Eliminar detalle #${d.id_detalle}?`)) return;
                            await onDelete(d);
                           // const ds = await listDetalles(idOrden);
                            //setRows(ds);
                          }}
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {loading && (
              <tr>
                <td colSpan={6}>
                  <div className="subtle">Cargando…</div>
                </td>
              </tr>
            )}
            {!loading && produtosDetalle.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="subtle">No hay detalles</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// frontend/src/services/pedidos/ordenes.ts
import api from "../../api/http";
import type {
  Orden,
  AbrirOrdenPayload,
  AgregarDetallePayload,
  EditarDetallePayload,
  OrdenDetalleVW,
} from "../../types/pedidos";
import type { Paginated } from "../shared/pagination";

/* Utils */
function unpage<T>(data: T[] | Paginated<T>): T[] {
  return (data as Paginated<T>).results ?? (data as T[]);
}

/* ----------------------------- Órdenes ----------------------------- */

export async function listOrdenes() {
  const { data } = await api.get<Orden[] | Paginated<Orden>>(
    "/pedidos/ordenes/"
  );
  return unpage(data);
}

export async function getOrden(id: number) {
  console.log(id)
  const { data } = await api.get<Orden>(`/pedidos/ordenes/${id}/`);
  return data;
}

export async function abrirOrden(payload: AbrirOrdenPayload) {
  const { data } = await api.post<Orden>("/pedidos/ordenes/abrir/", payload);
  return data;
}

/* -------------------------- Detalles orden ------------------------- */

export async function agregarDetalle(
  idOrden: number,
  payload: AgregarDetallePayload
) {
  const { data } = await api.post(
    `/pedidos/ordenes/${idOrden}/agregar-detalle/`,
    payload
  );
  return data; // detalle serializado
}

export async function editarDetalle(
  idOrden: number,
  payload: EditarDetallePayload
) {
  const { data } = await api.post(
    `/pedidos/ordenes/${idOrden}/editar-detalle/`,
    payload
  );
  return data;
}

export async function eliminarDetalle(idOrden: number, id_detalle: number) {
  await api.post(`/pedidos/ordenes/${idOrden}/eliminar-detalle/`, {
    id_detalle,
  });
}

/* --------------------------- Descuento/Estado --------------------------- */

export async function aplicarDescuento(idOrden: number, descuento: number) {
  const { data } = await api.post(
    `/pedidos/ordenes/${idOrden}/aplicar-descuento/`,
    { descuento }
  );
  return data as Orden;
}

// Cambio de estado (impl. principal)
export async function cambiarEstadoOrden(
  id_orden: number,
  payload: { id_estado: number }
) {
  const { data } = await api.post(
    `/pedidos/ordenes/${id_orden}/cambiar-estado/`,
    payload
  );
  return data as Orden;
}

// Alias compatible con tu firma anterior
export async function cambiarEstado(idOrden: number, id_estado: number) {
  return cambiarEstadoOrden(idOrden, { id_estado });
}

/* ----------------------- Vista detalles con nombre ----------------------- */

export async function getOrdenDetallesVW(id_orden: number) {
  const { data } = await api.get<OrdenDetalleVW[]>(
    `/pedidos/ordenes/${id_orden}/detalles-vw/`
  );
  return data;
}

/* ------------------------------ Cerrar orden ------------------------------ */
// ⬇️ Ruta corregida: incluye /pedidos
export async function cerrarOrden(id_orden: number) {
  const { data } = await api.post(
    `/pedidos/ordenes/${id_orden}/cerrar/`,
    {}
  );
  return data as Orden;
}

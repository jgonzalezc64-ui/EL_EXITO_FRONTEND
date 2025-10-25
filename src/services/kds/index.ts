// frontend/src/services/kds/index.ts

// jose
import api from "../../api/http";
import type { OrdenDetalleVW } from "../../types/pedidos";

// Lista sólo órdenes EN_COCINA
export async function kdsList() { // jose
  const { data } = await api.get("/kds/ordenes/");
  return data;
}

// Traer cabecera de una orden (totales/estado/servicio/mesa, etc.) // jose
export async function kdsGetOrden(idOrden: number) { // jose
  const { data } = await api.get(`/pedidos/ordenes/${idOrden}/`);
  return data;
}

// Traer detalles (items) de la orden // jose
export async function kdsGetDetalles(idOrden: number) { // jose
  const { data } = await api.get(`/pedidos/ordenes/${idOrden}/detalles/`);
  return data;
}

// Marcar una orden como LISTA
export async function kdsMarkReady(idOrden: number) { // jose
  const { data } = await api.post(`/kds/ordenes/${idOrden}/marcar-lista/`, {});
  return data;
}
export async function kdsGetDetallesVW(idOrden: number) {
  const { data } = await api.get<OrdenDetalleVW[]>(`/pedidos/ordenes/${idOrden}/detalles-vw/`);
  return data;
}

// frontend/src/services/pedidos/detalle-mods.ts
import api from "../../api/http";

// Ajusta estos paths a tu API real
const BASE = (idOrden: number, idDetalle: number) =>
  `/pedidos/ordenes/${idOrden}/detalles/${idDetalle}/mods/`;
// Alternativa si tu API los concentró como admin
// const BASE = (idOrden: number, idDetalle: number) =>
//   `/pedidos/admin/ordenes/${idOrden}/detalles/${idDetalle}/mods/`;

export async function agregarExtra(
  idOrden: number,
  idDetalle: number,
  payload: { id_modificador: number; cantidad: number; precio_extra: number }
) {
  const { data } = await api.post(BASE(idOrden, idDetalle), payload);
  return data;
}

export async function eliminarExtra(
  idOrden: number,
  idDetalle: number,
  id_modificador: number
) {
  await api.delete(`${BASE(idOrden, idDetalle)}${id_modificador}/`);
}

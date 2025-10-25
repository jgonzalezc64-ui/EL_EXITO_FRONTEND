// frontend/src/services/pedidos/detalles.ts
import { api } from "../../api/http";
import type { OrdenDetalle } from "../../types/pedidos";

export async function listDetalles(idOrden: number): Promise<OrdenDetalle[]> {
  const { data } = await api.get(`/pedidos/ordenes/${idOrden}/detalles/`);
  return data as OrdenDetalle[];
}

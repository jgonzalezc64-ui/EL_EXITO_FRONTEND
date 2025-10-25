import api from "../../api/http";
import type { Tienda, TiendaCreate, TiendaPatch } from "../../types/pedidos/tienda";

const BASE = "/pedidos/tiendas/"; // http://127.0.0.1:8000/api/v1/pedidos/tiendas/

function toArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && "results" in (data as { results?: unknown })) {
    const results = (data as { results?: unknown }).results;
    return Array.isArray(results) ? (results as T[]) : [];
  }
  return [];
}

export async function listTiendas(): Promise<Tienda[]> {
  const { data } = await api.get<unknown>(BASE);
  return toArray<Tienda>(data);
}

export async function createTienda(payload: TiendaCreate): Promise<Tienda> {
  const { data } = await api.post<Tienda>(BASE, payload);
  return data;
}

export async function updateTienda(id_tienda: number, patch: TiendaPatch): Promise<Tienda> {
  const { data } = await api.patch<Tienda>(`${BASE}${id_tienda}/`, patch);
  return data;
}

export async function toggleTiendaActiva(id_tienda: number, activa: boolean): Promise<Tienda> {
  const { data } = await api.patch<Tienda>(`${BASE}${id_tienda}/`, { activa });
  return data;
}

export async function deleteTienda(id_tienda: number): Promise<void> {
  await api.delete(`${BASE}${id_tienda}/`);
}

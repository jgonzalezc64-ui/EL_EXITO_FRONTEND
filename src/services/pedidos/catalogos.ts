// frontend/src/services/pedidos/catalogos.ts
import api from "../../api/http";
import type { Tienda, Mesa, EstadoOrden, TipoServicio } from "../../types/pedidos";

// jose: tipo genérico para respuestas paginadas de DRF
type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] }; // jose

/* ------------------------------------------------------------------
   Helpers
-------------------------------------------------------------------*/

// jose: type-guard SIN usar `any` (cumple @typescript-eslint/no-explicit-any)
function isPaginated<T>(data: unknown): data is Paginated<T> { // jose
  // jose: comprobamos objeto no-nulo y que tenga la llave "results"
  return (
    typeof data === "object" && // jose
    data !== null && // jose
    Object.prototype.hasOwnProperty.call(data, "results") // jose
  );
}

// jose: normaliza la respuesta (si viene paginada => results, si no => array plano)
function unpage<T>(data: T[] | Paginated<T>): T[] { // jose
  return isPaginated<T>(data) ? data.results : (data as T[]); // jose
}

// jose: util para limpiar params (no mandar undefined)
function cleanParams<T extends Record<string, unknown>>(p?: T): T | undefined { // jose
  if (!p) return undefined; // jose
  const entries = Object.entries(p).filter(([, v]) => v !== undefined && v !== null); // jose
  return Object.fromEntries(entries) as T; // jose
}

/* ------------------------------------------------------------------
   Endpoints catálogo de pedidos
-------------------------------------------------------------------*/

export async function listTienda(): Promise<Tienda[]> {
  // jose: soporta DRF con/ sin paginación
  const { data } = await api.get<Tienda[] | Paginated<Tienda>>("/pedidos/tiendas/"); // jose
  return unpage<Tienda>(data); // jose
}

export async function listMesas(params?: { id_tienda?: number }): Promise<Mesa[]> {
  // jose: limpiamos params para evitar `id_tienda: undefined`
  const { data } = await api.get<Mesa[] | Paginated<Mesa>>("/pedidos/mesas/", { params: cleanParams(params) }); // jose
  return unpage<Mesa>(data); // jose
}

export async function listEstadosOrden(): Promise<EstadoOrden[]> {
  const { data } = await api.get<EstadoOrden[] | Paginated<EstadoOrden>>("/pedidos/estados-orden/"); // jose
  return unpage<EstadoOrden>(data); // jose
}

export async function listTiposServicio(): Promise<TipoServicio[]> {
  const { data } = await api.get<TipoServicio[] | Paginated<TipoServicio>>("/pedidos/tipos-servicio/"); // jose
  return unpage<TipoServicio>(data); // jose
}

export async function listTiendas(): Promise<Tienda[]> { // jose
  const { data } = await api.get<Tienda[] | Paginated<Tienda>>("/pedidos/tiendas/"); // jose
  return unpage<Tienda>(data); // jose
}

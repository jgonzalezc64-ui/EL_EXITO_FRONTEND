// frontend/src/services/pedidos/mesas.ts
// jose: servicios sin carpeta "pedidos-admin"; con fallback a /pedidos/admin/mesas/

import api from "../../api/http";
import type { Mesa } from "../../types/pedidos";

/* ------------- helpers comunes (sin any) ------------- */               // jose
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function asArray<T>(d: unknown): T[] {
  if (Array.isArray(d)) return d as T[];
  if (isObject(d) && Array.isArray((d as { results?: unknown }).results)) {
    return (d as { results: unknown[] }).results as T[];
  }
  return [];
}

function httpStatus(err: unknown): number | undefined {
  if (!isObject(err)) return undefined;
  const r = (err as { response?: { status?: number } }).response;
  return r?.status;
}
/* ----------------------------------------------------- */

// rutas a probar si el backend expone admin/ para mutaciones
const GET_URLS = ["/pedidos/mesas/", "/pedidos/admin/mesas/"];           // jose
const MUTATION_URLS = ["/pedidos/mesas/", "/pedidos/admin/mesas/"];      // jose

async function tryMany<T>(
  fn: (base: string) => Promise<T>
): Promise<T> {
  let lastErr: unknown;
  for (const base of MUTATION_URLS) {
    try {
      return await fn(base);
    } catch (err) {
      const status = httpStatus(err);
      if (status === 404 || status === 405) {
        lastErr = err;
        continue; // probar siguiente base
      }
      throw err; // otro error → no insistir
    }
  }
  // si ninguna base aceptó el método, propagar último error
  throw lastErr;
}

/* ----------------------------- CRUD ----------------------------- */    // jose

export async function listMesas(params?: {
  search?: string;
  ordering?: string;
  id_tienda?: number;
}): Promise<Mesa[]> {
  // intentamos primero /pedidos/mesas/ y si falla 404/405 probamos admin
  for (const base of GET_URLS) {
    try {
      const { data } = await api.get(base, { params });
      return asArray<Mesa>(data);
    } catch (err) {
      const status = httpStatus(err);
      if (status === 404 || status === 405) {
        // probar la siguiente base
        continue;
      }
      throw err;
    }
  }
  return []; // si ambas 404/405, devolvemos vacío (no debería suceder)
}

export async function createMesa(payload: Partial<Mesa>): Promise<Mesa> {
  return tryMany(async (base) => {
    const { data } = await api.post(base, payload);
    return data as Mesa;
  });
}

export async function updateMesa(id_mesa: number, payload: Partial<Mesa>): Promise<Mesa> {
  return tryMany(async (base) => {
    const { data } = await api.patch(`${base}${id_mesa}/`, payload);
    return data as Mesa;
  });
}

export async function deleteMesa(id_mesa: number): Promise<void> {
  await tryMany(async (base) => {
    await api.delete(`${base}${id_mesa}/`);
    return undefined as unknown as void;
  });
}

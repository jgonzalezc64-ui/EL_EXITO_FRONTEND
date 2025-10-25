// frontend/src/services/catalogos/productos.ts
import api from "../../api/http";
import type {
  Producto,
  ProductoCreate,
  ProductoUpdate,
} from "../../types/catalogos/productos";

type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

/* ------------------------------------------------------------------
   Helpers
-------------------------------------------------------------------*/

// jose: type-guard SIN "any" y compatible con no-explicit-any
function isPaginated<T>(data: unknown): data is Paginated<T> {
  // jose: comprobamos objeto no-nulo y que tenga la clave "results"
  return (
    typeof data === "object" &&
    data !== null &&
    "results" in (data as Record<string, unknown>)
  );
}

// jose: caché simple en memoria para evitar llamadas repetidas
let _cacheAll: { at: number; data: Producto[] } | null = null; // jose
const CACHE_MS = 60 * 1000; // jose: 60s de vida

/* ------------------------------------------------------------------
   Listar productos (TODOS, despaginar)  — (primer código)
-------------------------------------------------------------------*/

/**
 * jose: Devuelve **todos** los productos, recorriendo todas las páginas del API.
 *       Usa caché de 60s para mejorar UX.
 */
export async function listProductos(): Promise<Producto[]> {
  // jose: servir desde caché si está fresco
  if (_cacheAll && Date.now() - _cacheAll.at < CACHE_MS) {
    return _cacheAll.data;
  }

  // jose: 1) pedir la primera página (o lista completa si no hay paginación)
  const { data: first } = await api.get<Paginated<Producto> | Producto[]>(
    "/catalogos/productos/"
  );

  // jose: si **no** está paginado, devolvemos tal cual (y guardamos en caché)
  if (!isPaginated<Producto>(first)) {
    const all = first as Producto[];
    _cacheAll = { at: Date.now(), data: all }; // jose
    return all;
  }

  // jose: si está paginado, recolectamos todas las páginas usando el "next"
  const collected: Producto[] = [...first.results];

  let next = first.next;
  while (next) {
    const { data } = await api.get<Paginated<Producto>>(next);
    collected.push(...data.results);
    next = data.next;
  }

  _cacheAll = { at: Date.now(), data: collected }; // jose
  return collected;
}

/* ------------------------------------------------------------------
   Listar productos PAGINADO — (segundo código)
   (Se unifica como función separada para conservar ambas variantes)
-------------------------------------------------------------------*/

export async function listProductosPage(page = 1): Promise<Paginated<Producto>> {
  const { data } = await api.get("/catalogos/productos/", { params: { page } });
  // Si el backend estuviera sin paginar, normalizamos:
  if (Array.isArray(data)) {
    return { results: data, count: data.length, next: null, previous: null };
  }
  return data as Paginated<Producto>;
}

/* ------------------------------------------------------------------
   Listar TODOS (loop por páginas) — (segundo código)
-------------------------------------------------------------------*/

export async function listProductosAll(): Promise<Producto[]> {
  // Primero intentamos sin página (por si el backend NO pagina)
  const { data } = await api.get<Paginated<Producto> | Producto[]>("/catalogos/productos/");
  if (Array.isArray(data)) {
    return data;
  }
  const all: Producto[] = [];
  let page = 1;

  while (true) {
    const { data: pg } = await api.get<Paginated<Producto>>("/catalogos/productos/", {
      params: { page },
    });
    const batch = pg.results ?? [];
    if (batch.length === 0) break;
    all.push(...batch);
    page += 1;
    if (!pg.next) break;
  }
  return all;
}

/* ------------------------------------------------------------------
   CRUD estándar — (unifica ambos códigos)
-------------------------------------------------------------------*/

export async function createProducto(
  payload: ProductoCreate
): Promise<Producto> {
  const { data } = await api.post<Producto>("/catalogos/productos/", payload);
  _cacheAll = null; // jose: invalidar caché porque cambió el listado
  return data;
}

export async function updateProducto(
  id: number,
  payload: ProductoUpdate
): Promise<Producto> {
  const { data } = await api.patch<Producto>(
    `/catalogos/productos/${id}/`,
    payload
  );
  _cacheAll = null; // jose: invalidar caché porque cambió el listado
  return data;
}

export async function toggleProducto(
  id: number,
  activo: boolean
): Promise<Producto> {
  const { data } = await api.patch<Producto>(`/catalogos/productos/${id}/`, {
    activo,
  });
  _cacheAll = null; // jose: invalidar caché porque cambió el listado
  return data;
}

export async function deleteProducto(id: number): Promise<void> {
  await api.delete(`/catalogos/productos/${id}/`);
  _cacheAll = null; // jose: invalidar caché porque cambió el listado
}

/* ------------------------------------------------------------------
   (Opcional) Obtener un producto puntual — (primer código)
-------------------------------------------------------------------*/

export async function getProducto(id: number): Promise<Producto> {
  const { data } = await api.get<Producto>(`/catalogos/productos/${id}/`);
  return data;
}

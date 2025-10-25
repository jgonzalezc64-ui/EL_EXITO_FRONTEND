// frontend/src/services/catalogos/productoModificadores.ts
import api from "../../api/http";
import type { ProductoModificador } from "../../types/catalogos/productoModificadores";

type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };

export async function listProductoModificadores(params?: { id_producto?: number; id_modificador?: number }) {
  const qs = new URLSearchParams();
  if (params?.id_producto) qs.set("id_producto", String(params.id_producto));
  if (params?.id_modificador) qs.set("id_modificador", String(params.id_modificador));
  const url = `/catalogos/producto-modificadores/${qs.toString() ? `?${qs}` : ""}`;

  const { data } = await api.get<Paginated<ProductoModificador> | ProductoModificador[]>(url);
  return (data as Paginated<ProductoModificador>).results ?? (data as ProductoModificador[]);
}

export async function createProductoModificador(rel: { id_producto: number; id_modificador: number }) {
  const { data } = await api.post<ProductoModificador>("/catalogos/producto-modificadores/", rel);
  return data;
}

// El backend expone remove como POST (por body), no DELETE:
export async function removeProductoModificador(rel: { id_producto: number; id_modificador: number }) {
  await api.post("/catalogos/producto-modificadores/remove/", rel);
}

export async function listProductoModificadoresAll(params?: { id_producto?: number; id_modificador?: number }): Promise<ProductoModificador[]> {
  const qs = { ...(params || {}) };
  const first = await api.get<Paginated<ProductoModificador> | ProductoModificador[]>("/catalogos/producto-modificadores/", { params: qs });
  if (Array.isArray(first.data)) return first.data;

  const all: ProductoModificador[] = [];
  let page = 1;

  while (true) {
    const { data } = await api.get<Paginated<ProductoModificador>>("/catalogos/producto-modificadores/", { params: { ...qs, page } });
    const batch = data.results ?? [];
    if (batch.length === 0) break;
    all.push(...batch);
    page += 1;
    if (!data.next) break;
  }
  return all;
}

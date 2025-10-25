import api from "../../api/http";
import type { Menu, MenuCreate, MenuPatch } from "../../types/menus/menu";

const BASE = "/menus/menus/";

type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };

// Ayudante para soportar respuestas paginadas o planas
function toArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];

  if (
    data &&
    typeof data === "object" &&
    "results" in (data as { results?: unknown })
  ) {
    const results = (data as { results?: unknown }).results;
    return Array.isArray(results) ? (results as T[]) : [];
  }

  return [];
}

export async function listMenus(params?: Partial<{ id_tienda: number; activo: string; q: string }>): Promise<Menu[]> {
  const { data } = await api.get<Menu[] | { results: Menu[] }>(BASE, { params });
  return toArray<Menu>(data);
}

export async function createMenu(payload: MenuCreate): Promise<Menu> {
  const { data } = await api.post<Menu>(BASE, payload);
  return data;
}

export async function updateMenu(id_menu: number, patch: MenuPatch): Promise<Menu> {
  const { data } = await api.patch<Menu>(`${BASE}${id_menu}/`, patch);
  return data;
}

export async function deleteMenu(id_menu: number): Promise<void> {
  await api.delete(`${BASE}${id_menu}/`);
}

export async function toggleMenuActivo(id_menu: number, activo: boolean): Promise<Menu> {
  const { data } = await api.patch<Menu>(`${BASE}${id_menu}/`, { activo });
  return data;
}

export async function listMenusAll(params?: { q?: string; activo?: "ALL" | "ON" | "OFF" }): Promise<Menu[]> {
  const first = await api.get<Paginated<Menu> | Menu[]>("/menus/menus/", { params });
  if (Array.isArray(first.data)) return first.data;

  const all: Menu[] = [];
  let page = 1;

  while (true) {
    const { data } = await api.get<Paginated<Menu>>("/menus/menus/", { params: { ...params, page } });
    const batch = data.results ?? [];
    if (batch.length === 0) break;
    all.push(...batch);
    page += 1;
    if (!data.next) break;
  }
  return all;
}
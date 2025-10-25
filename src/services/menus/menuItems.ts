import api from "../../api/http";
import type { MenuItem, MenuItemCreate, MenuItemPatch } from "../../types/menus/menuItem";

/** Type-guard para respuestas paginadas DRF */
function isPaginated<T>(data: unknown): data is { results: T[] } {
  return typeof data === "object" && data !== null && "results" in (data as Record<string, unknown>);
}

/** Filtro visible: "ALL"|"ON"|"OFF" */
function visibleQuery(visible?: "ALL" | "ON" | "OFF"): Record<string, string> {
  if (!visible || visible === "ALL") return {};
  return { visible: visible === "ON" ? "true" : "false" };
}

/**
 * Lista de items del menú.
 * Filtros soportados (ajusta a lo que exponga tu backend):
 * - q           (search)
 * - id_menu     (exact)
 * - id_seccion  (exact)
 * - id_producto (exact)
 * - visible     (true/false/omit)
 */
export async function listMenuItems(params?: {
  q?: string;
  id_menu?: number;
  id_seccion?: number | null;
  id_producto?: number;
  visible?: "ALL" | "ON" | "OFF";
}): Promise<MenuItem[]> {
  const res = await api.get("/menus/items/", {
    params: {
      search: params?.q || undefined,
      id_menu: params?.id_menu || undefined,
      id_seccion: params?.id_seccion ?? undefined,
      id_producto: params?.id_producto || undefined,
      ...visibleQuery(params?.visible),
    },
  });

  const data = res.data as unknown;
  if (isPaginated<MenuItem>(data)) return data.results ?? [];
  return Array.isArray(data) ? (data as MenuItem[]) : [];
}

/** Crear */
export async function createMenuItem(payload: MenuItemCreate): Promise<MenuItem> {
  const res = await api.post("/menus/items/", payload);
  return res.data as MenuItem;
}

/** Patch */
export async function updateMenuItem(id_menu_item: number, patch: MenuItemPatch): Promise<MenuItem> {
  const res = await api.patch(`/menus/items/${id_menu_item}/`, patch);
  return res.data as MenuItem;
}

/** Toggle visible ON/OFF (atajo) */
export async function toggleMenuItemVisible(id_menu_item: number, visible: boolean): Promise<MenuItem> {
  const res = await api.patch(`/menus/items/${id_menu_item}/`, { visible });
  return res.data as MenuItem;
}

/** Eliminar */
export async function deleteMenuItem(id_menu_item: number): Promise<void> {
  await api.delete(`/menus/items/${id_menu_item}/`);
}

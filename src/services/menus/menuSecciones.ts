import api from "../../api/http";
import type {
  MenuSeccion,
  MenuSeccionCreate,
  MenuSeccionPatch,
} from "../../types/menus/menuSeccion";

type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };


/** Type-guard para respuestas paginadas de DRF */
function isPaginated<T>(data: unknown): data is Paginated<T> {
  return !!data && typeof data === "object" && "results" in (data as Record<string, unknown>);
}
/** Construye query de visible: "ALL"|"ON"|"OFF" -> true/false/omitir */
function visibleQuery(visible?: "ALL" | "ON" | "OFF"): Record<string, string> {
  if (!visible || visible === "ALL") return {};
  return { visible: visible === "ON" ? "true" : "false" };
}

/** Lista con filtros opcionales */
export async function listMenuSecciones(params?: {
  q?: string;
  id_menu?: number;
  visible?: "ALL" | "ON" | "OFF";
}): Promise<MenuSeccion[]> {
  const res = await api.get("/menus/secciones/", {
    params: {
      search: params?.q || undefined,        // si habilitaste SearchFilter en backend
      id_menu: params?.id_menu || undefined, // si agregaste filtro exacto
      ...visibleQuery(params?.visible),
    },
  });

  const data = res.data as unknown;
  if (isPaginated<MenuSeccion>(data)) return data.results ?? [];
  return Array.isArray(data) ? (data as MenuSeccion[]) : [];
}

/** Crear sección */
export async function createMenuSeccion(payload: MenuSeccionCreate): Promise<MenuSeccion> {
  const res = await api.post("/menus/secciones/", payload);
  return res.data as MenuSeccion;
}

/** Actualizar (PATCH) */
export async function updateMenuSeccion(id_seccion: number, patch: MenuSeccionPatch): Promise<MenuSeccion> {
  const res = await api.patch(`/menus/secciones/${id_seccion}/`, patch);
  return res.data as MenuSeccion;
}

/** Cambiar visible ON/OFF de forma directa (conservar patrón de “toggle”) */
export async function toggleMenuSeccionVisible(id_seccion: number, visible: boolean): Promise<MenuSeccion> {
  const res = await api.patch(`/menus/secciones/${id_seccion}/`, { visible });
  return res.data as MenuSeccion;
}

/** Eliminar */
export async function deleteMenuSeccion(id_seccion: number): Promise<void> {
  await api.delete(`/menus/secciones/${id_seccion}/`);
}


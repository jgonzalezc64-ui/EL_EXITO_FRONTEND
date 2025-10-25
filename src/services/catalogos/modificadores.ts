// frontend/src/services/catalogos/modificadores.ts
import api from "../../api/http";
import type {
  ModificadorGrupo,
  ModificadorGrupoCreate,
  ModificadorGrupoUpdate,
  Modificador,
  ModificadorCreate,
  ModificadorUpdate,
} from "../../types/catalogos/modificadores";

type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };

// ---- Grupos ----
export async function listModificadorGrupos(): Promise<ModificadorGrupo[]> {
  const { data } = await api.get<Paginated<ModificadorGrupo> | ModificadorGrupo[]>("/catalogos/modificador-grupos/");
  return (data as Paginated<ModificadorGrupo>).results ?? (data as ModificadorGrupo[]);
}

export async function createModificadorGrupo(payload: ModificadorGrupoCreate): Promise<ModificadorGrupo> {
  const { data } = await api.post<ModificadorGrupo>("/catalogos/modificador-grupos/", payload);
  return data;
}

export async function updateModificadorGrupo(id: number, payload: ModificadorGrupoUpdate): Promise<ModificadorGrupo> {
  const { data } = await api.patch<ModificadorGrupo>(`/catalogos/modificador-grupos/${id}/`, payload);
  return data;
}

export async function deleteModificadorGrupo(id: number): Promise<void> {
  await api.delete(`/catalogos/modificador-grupos/${id}/`);
}

// ---- Modificadores ----
export async function listModificadores(): Promise<Modificador[]> {
  const { data } = await api.get<Paginated<Modificador> | Modificador[]>("/catalogos/modificadores/");
  return (data as Paginated<Modificador>).results ?? (data as Modificador[]);
}

export async function createModificador(payload: ModificadorCreate): Promise<Modificador> {
  const { data } = await api.post<Modificador>("/catalogos/modificadores/", payload);
  return data;
}

export async function updateModificador(id: number, payload: ModificadorUpdate): Promise<Modificador> {
  const { data } = await api.patch<Modificador>(`/catalogos/modificadores/${id}/`, payload);
  return data;
}

export async function toggleModificador(id: number, activo: boolean): Promise<Modificador> {
  const { data } = await api.patch<Modificador>(`/catalogos/modificadores/${id}/`, { activo });
  return data;
}

export async function deleteModificador(id: number): Promise<void> {
  await api.delete(`/catalogos/modificadores/${id}/`);
}

export async function listModificadorGruposAll(): Promise<ModificadorGrupo[]> {
  const first = await api.get<Paginated<ModificadorGrupo> | ModificadorGrupo[]>("/catalogos/modificador-grupos/");
  if (Array.isArray(first.data)) return first.data;

  const all: ModificadorGrupo[] = [];
  let page = 1;

  while (true) {
    const { data } = await api.get<Paginated<ModificadorGrupo>>("/catalogos/modificador-grupos/", { params: { page } });
    const batch = data.results ?? [];
    if (batch.length === 0) break;
    all.push(...batch);
    page += 1;
    if (!data.next) break;
  }
  return all;
}

export async function listModificadoresAll(): Promise<Modificador[]> {
  const first = await api.get<Paginated<Modificador> | Modificador[]>("/catalogos/modificadores/");
  if (Array.isArray(first.data)) return first.data;

  const all: Modificador[] = [];
  let page = 1;

  while (true) {
    const { data } = await api.get<Paginated<Modificador>>("/catalogos/modificadores/", { params: { page } });
    const batch = data.results ?? [];
    if (batch.length === 0) break;
    all.push(...batch);
    page += 1;
    if (!data.next) break;
  }
  return all;
}

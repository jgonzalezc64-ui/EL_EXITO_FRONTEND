export interface Menu {
  id_menu: number;
  id_tienda: number;
  nombre: string;
  canal: string | null;
  vigente_desde: string | null; // ISO date "YYYY-MM-DD" o null
  vigente_hasta: string | null; // ISO date "YYYY-MM-DD" o null
  activo: boolean;
}

export interface MenuCreate {
  id_tienda: number;
  nombre: string;
  canal?: string | null;
  vigente_desde?: string | null;
  vigente_hasta?: string | null;
  activo?: boolean;
}

export interface MenuPatch {
  id_tienda?: number;
  nombre?: string;
  canal?: string | null;
  vigente_desde?: string | null;
  vigente_hasta?: string | null;
  activo?: boolean;
}

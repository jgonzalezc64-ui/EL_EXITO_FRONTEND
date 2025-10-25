export interface MenuItem {
  id_menu_item: number;
  id_menu: number;
  id_producto: number;
  id_seccion?: number | null;

  /** Si no viene, el front usará precio del producto */
  precio_override?: number | null;

  visible: boolean;
  orden: number;

  /** ISO YYYY-MM-DD o null */
  vigente_desde?: string | null;
  vigente_hasta?: string | null;
}

export interface MenuItemCreate {
  id_menu: number;
  id_producto: number;
  id_seccion?: number | null;
  precio_override?: number | null;
  visible?: boolean;    // default true en backend
  orden?: number;       // default 1 en backend
  vigente_desde?: string | null;
  vigente_hasta?: string | null;
}

export interface MenuItemPatch {
  id_seccion?: number | null;
  precio_override?: number | null;
  visible?: boolean;
  orden?: number;
  vigente_desde?: string | null;
  vigente_hasta?: string | null;
}

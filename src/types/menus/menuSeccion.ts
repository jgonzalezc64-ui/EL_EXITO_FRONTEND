export interface MenuSeccion {
  id_seccion: number;
  id_menu: number;
  /** Opcional: la sección puede estar ligada a una categoría */
  id_categoria?: number | null;

  nombre: string;
  visible: boolean;
  orden: number;
}

/** Crear */
export interface MenuSeccionCreate {
  id_menu: number;
  nombre: string;
  id_categoria?: number | null;
  visible?: boolean;   // default true en backend
  orden?: number;      // default 1 en backend
}

/** Patch/editar */
export interface MenuSeccionPatch {
  nombre?: string;
  id_categoria?: number | null;
  visible?: boolean;
  orden?: number;
}

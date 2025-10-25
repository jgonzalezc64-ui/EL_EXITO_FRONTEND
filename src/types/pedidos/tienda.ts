export interface Tienda {
  id_tienda: number;
  nombre: string;
  codigo: string;
  activa: boolean;
}

export interface TiendaCreate {
  nombre: string;
  codigo: string;
  activa?: boolean;
}

export interface TiendaPatch {
  nombre?: string;
  codigo?: string;
  activa?: boolean;
}

export type Producto = {
  id_producto: number;
  id_categoria: number; // FK
  nombre: string;
  descripcion?: string | null;
  precio_base: number;
  activo: boolean;
  requiere_cocina: boolean;
};

export type ProductoCreate = {
  id_categoria: number;
  nombre: string;
  descripcion?: string | null;
  precio_base: number;
  requiere_cocina?: boolean;
  activo?: boolean;
};

export type ProductoUpdate = Partial<ProductoCreate>;

export type Categoria = {
  id_categoria: number;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
};

export type CategoriaCreate = {
  nombre: string;
  descripcion?: string | null;
  activo?: boolean;
};

export type CategoriaUpdate = Partial<CategoriaCreate>;

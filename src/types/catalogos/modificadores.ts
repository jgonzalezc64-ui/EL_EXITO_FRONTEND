export type ModificadorGrupo = {
  id_grupo: number;
  nombre: string;
  descripcion?: string | null;
  minimo: number;
  maximo: number;
  obligatorio: boolean;
};

export type ModificadorGrupoCreate = {
  nombre: string;
  descripcion?: string | null;
  minimo?: number;
  maximo?: number;
  obligatorio?: boolean;
};

export type ModificadorGrupoUpdate = Partial<ModificadorGrupoCreate>;

export type Modificador = {
  id_modificador: number;
  id_grupo: number; // FK
  nombre: string;
  precio_extra: number;
  activo: boolean;
};

export type ModificadorCreate = {
  id_grupo: number;
  nombre: string;
  precio_extra?: number;
  activo?: boolean;
};

export type ModificadorUpdate = Partial<ModificadorCreate>;

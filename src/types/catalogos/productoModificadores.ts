export type ProductoModificador = {
  id_producto: number;
  id_modificador: number;
  // opcionales si el backend los devuelve anidados
  id_producto__nombre?: string;
  id_modificador__nombre?: string;
  id_modificador__id_grupo__nombre?: string;
};

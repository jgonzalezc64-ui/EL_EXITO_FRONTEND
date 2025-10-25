// jose
export type KdsOrden = {
  id_orden: number;
  fecha_hora: string;
  id_estado: { id_estado: number; nombre: string };
  id_tipo_servicio: { id_tipo_servicio: number; nombre: string };
  id_mesa?: number | null;
  id_mesero?: number | null;
  observaciones?: string | null;
};

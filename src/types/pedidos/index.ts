// Catálogos mínimos que usa pedidos
export type Tienda = { id_tienda: number; nombre: string; codigo: string; activa: boolean };
export type Mesa = {
  id_mesa: number;
  codigo: string;
  ubicacion?: string | null;
  activa: boolean;
  id_tienda: number | null;
};
export type EstadoOrden = { id_estado: number; nombre: string };
export type TipoServicio = { id_tipo_servicio: number; nombre: string };

// Orden / Detalles
export type Orden = {
  id_orden: number;
  fecha_hora: string; // ISO
  id_mesa?: number | null;
  id_mesero?: number | null;
  id_estado: number;
  id_tipo_servicio: number;
  observaciones?: string | null;
  subtotal: number;
  descuento: number;
  total: number;
};

export type OrdenDetalle = {
  id_detalle: number;
  id_orden: number;
  id_producto: number;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  nota?: string | null;
};

export type OrdenDetalleMod = {
  id_detalle: number;       // PK compuesta (id_detalle, id_modificador)
  id_modificador: number;
  cantidad: number;
  precio_extra: number;
};


// Auxiliares para crear/editar
export type AbrirOrdenPayload = {
  id_tipo_servicio: number;
  id_mesa?: number | null;     // requerido si tipo servicio = MESA
  id_mesero?: number | null;   // opcional
  observaciones?: string | null;
};

export type AgregarDetallePayload = {
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
  nota?: string | null;
  modificadores?: { id_modificador: number; cantidad?: number; precio_extra?: number }[];
};

export type EditarDetallePayload = {
  id_detalle: number;
  cantidad?: number;
  precio_unitario?: number;
  nota?: string | null;
  modificadores?: { replace?: boolean; items: { id_modificador: number; cantidad?: number; precio_extra?: number }[] };
};

export type OrdenDetalleVW = {
  id_detalle: number;
  id_orden: number;
  id_producto: number;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  nota?: string | null;
};

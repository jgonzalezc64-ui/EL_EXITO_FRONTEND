export interface MetodoPago {
    id_metodo: number;
    nombre: string;
}

export interface Pago {
    id_pago: number;
    id_orden: number;
    id_metodo: number;
    monto: number;
    fecha_hora: string;
    referencia?: string;
}

export interface RegistroPagoRequest {
    id_orden: number;
    id_metodo: number;
    monto: number;
    referencia?: string;
}
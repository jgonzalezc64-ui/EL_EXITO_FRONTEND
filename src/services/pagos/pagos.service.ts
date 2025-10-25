import http from '../../api/http';
import type { MetodoPago, Pago, RegistroPagoRequest } from '../../types/pagos/types';

const BASE_URL = '/api/pagos';

export const PagosService = {
    // Obtener métodos de pago disponibles
    getMetodosPago: () => {
        return http.get<MetodoPago[]>('/api/metodos-pago/');
    },

    // Obtener pagos de una orden
    getPagosPorOrden: (idOrden: number) => {
        return http.get<Pago[]>(`${BASE_URL}/?id_orden=${idOrden}`);
    },

    // Registrar un nuevo pago
    registrarPago: (pago: RegistroPagoRequest) => {
        return http.post<Pago>(`${BASE_URL}/registrar/`, pago);
    }
};
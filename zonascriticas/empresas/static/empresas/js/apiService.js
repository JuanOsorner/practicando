/**
 * empresas/js/apiService.js
 * Adaptador específico para la app Empresas usando el Core API.
 */
import { api } from '/static/home/js/core/api.js';

const BASE_URL = '/empresas/api';

export function fetchEmpresas(filtro, busqueda) {
    const url = new URL(`${window.location.origin}${BASE_URL}/empresas/`);
    url.searchParams.append('filtro', filtro);
    if (busqueda) url.searchParams.append('busqueda', busqueda);
    return api.get(url.toString());
}

export function fetchRecursos() {
    return api.get(`${BASE_URL}/recursos/`);
}

export function updateEmpresaEstado(empresaId, nuevoEstado) {
    return api.post(`${BASE_URL}/empresas/${empresaId}/estado/`, { estado: nuevoEstado });
}

export function saveEmpresa(formData) {
    const empresaId = formData.get('id');
    const url = empresaId 
        ? `${BASE_URL}/empresas/${empresaId}/actualizar/`
        : `${BASE_URL}/empresas/crear/`;
    
    return api.post(url, formData);
}

// --- Empleados ---

export function fetchEmpleados(empresaId) {
    return api.get(`${BASE_URL}/empresas/${empresaId}/empleados/`);
}

export function updateEmpleadoEstado(empleadoId, nuevoEstado) {
    return api.post(`${BASE_URL}/empleados/${empleadoId}/estado/`, { estado: nuevoEstado });
}

export function saveEmployee(formData) {
    const empleadoId = formData.get('id');
    const url = empleadoId
        ? `${BASE_URL}/empleados/${empleadoId}/actualizar/`
        : `${BASE_URL}/empleados/crear/`;
        
    return api.post(url, formData);
}
/**
 * registro_herramientas/js/apiService.js
 * Repositorio de comunicación con el Backend.
 * Centraliza todas las URLs y métodos HTTP de este módulo.
 */
import { api } from '/static/home/js/core/api.js';

const BASE_URL = '/herramientas/api';

// --- INVENTARIO (Catálogo) ---

export function fetchInventario() {
    return api.get(`${BASE_URL}/inventario/`);
}

export function saveItem(formData, itemId = null) {
    // Si hay ID es actualización, si no, es creación
    const url = itemId 
        ? `${BASE_URL}/inventario/${itemId}/actualizar/`
        : `${BASE_URL}/inventario/crear/`;
    
    return api.post(url, formData);
}

export function deleteItem(itemId) {
    return api.post(`${BASE_URL}/inventario/${itemId}/eliminar/`, {});
}

// --- CARRITO Y PROCESO (Ingreso) ---

/**
 * Gestiona adición o retiro masivo.
 * @param {Array} ids - Lista de IDs
 * @param {String} accion - 'AGREGAR' | 'REMOVER'
 */
export function gestionMasiva(ids, accion) {
    return api.post(`${BASE_URL}/carrito/masivo/`, { ids, accion });
}

// Mantenemos el individual por compatibilidad si se usa en algún lado legacy,
// aunque el masivo puede cubrir esto.
export function removerIndividual(id_inventario) {
    const formData = new FormData();
    formData.append('id_inventario', id_inventario);
    return api.post(`${BASE_URL}/carrito/remover/`, formData);
}

export function registrarEvidencia(formData) {
    return api.post(`${BASE_URL}/registrar-ingreso/`, formData);
}

export function finalizarIngreso() {
    return api.post(`${BASE_URL}/finalizar/`, {});
}
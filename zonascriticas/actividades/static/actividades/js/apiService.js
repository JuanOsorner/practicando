/**
 * actividades/js/apiService.js
 * Repositorio de comunicación con el Backend para el módulo de Actividades.
 * Centraliza todas las URLs y métodos HTTP.
 */
import { api } from '/static/home/js/core/api.js';

// Base URL para la API de actividades
// Ajusta esto según tu configuración de URLs en Django
const BASE_URL = '/actividades/api'; 

// --- GESTIÓN DE ACTIVIDADES ---

/**
 * Obtiene el listado de actividades de la zona actual.
 */
export function fetchActividades() {
    return api.get(`${BASE_URL}/listar/`);
}

/**
 * Crea una nueva actividad.
 * @param {FormData} formData - Datos de la actividad (título, obs, foto).
 */
export function iniciarActividad(formData) {
    return api.post(`${BASE_URL}/iniciar/`, formData);
}

/**
 * Finaliza una actividad específica.
 * @param {Number} id - ID de la actividad.
 * @param {FormData} formData - Datos de cierre (obs final, foto final).
 */
export function finalizarActividad(id, formData) {
    return api.post(`${BASE_URL}/finalizar/${id}/`, formData);
}

// --- GESTIÓN DE ZONA ---

/**
 * Registra la salida de la zona crítica.
 */
export function salirZona() {
    return api.post(`${BASE_URL}/zona/salir/`, {});
}
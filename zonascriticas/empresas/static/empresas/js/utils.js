/**
 * utils.js
 * Contiene funciones de ayuda globales, como notificaciones.
 */

/**
 * Muestra una notificación usando SweetAlert2.
 * @param {string} mensaje - El mensaje a mostrar.
 * @param {string} [tipo='error'] - 'error' o 'success'.
 */
export function mostrarNotificacion(mensaje, tipo = 'error') {
    if (tipo === 'success') {
        Swal.fire('Éxito', mensaje, 'success');
    } else {
        Swal.fire('Error', mensaje, 'error');
    }
}
/**
 * utils.js
 * Contiene funciones de ayuda globales, como notificaciones.
 */

/**
 * Muestra una notificación simple de éxito o error.
 * @param {string} mensaje - El mensaje a mostrar.
 * @param {string} [tipo='error'] - 'error' o 'success'.
 * @param {string} [titulo=null] - Título personalizado. Si es null, usa 'Éxito' o 'Error'.
 */
export function mostrarNotificacion(mensaje, tipo = 'error', titulo = null) {
    const defaultTitulo = (tipo === 'success') ? 'Éxito' : 'Error';
    
    Swal.fire({
        title: titulo || defaultTitulo,
        text: mensaje,
        icon: tipo
    });
}

/**
 * Muestra un modal de "Cargando...".
 * @param {string} [titulo='Guardando...'] - El texto a mostrar.
 */
export function mostrarCarga(titulo = 'Guardando...') {
    Swal.fire({
        title: titulo,
        text: 'Por favor espera.',
        didOpen: () => {
            Swal.showLoading();
        },
        allowOutsideClick: false,
        allowEscapeKey: false
    });
}

/**
 * Cierra cualquier modal de SweetAlert activo (usualmente el de carga).
 */
export function ocultarCarga() {
    Swal.close();
}
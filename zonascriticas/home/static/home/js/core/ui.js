/**
 * core/ui.js
 * Gestión centralizada de UI (Alertas).
 */

const Swal = window.Swal; // Dependencia global

export const ui = {
    /** Notificación tipo Toast (esquina) */
    showNotification(message, type = 'success') {
        Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer)
                toast.addEventListener('mouseleave', Swal.resumeTimer)
            }
        }).fire({
            icon: type,
            title: message
        });
    },

    /** Modal de Carga Bloqueante */
    showLoading(title = 'Procesando...') {
        Swal.fire({
            title: title,
            text: 'Por favor espera.',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
    },

    /** Cerrar cualquier alerta */
    hideLoading() {
        Swal.close();
    },

    /** Modal de Error */
    showError(message, title = 'Error') {
        Swal.fire({
            icon: 'error',
            title: title,
            text: message,
            confirmButtonColor: '#352460'
        });
    },

    /** Confirmación (Promesa) */
    async confirm(title, text, confirmText = 'Sí, confirmar') {
        const result = await Swal.fire({
            title: title,
            text: text,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#352460',
            cancelButtonColor: '#d33',
            confirmButtonText: confirmText,
            cancelButtonText: 'Cancelar'
        });
        return result.isConfirmed;
    }
};
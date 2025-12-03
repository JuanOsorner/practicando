/**
 * core/api.js (Versión 2.0 - Seguridad Integrada)
 * Cliente HTTP Global con soporte Híbrido (Legacy + Standard).
 * Incluye interceptor de seguridad para expulsión automática por tiempo.
 */

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

async function request(url, method, body = null) {
    const headers = {
        'X-CSRFToken': getCookie('csrftoken') || document.body.dataset.csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
    };

    const config = { method, headers };

    if (body) {
        if (body instanceof FormData) {
            config.body = body;
            // No establecemos Content-Type, el navegador lo hace por nosotros (multipart/form-data)
        } else {
            headers['Content-Type'] = 'application/json';
            config.body = JSON.stringify(body);
        }
    }

    try {
        const response = await fetch(url, config);
        
        // 1. Verificación de Integridad de Respuesta
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            if(response.status === 403 || response.status === 401) {
                 // Caso: Expiración de sesión de Django (Login required)
                 window.location.reload(); 
                 throw new Error("Sesión expirada. Recargando...");
            }
            if(response.status >= 500) {
                throw new Error(`Error crítico del servidor (${response.status}). Contacta a soporte.`);
            }
            throw new Error(`Respuesta no válida del servidor (Se esperaba JSON).`);
        }

        const data = await response.json();

        // ==================================================================
        // 🛡️ INTERCEPTOR DE SEGURIDAD: CONTROL DE TIEMPO / JORNADA 🛡️
        // ==================================================================
        // Verificamos si el Decorador @requiere_tiempo_activo nos bloqueó.
        // El status suele ser 403 y el mensaje clave "TIEMPO_AGOTADO".
        if (response.status === 403 && data.message === 'TIEMPO_AGOTADO') {
            
            const redirectUrl = (data.payload && data.payload.redirect_url) 
                                ? data.payload.redirect_url 
                                : '/'; // Fallback seguro

            // Usamos SweetAlert2 para un bloqueo visual inmediato
            await Swal.fire({
                icon: 'warning',
                title: '⏳ Tiempo Agotado',
                text: 'El tiempo asignado para tu jornada ha finalizado. Serás redirigido para el cierre.',
                allowOutsideClick: false,
                allowEscapeKey: false,
                confirmButtonColor: '#352460', // Tu color corporativo
                confirmButtonText: 'Entendido',
                timer: 4000,
                timerProgressBar: true
            });

            // Redirección Forzosa (replace borra el historial para que no puedan volver atrás)
            window.location.replace(redirectUrl);

            // Lanzamos un error silencioso para detener cualquier ejecución posterior en el controlador
            throw new Error("Jornada finalizada por el servidor.");
        }
        // ==================================================================


        // --- 2. ADAPTADOR DE RESPUESTAS (Manejo de formatos) ---

        // CASO A: Respuesta Estandarizada (api_response de Python)
        // Estructura: { success: bool, message: str, payload: any }
        if ('success' in data && 'payload' in data) {
            if (!data.success) {
                // Si success es false, lanzamos error con el mensaje del backend
                throw new Error(data.message || 'Error en la operación');
            }
            // ÉXITO: Retornamos SOLO el payload para limpieza en controladores
            return data.payload;
        }

        // CASO B: Respuesta Legacy "Status/Data"
        if ('status' in data && 'data' in data) {
             if (!data.status) {
                 throw new Error(data.mensaje || data.message || 'Error en la operación');
             }
             return data.data;
        }

        // CASO C: Respuesta Legacy "Success/Data"
        if ('success' in data && 'data' in data) {
             if (!data.success) {
                throw new Error(data.message || 'Error desconocido');
             }
             return data.data;
        }

        // CASO D: Fallback Genérico (Errores de Django o DRF)
        if (!response.ok) {
            // Buscamos claves comunes de error en objetos de error de Django
            throw new Error(data.error || data.message || data.detail || 'Error desconocido en la petición');
        }

        // Si llegó aquí, es un JSON crudo exitoso
        return data;

    } catch (error) {
        // Log para depuración, pero no mostramos alerta aquí (la UI se encarga)
        // A menos que sea la redirección, que ya la manejamos arriba.
        if (error.message !== "Jornada finalizada por el servidor.") {
            console.error("API Error:", error);
        }
        throw error; // Re-lanzamos para que el controlador (UI) muestre el mensaje si es necesario
    }
}

export const api = {
    get: (url) => request(url, 'GET'),
    post: (url, body) => request(url, 'POST', body),
    put: (url, body) => request(url, 'PUT', body),
    delete: (url) => request(url, 'DELETE'),
    request
};
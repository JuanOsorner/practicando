/**
 * core/api.js (Refactorizado v1.1)
 * Cliente HTTP Global con soporte Híbrido (Legacy + Standard).
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
        
        // 1. Verificación de Sesión / Errores de Servidor HTML
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            if(response.status === 403 || response.status === 401) {
                 throw new Error("Sesión expirada o no autorizada. Recarga la página.");
            }
            if(response.status >= 500) {
                throw new Error(`Error crítico del servidor (${response.status}). Contacta a soporte.`);
            }
            // Si devuelve HTML inesperado (ej: debug page)
            throw new Error(`Respuesta no válida del servidor (Formato no JSON).`);
        }

        const data = await response.json();

        // --- 2. ADAPTADOR DE RESPUESTAS (El Cerebro Nuevo) ---

        // CASO A: Respuesta Estandarizada (Nuevo Helper Python: api_response)
        // Estructura: { success, message, payload, timestamp }
        if ('success' in data && 'payload' in data) {
            if (!data.success) {
                // Si success es false, lanzamos error con el mensaje del backend
                throw new Error(data.message || 'Error en la operación');
            }
            // ÉXITO: Retornamos SOLO el payload para que el controlador no note el cambio
            return data.payload;
        }

        // CASO B: Respuesta Legacy "Status/Data" (Usado en Herramientas/Empresas antiguo)
        // Estructura: { status: boolean, data: ... }
        if ('status' in data && 'data' in data) {
             if (!data.status) {
                 throw new Error(data.mensaje || data.message || 'Error en la operación');
             }
             return data.data;
        }

        // CASO C: Respuesta Legacy "Success/Data" (Variante)
        if ('success' in data && 'data' in data) {
             // Algunas vistas devolvían esto manualmente
             return data.data;
        }

        // CASO D: Fallback Genérico (Django Error Dict o Raw Data)
        // Si el status HTTP no es OK, asumimos que el JSON contiene detalles del error
        if (!response.ok) {
            // Buscamos claves comunes de error
            throw new Error(data.error || data.message || data.detail || 'Error desconocido en la petición');
        }

        // Si llegó aquí, es un JSON crudo exitoso (ej: { "empresas": [...] })
        return data;

    } catch (error) {
        console.error("API Error:", error);
        throw error; // Re-lanzamos para que el controlador lo maneje (UI)
    }
}

export const api = {
    get: (url) => request(url, 'GET'),
    post: (url, body) => request(url, 'POST', body),
    put: (url, body) => request(url, 'PUT', body),
    delete: (url) => request(url, 'DELETE'),
    request
};
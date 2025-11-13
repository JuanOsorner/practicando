/**
 * core/api.js
 * Cliente HTTP Global.
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
        'X-CSRFToken': getCookie('csrftoken') || document.body.dataset.csrfToken, // Fallback al dataset del body
        'X-Requested-With': 'XMLHttpRequest',
    };

    const config = { method, headers };

    if (body) {
        if (body instanceof FormData) {
            config.body = body;
        } else {
            headers['Content-Type'] = 'application/json';
            config.body = JSON.stringify(body);
        }
    }

    try {
        const response = await fetch(url, config);
        const contentType = response.headers.get("content-type");
        
        if (!contentType || !contentType.includes("application/json")) {
            // Si falla la sesión o hay error 500 html
            if(response.status === 403 || response.status === 401) {
                 throw new Error("Sesión expirada o no autorizada.");
            }
            throw new Error(`Respuesta no válida del servidor (Status: ${response.status})`);
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.message || 'Error en la operación');
        }

        return data;

    } catch (error) {
        console.error("API Error:", error);
        throw error; 
    }
}

export const api = {
    get: (url) => request(url, 'GET'),
    post: (url, body) => request(url, 'POST', body),
    put: (url, body) => request(url, 'PUT', body),
    delete: (url) => request(url, 'DELETE'),
    request 
};
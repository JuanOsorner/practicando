/**
 * apiService.js
 * Módulo para centralizar todas las peticiones fetch (API).
 */

// Utilidad para obtener el token CSRF de Django
function getCSRFToken() {
    // Lee el token desde el atributo 'data' del body
    const token = document.body.dataset.csrfToken;
    if (!token) {
        console.error('¡Token CSRF no encontrado en el body!');
    }
    return token;
}

/**
 * Realiza una petición fetch manejando errores comunes y JSON.
 */
async function apiFetch(url, options = {}) {
    options.headers = {
        ...options.headers,
        'X-CSRFToken': getCSRFToken(),
        'X-Requested-With': 'XMLHttpRequest', 
    };
    
    if (options.body && !(options.body instanceof FormData)) {
        options.headers['Content-Type'] = 'application/json';
        if (typeof options.body !== 'string') {
             options.body = JSON.stringify(options.body);
        }
    }

    try {
        const response = await fetch(url, options);
        // Si la respuesta no es JSON (ej. 404), falla antes de intentar parsear
        if (!response.headers.get("content-type")?.includes("application/json")) {
             throw new Error(`Respuesta no es JSON. Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error en el servidor');
        }
        
        return data; 
        
    } catch (error) {
        console.error('Error en apiFetch:', error);
        // Añadimos un chequeo para el error de JSON
        if (error instanceof SyntaxError) {
            console.error("El servidor devolvió HTML o texto en lugar de JSON. Verifica la URL y si hay un error 500 en el backend.");
            throw new Error("Error de formato de respuesta del servidor.");
        }
        throw error; 
    }
}

// --- API de Empresas ---

export function fetchEmpresas(filtro, busqueda) {
    const url = new URL('/empresas/api/empresas/', window.location.origin);
    url.searchParams.append('filtro', filtro);
    if (busqueda) url.searchParams.append('busqueda', busqueda);
    
    return apiFetch(url);
}

export function updateEmpresaEstado(empresaId, nuevoEstado) {
    return apiFetch(`/empresas/api/empresas/${empresaId}/estado/`, {
        method: 'POST',
        body: { estado: nuevoEstado },
    });
}

// --- API de Empleados ---
export function fetchEmpleados(empresaId) {
    return apiFetch(`/empresas/api/empresas/${empresaId}/empleados/`);
}

export function updateEmpleadoEstado(empleadoId, nuevoEstado) {
    return apiFetch(`/empresas/api/empleados/${empleadoId}/estado/`, {
        method: 'POST',
        body: { estado: nuevoEstado },
    });
}

// --- API de Recursos (Cargos, Servicios) ---
export function fetchRecursos() {
    // --- RUTA CORREGIDA ---
    return apiFetch('/empresas/api/recursos/'); 
}

export function saveEmpresa(formData) {
    const empresaId = formData.get('id');

    if (empresaId) {
        // Lógica de Actualizar
        return apiFetch(`/empresas/api/empresas/${empresaId}/actualizar/`, {
            method: 'POST',
            body: formData,
        });
    } else {
        // Lógica de Crear
        return apiFetch('/empresas/api/empresas/crear/', {
            method: 'POST',
            body: formData, 
        });
    }
}

export function saveEmployee(formData) {
    const empleadoId = formData.get('id');

    if (empleadoId) {
        // Lógica de Actualizar (la implementaremos después)
        // return apiFetch(`/empresas/api/empleados/${empleadoId}/actualizar/`, {
        //     method: 'POST',
        //     body: formData,
        // });
        console.log("Lógica de actualizar empleado aún no implementada");
    } else {
        // Lógica de Crear
        return apiFetch('/empresas/api/empleados/crear/', {
            method: 'POST',
            body: formData, // FormData se envía tal cual (sin JSON.stringify)
        });
    }
}
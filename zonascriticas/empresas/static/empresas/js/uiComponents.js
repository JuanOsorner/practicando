/**
 * uiComponents.js
 * Módulo responsable de generar los componentes HTML.
 * No realiza peticiones API, solo recibe datos y devuelve HTML.
 */

// Función de utilidad para normalizar rutas de imagen
function normalizarRutaImagen(rutaDesdeBD) {
    if (!rutaDesdeBD) return null;
    // En Django, las rutas de 'media' ya vienen correctas (ej. /media/usuarios/foto.jpg)
    // No necesitamos la lógica de '..'. Si la ruta no empieza con '/', es probable que
    // sea un nombre de archivo. Asumimos que la API la devuelve completa.
    return rutaDesdeBD.startsWith('/') ? rutaDesdeBD : `/media/${rutaDesdeBD}`;
}

/**
 * Crea el HTML para una tarjeta de Empresa.
 * @param {object} empresa - El objeto de datos de la empresa.
 * @returns {string} - El string HTML de la tarjeta.
 */
export function createEmpresaCard(empresa) {
    const cardClasses = `empleado-card ${!empresa.estado ? 'inactivo' : ''}`;
    
    return `
    <div class="${cardClasses}" data-id="${empresa.id}">
        <div class="empleado-header" data-action="open-panel">
            <div class="empleado-avatar">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M8.25 6h7.5m-7.5 3h7.5m-7.5 3h7.5m-7.5 3h7.5M3 3h18v18H3V3z" /></svg>
            </div>
            <div class="empleado-info">
                <h3>${empresa.nombre_empresa}</h3>
                <p>NIT: ${empresa.nit}</p>
            </div>
        </div>
        <dl class="card-details" data-action="open-panel">
            <dt><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg></dt>
            <dd>${empresa.direccion || 'N/A'}</dd>
            <dt><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg></dt>
            <dd>${empresa.contacto || 'N/A'}</dd>
            <dt><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-4.243-4.243l3.275-3.275a4.5 4.5 0 00-6.336 4.486c.046.58.143 1.163.308 1.743m-1.282 5.421l3.586 3.586" /></svg></dt>
            <dd>${empresa.servicios_nombres || 'N/A'}</dd>
        </dl>
        <div class="empleado-footer">
            <span class="status-label">Estado</span>
            <label class="status-switch">
                <input type="checkbox" class="toggle-estado" ${empresa.estado ? 'checked' : ''}>
                <span class="slider"></span>
            </label>
        </div>
    </div>
    `;
}

/**
 * Crea el HTML para la tarjeta de Empleado (en el panel).
 * @param {object} empleado - El objeto de datos del empleado.
 * @returns {string} - El string HTML de la tarjeta.
 */
export function createEmpleadoCard(empleado) {
    const cardClasses = `employee-card-compact ${!empleado.estado ? 'inactivo' : ''}`;
    
    // Django envía 'HH:MM:SS', cortamos a 'HH:MM'
    let horaLimiteTexto = 'Hora Límite: N/A';
    if (empleado.tiempo_limite_jornada) {
        horaLimiteTexto = `Hora Límite: ${empleado.tiempo_limite_jornada.substring(0, 5)}`;
    }
    
    // Usamos el 'get_full_name' de Django o el username
    const nombreCompleto = empleado.nombre_completo || empleado.username;
    const imagenSrc = empleado.img ? normalizarRutaImagen(empleado.img) : null;

    return `
    <div class="${cardClasses}" data-employee-id="${empleado.id}">
        <div data-action="edit-employee">
            <div class="empleado-header">
                <div class="empleado-avatar">
                    ${imagenSrc ? `<img src="${imagenSrc}" alt="${nombreCompleto}">` : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>`}
                </div>
                <div class="empleado-info">
                    <h5>${nombreCompleto}</h5>
                    <p>${empleado.cargo_nombre || 'Sin cargo'}</p>
                </div>
            </div>
            <dl class="card-details">
                <dt>Documento</dt>
                <dd>${empleado.numero_documento || 'N/A'}</dd>
                <dt>Correo</dt>
                <dd>${empleado.email || 'N/A'}</dd>
                <dt><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 16px; height: 16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></dt>
                <dd>${horaLimiteTexto}</dd>
            </dl>
        </div>
        <div class="empleado-footer">
            <span class="status-label">Estado</span>
            <label class="status-switch">
                <input type="checkbox" class="toggle-estado-empleado" ${empleado.estado ? 'checked' : ''}>
                <span class="slider"></span>
            </label>
        </div>
    </div>
    `;
}

// Aquí podríamos añadir las funciones que generan los formularios
// ej. export function getCompanyInfoCardHTML(data) { ... }
// ej. export function getEmployeeFormHTML(data) { ... }
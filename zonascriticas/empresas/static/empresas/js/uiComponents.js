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

/**
 * Genera el HTML para el contenido del panel (info y formulario de empresa).
 * @param {object | null} data - Los datos de la empresa, o null si es nueva.
 * @returns {string} - El string HTML para inyectar en el panel.
 */
export function getPanelContentHTML(data) {
    const isNew = !data;
    
    // Nombres de servicios (si existen)
    const serviciosView = (data && data.servicios_nombres) ? data.servicios_nombres : 'N/A';
    
    return `
    <div class="info-card ${isNew ? 'is-editing' : ''}">
        <button type="button" class="edit-btn" data-action="edit-company" title="Editar Empresa">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
        </button>

        <div class="view-mode card-details" style="grid-template-columns: auto 1fr; gap: 12px 16px;">
            <dt><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M8.25 6h7.5m-7.5 3h7.5m-7.5 3h7.5m-7.5 3h7.5M3 3h18v18H3V3z" /></svg></dt>
            <dd>${isNew ? 'Nueva Empresa' : (data.nombre_empresa || '')}</dd>
            
            <dt><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 8.25h13.5m-13.5 7.5h13.5m-1.5-15l-1.5 15m-6.75-15l-1.5 15" /></svg></dt>
            <dd>${isNew ? '' : (data.nit || '')}</dd>
            
            <dt><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg></dt>
            <dd>${isNew ? '' : (data.direccion || 'N/A')}</dd>
            
            <dt><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg></dt>
            <dd>${isNew ? '' : (data.contacto || 'N/A')}</dd>
            
            <dt><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-4.243-4.243l3.275-3.275a4.5 4.5 0 00-6.336 4.486c.046.58.143 1.163.308 1.743m-1.282 5.421l3.586 3.586" /></svg></dt>
            <dd>${serviciosView}</dd>
        </div>

        <div class="edit-mode">
            <input type="hidden" name="id" value="${isNew ? '' : data.id}">
            
            <div class="input-group">
                <input type="text" name="nombre_empresa" placeholder=" " value="${isNew ? '' : (data.nombre_empresa || '')}" required>
                <label>Nombre de la Empresa</label>
            </div>
            
            <div class="input-group">
                <input type="text" name="nit" placeholder=" " value="${isNew ? '' : (data.nit || '')}" required>
                <label>NIT</label>
            </div>
            
            <div class="input-group">
                <input type="text" name="direccion" placeholder=" " value="${isNew ? '' : (data.direccion || '')}">
                <label>Dirección</label>
            </div>
            
            <div class="input-group">
                <input type="text" name="contacto" placeholder=" " value="${isNew ? '' : (data.contacto || '')}">
                <label>Contacto</label>
            </div>
            
            <div class="input-group-full">
                <label>Servicios</label>
                <input id="servicios-multiselect" name="servicios_input_temp" />
            </div>
            
            <div class="info-card-actions">
                <button type="button" class="btn-primary btn-secondary" data-action="cancel-edit-company">Cancelar</button>
                <button type="submit" class="btn-primary" data-action="save-company">
                    ${isNew ? 'Registrar Empresa' : 'Guardar Cambios'}
                </button>
            </div>
        </div>
    </div>
    
    <div class="panel-sub-list-container" id="panel-empleados-section" style="display: ${isNew ? 'none' : 'block'};">
        <div class="panel-sub-list-header">
            <h4>Empleados</h4>
            <button type="button" class="btn-primary" data-action="register-employee">
                <i><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg></i>
                <span>Registrar</span>
            </button>
        </div>
        <div class="header" style="margin-bottom: 16px;">
            <div class="search-container">
                 <input type="search" id="buscador-panel-empleados" placeholder="Buscar empleado...">
            </div>
             <div class="filter-group">
                 <button class="btn-filter active" data-filter="todos">Todos</button>
                 <button class="btn-filter" data-filter="activos">Activos</button>
                 <button class="btn-filter" data-filter="inactivos">Inactivos</button>
             </div>
        </div>
        <div id="panel-empleados-container">
            </div>
    </div>
    `;
}
/**
 * Genera el HTML para el formulario de Empleado (Crear o Editar).
 * @param {object | null} data - Los datos del empleado, o null si es nuevo.
 * @param {Array} cargosDisponibles - Array de {id, text} para el dropdown.
 * @returns {string} - El string HTML del formulario.
 */
export function getEmployeeFormHTML(data, cargosDisponibles) {
    const isNew = !data;
    
    // Normalizamos 'data' para el formulario
    const empleado = data || {}; 
    
    const horaLimite = (empleado.tiempo_limite_jornada) ? empleado.tiempo_limite_jornada.substring(0, 5) : '';
    const imagenSrc = (empleado.img) ? normalizarRutaImagen(empleado.img) : '';

    return `
    <input type="hidden" name="id" value="${isNew ? '' : (empleado.id || '')}">
    
    <div class="image-upload-container" id="trigger-image-upload">
        <input type="file" id="imagen_empleado" name="imagen_empleado" accept="image/jpeg, image/png" style="display:none;">
        <img src="${imagenSrc}" alt="Vista previa" id="image-preview" style="display: ${!imagenSrc ? 'none' : 'block'};">
        <div id="placeholder-text" style="display: ${!imagenSrc ? 'block' : 'none'};">
            <i><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg></i>
            <span>Subir/Cambiar Foto</span>
        </div>
    </div>
    
    <div class="input-group">
        <input type="text" name="first_name" placeholder=" " value="${isNew ? '' : (empleado.first_name || '')}" required>
        <label>Nombre Completo</label>
    </div>

    <div class="input-group">
        <input type="email" name="email" placeholder=" " value="${isNew ? '' : (empleado.email || '')}" required>
        <label>Correo Electrónico</label>
    </div>
    
    <div class="input-group">
        <select name="tipo_documento" required class="form-control-select">
            <option value="" disabled ${isNew ? 'selected' : ''}>Tipo de Documento</option>
            <option value="CC" ${!isNew && empleado.tipo_documento == 'CC' ? 'selected' : ''}>Cédula de Ciudadanía</option>
            <option value="CE" ${!isNew && empleado.tipo_documento == 'CE' ? 'selected' : ''}>Cédula de Extranjería</option>
            <option value="PA" ${!isNew && empleado.tipo_documento == 'PA' ? 'selected' : ''}>Pasaporte</option>
        </select>
    </div>

    <div class="input-group">
        <input type="text" name="numero_documento" placeholder=" " value="${isNew ? '' : (empleado.numero_documento || '')}" required>
        <label>Número de Documento</label>
    </div>

    <div class="input-group">
        <select name="tipo" required class="form-control-select">
            <option value="Usuario" ${!isNew && empleado.tipo == 'Usuario' ? 'selected' : ''}>Usuario</option>
            <option value="Administrador" ${!isNew && empleado.tipo == 'Administrador' ? 'selected' : ''}>Administrador</option>
        </select>
    </div>

    <div class="input-group-full">
        <label>Cargo</label>
        <input id="cargo-empleado-multiselect" name="cargo_input_temp" />
        <input type="hidden" name="cargo" id="cargo-empleado-hidden" value="${isNew ? '' : (empleado.cargo || '')}">
    </div>

    <div class="input-group">
        <input type="time" id="tiempo_limite_jornada" name="tiempo_limite_jornada" value="${horaLimite}" placeholder=" ">
        <label for="tiempo_limite_jornada">Hora Límite de Jornada (Opcional)</label>
    </div>

    <div class="info-card-actions">
        <button type="button" class="btn-primary btn-secondary" data-action="cancel-edit-employee">Cancelar</button>
        <button type="submit" class="btn-primary" data-action="save-employee">
            ${isNew ? 'Registrar Empleado' : 'Guardar Cambios'}
        </button>
    </div>
    `;
}
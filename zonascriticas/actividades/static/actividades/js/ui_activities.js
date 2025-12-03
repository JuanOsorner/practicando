/**
 * actividades/js/ui_activities.js
 * ACTUALIZADO: Lista de pendientes dentro del formulario de creación.
 */

export const ActivitiesUI = {

    /**
     * Genera el HTML de una tarjeta (Reutilizable).
     */
    createActivityCard(act) {
        const isPending = act.estado === 'EN_PROCESO';
        const statusClass = `status-${act.estado}`; 
        const icon = isPending ? '<i class="fas fa-clock"></i>' : '<i class="fas fa-check-circle"></i>';
        const bgImage = act.foto_inicial ? `background-image:url('${act.foto_inicial}')` : '';

        // Agregamos una clase extra 'panel-card' para estilos específicos si se necesita
        return `
            <div class="activity-card ${statusClass} panel-card" data-id="${act.id}" style="margin-bottom: 10px;">
                <div class="card-header">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div class="card-thumb" style="${bgImage}"></div>
                        <span class="card-title">${act.titulo}</span>
                    </div>
                    <div class="status-icon">${icon}</div>
                </div>
                <div class="card-body" style="padding-top:10px;">
                    <small style="color:#888;"><i class="fas fa-play"></i> ${act.hora_inicio}</small>
                </div>
            </div>
        `;
    },

    /**
     * Formulario para CREAR + Lista de Pendientes.
     * @param {Array} actividades - Lista completa de actividades (opcional).
     */
    getCreateForm(actividades = []) {
        // 1. Filtrar solo las pendientes (EN_PROCESO)
        const pendientes = actividades.filter(a => a.estado === 'EN_PROCESO');
        const count = pendientes.length;

        // 2. Generar HTML de las tarjetas
        let listHtml = '';
        if (count > 0) {
            pendientes.forEach(act => {
                listHtml += this.createActivityCard(act);
            });
        } else {
            listHtml = '<p class="read-only-text" style="text-align:center; font-style:italic;">No hay actividades pendientes.</p>';
        }

        // 3. Retornar HTML completo
        return `
            <div class="panel-content-wrapper">
                
                <div class="image-upload-container" id="trigger-camera-panel">
                    <img id="panel-img-preview" class="image-preview-full" style="display:none;">
                    <div class="image-upload-placeholder" id="ref-placeholder">
                            <i class="fas fa-camera"></i>
                            <span class = "texto-imagen">Toca para agregar foto</span>
                        </div>
                </div>

                <div class="panel-section">
                    <div class="input-group">
                        <input type="text" id="panel-act-title" class="styled-input" placeholder=" " required autocomplete="off">
                        <label>Nombre de la actividad</label>
                    </div>
                    
                    <div class="input-group">
                        <textarea id="panel-act-obs" class="styled-input" placeholder=" " rows="3"></textarea>
                        <label>Observaciones iniciales (Opcional)</label>
                    </div>
                </div>

                <div class="panel-footer-actions">
                    <button id="btn-save-activity" type="button" class="btn-primary btn-block">
                        <i class="fas fa-save"></i> Guardar Actividad
                    </button>
                </div>
                
                <div class="panel-section" style="margin-top: 30px; padding-top: 20px;">
                    <h4 class="pending-section-title">
                        <i class="fas fa-exclamation-circle"></i> Actividades pendientes
                        <span class="pending-count-badge">${count}</span>
                    </h4>
                    
                    <div class="pending-list-container" style="max-height: 300px; overflow-y: auto; padding: 2px;">
                        ${listHtml}
                    </div>
                </div>

            </div>
        `;
    },

    getDetailView(actividad) {
        // ... (Tu código existente de getDetailView sin cambios) ...
        const isPending = actividad.estado === 'EN_PROCESO';
        const fotoInicial = actividad.foto_inicial || '/static/home/img/placeholder.png'; 
        
        const cierreHtml = isPending ? `
            <div class="panel-section closure-section">
                <h4 class="section-title"><i class="fas fa-flag-checkered"></i> Finalizar</h4>
                <div class="input-group">
                    <textarea id="panel-act-obs-final" class="styled-input" placeholder=" " rows="3"></textarea>
                    <label>Observaciones de cierre</label>
                </div>
                <button id="btn-panel-finalize" type="button" class="btn-success btn-block" data-id="${actividad.id}">
                    <i class="fas fa-camera"></i> Tomar Foto Final y Cerrar
                </button>
            </div>
        ` : `
            <div class="panel-section finished-section">
                <h4 class="section-title success-text"><i class="fas fa-check-circle"></i> Completada</h4>
                <p class="read-only-text"><strong>Cierre:</strong> ${actividad.obs_final || 'Sin observaciones'}</p>
                ${actividad.foto_final ? `<div class="img-preview-box" style="background-image:url('${actividad.foto_final}')" onclick="window.open('${actividad.foto_final}')"></div>` : ''}
            </div>
        `;

        return `
            <div class="activity-detail-wrapper">
                <div class="detail-header-img" style="background-image:url('${fotoInicial}')">
                    <span class="status-badge ${isPending ? 'status-red' : 'status-green'}">
                        ${isPending ? 'En Proceso' : 'Finalizada'}
                    </span>
                </div>
                
                <h3 class="detail-title">${actividad.titulo}</h3>
                
                <div class="meta-row">
                    <span><i class="far fa-clock"></i> Inicio: ${actividad.hora_inicio}</span>
                </div>

                <div class="panel-section">
                    <p class="read-only-text">${actividad.obs_inicial || 'Sin observaciones iniciales'}</p>
                </div>

                <hr class="panel-divider">
                
                ${cierreHtml}
            </div>
        `;
    }
};
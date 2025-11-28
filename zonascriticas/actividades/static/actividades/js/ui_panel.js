/**
 * ui_panel.js
 * Generador de plantillas HTML.
 */

export const PanelBuilder = {

    /**
     * Formulario "Media First" (Igual a Herramientas).
     */
    getCreateForm() {
        return `
            <div class="panel-content-wrapper">
                
                <div class="image-upload-container" id="trigger-camera-panel">
                    <img id="panel-img-preview" class="image-preview-full">
                    <div id="panel-img-placeholder" style="text-align:center;">
                        <i class="fas fa-camera"></i>
                        <span>Tocar para tomar foto</span>
                    </div>
                </div>

                <div class="panel-section">
                    <div class="input-group">
                        <input type="text" id="panel-act-title" placeholder=" " required autocomplete="off">
                        <label>Nombre de la actividad</label>
                    </div>
                    
                    <div class="input-group">
                        <textarea id="panel-act-obs" placeholder=" " rows="3"></textarea>
                        <label>Observaciones iniciales (Opcional)</label>
                    </div>
                </div>

                <div class="panel-footer-actions">
                    <button id="btn-save-activity" type="button" class="btn-primary btn-block">
                        <i class="fas fa-save"></i> Guardar Actividad
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Vista de Detalle (Se mantiene igual, solo un pequeño ajuste visual si deseas)
     */
    getDetailView(actividad) {
        // ... (Mismo código que te pasé en la respuesta anterior para getDetailView)
        // Solo asegúrate de que el botón de finalizar tenga el estilo correcto.
        const isPending = actividad.estado === 'EN_PROCESO';
        const fotoInicial = actividad.foto_inicial || '/static/home/img/placeholder.png'; 
        
        const cierreHtml = isPending ? `
            <div class="panel-section closure-section">
                <h4 class="section-title"><i class="fas fa-flag-checkered"></i> Finalizar</h4>
                <div class="input-group">
                    <textarea id="panel-act-obs-final" placeholder=" " rows="3"></textarea>
                    <label>Observaciones de cierre</label>
                </div>
                <button id="btn-panel-finalize" type="button" class="btn-success btn-block" data-id="${actividad.id}">
                    <i class="fas fa-camera"></i> Tomar Foto Final y Cerrar
                </button>
            </div>
        ` : `
            <div class="panel-section finished-section">
                <h4 class="section-title success-text"><i class="fas fa-check-circle"></i> Completada</h4>
                <p class="read-only-text">${actividad.obs_final || 'Sin observaciones'}</p>
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
                <p class="read-only-text" style="margin-bottom:20px;">${actividad.obs_inicial || ''}</p>
                <hr class="panel-divider">
                ${cierreHtml}
            </div>
        `;
    }
};
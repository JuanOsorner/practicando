/**
 * zonascriticas\registros\static\registros\js\PanelRegistrosUI.js
 * GESTOR DEL PANEL LATERAL (TIMELINE DE INGRESOS)
 */

import { api } from '/static/home/js/core/api.js';
import { ui } from '/static/home/js/core/ui.js';
import { GlobalPanel } from '/static/home/js/core/panel.js';

export class PanelRegistrosUI {

    static async open(usuarioId, nombreUsuario, onCloseCallback) {
        // 1. Abrir Panel con Loading
        GlobalPanel.open({
            title: `Historial: ${nombreUsuario}`,
            contentHTML: '<div class="text-center p-5"><i class="fas fa-spinner fa-spin fa-2x text-primary"></i><p class="mt-3">Cargando cronología...</p></div>',
            onClose: onCloseCallback
        });

        try {
            // 2. Obtener Historial
            const historial = await api.get(`/registros/api/historial/${usuarioId}/`);
            
            // 3. Renderizar Timeline
            const html = this.renderTimeline(historial);
            const panelBody = GlobalPanel.getBodyElement();
            panelBody.innerHTML = html;

            // 4. Activar Listeners (Botones Reactivar)
            this.bindEvents(panelBody);

        } catch (error) {
            const panelBody = GlobalPanel.getBodyElement();
            panelBody.innerHTML = `<div class="alert alert-danger m-3">${error.message}</div>`;
        }
    }

    static renderTimeline(historial) {
        // 1. Validar si está vacío
        if (!historial || historial.length === 0) {
            return `
                <div class="text-center p-5">
                    <div class="mb-3">
                        <i class="fas fa-folder-open fa-3x text-muted opacity-25"></i>
                    </div>
                    <h5 class="text-muted">Sin historial</h5>
                    <p class="small text-muted">Este usuario no tiene registros previos.</p>
                </div>
            `;
        }

        let html = '<div class="timeline-container">';

        historial.forEach((item, index) => {
            const isFirst = index === 0; // El registro más reciente
            const isFinalizado = item.estado === 'Finalizado';
            const isEnZona = item.estado === 'En Zona';
            
            // Colores según estado
            const colorEstado = isEnZona ? 'success' : 'secondary';
            const textoEstado = isEnZona ? 'En Zona' : 'Finalizado';

            // --- A. LÓGICA DE BOTONES PDF (Descargo y Salida) ---
            let pdfButtons = '';
            
            // 1. Acta de Ingreso (Descargo)
            if (item.url_descargo) {
                pdfButtons += `
                    <a href="${item.url_descargo}" target="_blank" class="btn btn-sm btn-light border" title="Ver Acta de Ingreso" style="text-decoration:none;">
                        <i class="fas fa-file-contract text-primary"></i> Acta Ingreso
                    </a>
                `;
            }

            // 2. Reporte de Salida (Actividades)
            if (item.url_salida) {
                pdfButtons += `
                    <a href="${item.url_salida}" target="_blank" class="btn btn-sm btn-light border" title="Ver Reporte de Salida" style="text-decoration:none;">
                        <i class="fas fa-file-invoice-dollar text-success"></i> Reporte Salida
                    </a>
                `;
            }

            // Envolver botones si existen
            let pdfSection = '';
            if (pdfButtons) {
                pdfSection = `<div class="timeline-docs mt-3 d-flex flex-wrap gap-2">${pdfButtons}</div>`;
            }

            // --- B. LÓGICA DE REACTIVACIÓN (Solo si finalizado) ---
            let btnReactivar = '';
            if (isFinalizado) {
                btnReactivar = `
                    <button class="btn-reactivar-timeline mt-3" data-id="${item.id}">
                        <i class="fas fa-history"></i> Reactivar Jornada
                    </button>
                `;
            }

            // --- C. CONSTRUCCIÓN DEL HTML DE LA CARD ---
            html += `
                <div class="timeline-item ${isFirst ? 'highlight' : ''}">
                    <div class="timeline-marker ${colorEstado}"></div>
                    
                    <div class="timeline-content">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="timeline-date">
                                <i class="far fa-calendar-alt me-1"></i> ${item.fecha_ingreso}
                            </span>
                            <span class="badge badge-soft-${colorEstado}">
                                ${textoEstado}
                            </span>
                        </div>
                        
                        <h4 class="timeline-zone mb-3">${item.ubicacion}</h4>
                        
                        <div class="timeline-times p-2 rounded bg-light border">
                            <div class="d-flex justify-content-between mb-1">
                                <span class="text-muted small">Entrada:</span>
                                <span class="fw-bold text-dark"><i class="fas fa-sign-in-alt text-success me-1"></i>${item.hora_ingreso}</span>
                            </div>
                            <div class="d-flex justify-content-between mb-1">
                                <span class="text-muted small">Salida:</span>
                                <span class="fw-bold text-dark">
                                    ${item.hora_salida ? `<i class="fas fa-sign-out-alt text-danger me-1"></i>${item.hora_salida}` : '--:--'}
                                </span>
                            </div>
                            <div class="border-top my-1"></div>
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="text-muted small">Duración:</span>
                                <span class="badge bg-white text-dark border shadow-sm">
                                    <i class="fas fa-stopwatch me-1"></i> ${item.duracion}
                                </span>
                            </div>
                        </div>

                        ${pdfSection}

                        ${btnReactivar}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    static bindEvents(container) {
        container.querySelectorAll('.btn-reactivar-timeline').forEach(btn => {
            btn.onclick = (e) => {
                const id = e.target.closest('button').dataset.id;
                this.handleReactivar(id);
            };
        });
    }

    static async handleReactivar(ingresoId) {
        // Alerta SweetAlert para pedir hora
        const { value: nuevaHora } = await Swal.fire({
            title: 'Reactivar Jornada',
            html: `
                <p class="text-muted small">Al reactivar, la fecha de ingreso se actualizará al momento actual.</p>
                <label class="fw-bold mt-2">Nueva hora límite de salida:</label>
                <input type="time" id="swal-time-input" class="swal2-input">
            `,
            showCancelButton: true,
            confirmButtonColor: '#352460',
            confirmButtonText: 'Sí, reactivar ahora',
            preConfirm: () => {
                const val = document.getElementById('swal-time-input').value;
                if (!val) Swal.showValidationMessage('Debes seleccionar una hora');
                return val;
            }
        });

        if (nuevaHora) {
            try {
                ui.showLoading("Reactivando...");
                await api.post('/registros/api/reactivar/', {
                    ingreso_id: ingresoId,
                    nueva_hora: nuevaHora
                });
                ui.hideLoading();
                ui.showNotification("Jornada reactivada correctamente");
                
                // Cerrar panel para refrescar la tabla
                GlobalPanel.close();
                
            } catch (error) {
                ui.hideLoading();
                ui.showError(error.message);
            }
        }
    }
}
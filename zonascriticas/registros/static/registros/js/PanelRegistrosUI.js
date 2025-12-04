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
        if (!historial || historial.length === 0) {
            return '<p class="text-center text-muted p-4">No hay registros históricos para este usuario.</p>';
        }

        let html = '<div class="timeline-container">';

        historial.forEach((item, index) => {
            const isFirst = index === 0; // El más reciente
            const colorEstado = item.estado === 'En Zona' ? 'success' : 'secondary';
            
            // Botón Reactivar: Solo si está Finalizado (y quizás solo si es el último, opcional)
            let btnReactivar = '';
            if (item.estado === 'Finalizado') {
                btnReactivar = `
                    <button class="btn-reactivar-timeline" data-id="${item.id}">
                        <i class="fas fa-undo-alt"></i> Reactivar Jornada
                    </button>
                `;
            }

            // Botones PDF
            let pdfs = '<div class="timeline-docs">';
            if (item.url_descargo) {
                pdfs += `<a href="${item.url_descargo}" target="_blank" class="doc-pill doc-entry"><i class="fas fa-file-contract"></i> Descargo</a>`;
            }
            if (item.url_salida) {
                pdfs += `<a href="${item.url_salida}" target="_blank" class="doc-pill doc-exit"><i class="fas fa-file-invoice"></i> Salida</a>`;
            }
            pdfs += '</div>';

            html += `
                <div class="timeline-item ${isFirst ? 'highlight' : ''}">
                    <div class="timeline-marker ${colorEstado}"></div>
                    <div class="timeline-content">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <span class="timeline-date"><i class="far fa-calendar-alt"></i> ${item.fecha_ingreso}</span>
                            <span class="badge badge-soft-${colorEstado}">${item.estado}</span>
                        </div>
                        
                        <h4 class="timeline-zone">${item.ubicacion}</h4>
                        
                        <div class="timeline-times">
                            <div><i class="fas fa-sign-in-alt text-success"></i> ${item.hora_ingreso}</div>
                            <div><i class="fas fa-sign-out-alt text-danger"></i> ${item.hora_salida || '--:--'}</div>
                            <div class="timeline-duration"><i class="fas fa-hourglass-half"></i> ${item.duracion}</div>
                        </div>

                        ${pdfs}
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
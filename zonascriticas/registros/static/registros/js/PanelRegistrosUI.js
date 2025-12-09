import { api } from '/static/home/js/core/api.js';
import { ui } from '/static/home/js/core/ui.js';
import { GlobalPanel } from '/static/home/js/core/panel.js';

export class PanelRegistrosUI {

    static async open(usuarioId, nombreUsuario, onCloseCallback) {
        GlobalPanel.open({
            title: nombreUsuario, // Título limpio, solo el nombre
            contentHTML: '<div class="text-center p-5"><i class="fas fa-circle-notch fa-spin text-muted"></i></div>',
            onClose: onCloseCallback
        });

        try {
            const historial = await api.get(`/registros/api/historial/${usuarioId}/`);
            const html = this.renderTimeline(historial);
            const panelBody = GlobalPanel.getBodyElement();
            panelBody.innerHTML = html;
            this.bindEvents(panelBody);
        } catch (error) {
            const panelBody = GlobalPanel.getBodyElement();
            panelBody.innerHTML = `<div class="p-4 text-danger">Error: ${error.message}</div>`;
        }
    }

    static renderTimeline(historial) {
        if (!historial || historial.length === 0) {
            return `
                <div class="text-center p-5 text-muted">
                    <i class="far fa-calendar fa-2x mb-3 opacity-50"></i>
                    <p>Sin registros previos</p>
                </div>
            `;
        }

        let html = '<div class="timeline-container">';

        historial.forEach((item) => {
            const isEnZona = item.estado === 'En Zona';
            const claseEstado = isEnZona ? 'incompleto' : 'completo'; // Para el borde de color
            const markerClass = isEnZona ? 'success' : ''; // Para el punto del timeline

            // 1. Botones de Documentos (Discretos)
            let docsHtml = '';
            if (item.url_descargo || item.url_salida) {
                docsHtml = '<div class="timeline-docs d-flex gap-2">';
                if (item.url_descargo) {
                    docsHtml += `<a href="${item.url_descargo}" target="_blank" class="text-primary small text-decoration-none"><i class="fas fa-file-alt"></i> Ingreso</a>`;
                }
                if (item.url_salida) {
                    docsHtml += `<a href="${item.url_salida}" target="_blank" class="text-success small text-decoration-none ms-2"><i class="fas fa-file-invoice"></i> Salida</a>`;
                }
                docsHtml += '</div>';
            }

            // 2. Botón Reactivar
            let btnReactivar = '';
            if (!isEnZona) {
                btnReactivar = `
                    <button class="btn-reactivar-timeline" data-id="${item.id}">
                        Reactivar Jornada
                    </button>
                `;
            }

            // 3. Renderizado de Card
            html += `
                <div class="timeline-item">
                    <div class="timeline-marker ${markerClass}"></div>
                    
                    <div class="timeline-content">
                        <span class="timeline-date">${item.fecha_ingreso}</span>
                        <h4 class="timeline-zone">${item.ubicacion}</h4>
                        
                        <div class="timeline-times ${claseEstado}">
                            <div class="row-time">
                                <span class="label">Entrada</span>
                                <span class="value">${item.hora_ingreso}</span>
                            </div>
                            <div class="row-time">
                                <span class="label">Salida</span>
                                <span class="value">${item.hora_salida || '--:--'}</span>
                            </div>
                            <div class="row-time border-top pt-2 mt-2">
                                <span class="label">Tiempo Total</span>
                                <span class="value text-muted">${item.duracion}</span>
                            </div>
                            
                            ${docsHtml}
                        </div>

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
                const id = e.target.dataset.id;
                this.handleReactivar(id);
            };
        });
    }

    static async handleReactivar(ingresoId) {
        // Usamos prompt simple o tu modal preferido. Aquí mantengo lógica simple.
        const { value: nuevaHora } = await Swal.fire({
            title: 'Reactivar Acceso',
            text: 'Define la nueva hora estimada de salida',
            input: 'time',
            confirmButtonColor: '#2c3e50',
            showCancelButton: true
        });

        if (nuevaHora) {
            try {
                ui.showLoading();
                await api.post('/registros/api/reactivar/', {
                    ingreso_id: ingresoId,
                    nueva_hora: nuevaHora
                });
                ui.hideLoading();
                GlobalPanel.close(); // Cerramos para refrescar
                ui.showNotification("Jornada reactivada");
            } catch (error) {
                ui.hideLoading();
                ui.showError(error.message);
            }
        }
    }
}
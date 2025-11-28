import { api } from '/static/home/js/core/api.js';
import { ui } from '/static/home/js/core/ui.js';
import { CameraModalManager } from '/static/home/js/core/camera_ui.js';
import { GlobalPanel } from '/static/home/js/core/panel.js';
import { PanelBuilder } from './ui_panel.js';
import { imageUtils } from '/static/home/js/core/image.js'; // Importamos utilidades de imagen

// Herramientas (Si aplica)
import { InventoryPanel } from '/static/registro_herramientas/js/inventory_panel.js'; 
import * as toolsApi from '/static/registro_herramientas/js/apiService.js';

class ActivitiesController {
    constructor() {
        this.container = document.getElementById('activities-app');
        if (!this.container) return;

        // Configuración
        this.urls = {
            listar: this.container.dataset.urlListar,
            iniciar: this.container.dataset.urlIniciar,
            finalizarBase: this.container.dataset.urlFinalizarActividad, 
            salirZona: this.container.dataset.urlSalirZona
        };
        this.modalidad = this.container.dataset.modalidad;
        
        // --- LÓGICA DE RELOJ SINCRONIZADO ---
        // 1. Obtenemos los segundos restantes que nos dio el servidor (ej: 28000)
        const segundosIniciales = parseInt(this.container.dataset.segundosRestantes) || 0;
        
        // 2. Calculamos la FECHA EXACTA en el futuro donde termina el turno.
        // Date.now() nos da milisegundos, así que multiplicamos segundos * 1000
        this.endTime = new Date().getTime() + (segundosIniciales * 1000);
        
        this.timerInterval = null;

        // Estado App
        this.actividades = [];
        this.filtro = 'all';
        this.busqueda = '';
        
        // Estado Temporal para Formulario
        this.tempImageBlob = null; 

        // Módulos
        this.cameraModal = new CameraModalManager('modal-camera');
        this.grid = document.getElementById('activities-grid');
        
        // Panel Herramientas
        if (this.modalidad === 'CON_EQUIPOS') {
            this.inventoryPanel = new InventoryPanel(
                () => ui.showNotification('Catálogo actualizado', 'success'),
                (ids) => this.procesarAgregadoMasivo(ids)
            ); 
        }

        this.init();
    }

    async init() {
        this.startTimer();
        this.bindEvents();
        await this.cargarActividades(true);
    }

    // =========================================================
    // === 1. GESTIÓN DEL PANEL DE CREACIÓN (MEDIA FIRST) ======
    // =========================================================

    openCreationPanel() {
        // Limpiamos blob anterior
        this.tempImageBlob = null;

        // 1. Renderizar HTML
        const html = PanelBuilder.getCreateForm();
        GlobalPanel.open({
            title: 'Nueva Actividad',
            contentHTML: html
        });

        // 2. Bindear eventos DENTRO del panel
        const panelBody = GlobalPanel.getBodyElement();
        
        // A. Clic en el recuadro de foto -> Abrir Cámara
        const triggerCamera = panelBody.querySelector('#trigger-camera-panel');
        if (triggerCamera) {
            triggerCamera.addEventListener('click', () => this.abrirCamaraParaInicio());
        }

        // B. Clic en Guardar -> Enviar al Server
        const btnSave = panelBody.querySelector('#btn-save-activity');
        if (btnSave) {
            btnSave.addEventListener('click', () => this.intentarGuardarActividad());
        }
    }

    // Paso intermedio: Abre cámara, captura blob, y vuelve al panel
    abrirCamaraParaInicio() {
        // Ocultamos panel temporalmente (o lo dejamos atrás si el modal tiene z-index mayor)
        // Para UX limpia, cerramos el GlobalPanel visualmente un momento o superponemos el modal.
        // Dado que GlobalPanel limpia el HTML al cerrar, MEJOR NO LO CERRAMOS.
        // El Modal de cámara tiene z-index alto, se pondrá encima.
        
        this.cameraModal.open({
            onConfirm: async (data) => {
                // AQUÍ OCURRE LA MAGIA: No enviamos, solo guardamos en memoria
                this.tempImageBlob = data.blob;
                
                // Actualizamos la vista del Panel con la foto
                this.cameraModal.close();
                this.actualizarPreviewEnPanel(data.blob);
            }
        });
    }

    async actualizarPreviewEnPanel(blob) {
        const panelBody = GlobalPanel.getBodyElement();
        const imgPreview = panelBody.querySelector('#panel-img-preview');
        const placeholder = panelBody.querySelector('#panel-img-placeholder');
        const container = panelBody.querySelector('.image-upload-container');

        if (imgPreview && blob) {
            // Convertimos Blob a URL para mostrarlo
            const url = await imageUtils.toBase64(blob); // O URL.createObjectURL(blob)
            imgPreview.src = url;
            
            // Switch de visualización
            imgPreview.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';
            if (container) container.classList.add('has-image');
        }
    }

    async intentarGuardarActividad() {
        const titleInput = document.getElementById('panel-act-title');
        const obsInput = document.getElementById('panel-act-obs');
        
        const titulo = titleInput.value.trim();
        const obs = obsInput.value.trim();

        // Validaciones
        if (!this.tempImageBlob) return ui.showNotification('La foto de evidencia es obligatoria', 'warning');
        if (!titulo) return ui.showNotification('El título es obligatorio', 'warning');

        // Envío
        const formData = new FormData();
        formData.append('titulo', titulo);
        formData.append('observacion_inicial', obs);
        formData.append('foto_inicial', this.tempImageBlob, 'inicio.jpg');

        ui.showLoading('Guardando actividad...');
        try {
            await api.post(this.urls.iniciar, formData);
            
            ui.hideLoading();
            GlobalPanel.close(); // Ahora sí cerramos todo
            ui.showNotification('Actividad registrada', 'success');
            
            this.tempImageBlob = null; // Limpieza
            await this.cargarActividades();
        } catch (e) {
            ui.hideLoading();
            ui.showError(e.message);
        }
    }

    // =========================================================
    // === 2. DETALLE Y FINALIZACIÓN (Sin cambios mayores) =====
    // =========================================================

    openDetailPanel(actividad) {
        const html = PanelBuilder.getDetailView(actividad);
        GlobalPanel.open({ title: actividad.titulo, contentHTML: html });

        if (actividad.estado === 'EN_PROCESO') {
            const btn = document.getElementById('btn-panel-finalize');
            if (btn) btn.addEventListener('click', () => {
                const obs = document.getElementById('panel-act-obs-final').value;
                this.iniciarCierre(actividad.id, obs);
            });
        }
    }

    iniciarCierre(id, obsPrevia) {
        // Para el cierre sí vamos directo a cámara -> server (flujo rápido)
        // Opcional: Podrías hacer lo mismo de previsualizar, pero usualmente finalizar es rápido.
        // Mantendremos el flujo: Botón -> Cámara -> Enviar
        this.cameraModal.open({
            initialObservaciones: obsPrevia,
            onConfirm: (data) => this.enviarCierreReal(id, data)
        });
    }

    async enviarCierreReal(id, { blob, observaciones }) {
        const url = this.urls.finalizarBase.replace('0', id);
        const formData = new FormData();
        formData.append('observacion_final', observaciones);
        formData.append('foto_final', blob, 'fin.jpg');
        
        ui.showLoading('Finalizando...');
        try {
            await api.post(url, formData);
            ui.hideLoading(); 
            this.cameraModal.close();
            GlobalPanel.close();
            ui.showNotification('Actividad finalizada', 'success'); 
            await this.cargarActividades();
        } catch (e) { 
            ui.hideLoading(); 
            ui.showError(e.message); 
        }
    }

    // =========================================================
    // === 3. TIMER REAL (Sincronizado) ========================
    // =========================================================

    startTimer() {
        this.updateTimerUI(); // Ejecución inmediata
        
        // Usamos setInterval para actualizar la UI cada segundo
        this.timerInterval = setInterval(() => {
            this.updateTimerUI();
        }, 1000);
    }

    updateTimerUI() {
        // 1. Obtener tiempo actual real
        const now = new Date().getTime();
        
        // 2. Calcular diferencia contra la hora final fija (this.endTime)
        const distance = this.endTime - now;
        
        // Si el tiempo ya pasó, mostrar 0 y limpiar (o manejar tiempo negativo si prefieres)
        if (distance < 0) {
            // Opcional: clearInterval(this.timerInterval);
            this.renderTime(0);
            return;
        }

        // 3. Convertir milisegundos a segundos enteros
        const safeSeconds = Math.floor(distance / 1000);
        this.renderTime(safeSeconds);
    }

    renderTime(safeSeconds) {
        const hours = Math.floor(safeSeconds / 3600);
        const minutes = Math.floor((safeSeconds % 3600) / 60);
        const seconds = safeSeconds % 60;

        // Formato HH:MM:SS
        const display = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const textEl = document.getElementById('timer-countdown');
        const circleEl = document.getElementById('timer-circle');
        const wrapperEl = document.querySelector('.timer-wrapper');
        
        if(textEl) textEl.textContent = display;

        // Animación SVG (8 horas base)
        const totalBase = 28800; 
        const maxOffset = 283; 
        const percentage = Math.min(safeSeconds / totalBase, 1);
        const offset = maxOffset - (percentage * maxOffset);
        
        if(circleEl) {
            circleEl.style.strokeDashoffset = offset;
            
            if (safeSeconds < 900) { 
                circleEl.style.stroke = '#ff4757'; 
                if(wrapperEl) wrapperEl.classList.add('timer-critical');
            } else {
                circleEl.style.stroke = '#2ecc71'; 
                if(wrapperEl) wrapperEl.classList.remove('timer-critical');
            }
        }
    }

    // =========================================================
    // === 4. RENDERIZADO GRID (Igual que antes) ===============
    // =========================================================
    
    async cargarActividades(isFirstLoad = false) {
        try {
            const data = await api.get(this.urls.listar);
            this.actividades = data.actividades || [];
            this.render(isFirstLoad);
        } catch (e) {
            console.error(e);
        }
    }

    render(isFirstLoad = false) {
        const filtradas = this.actividades.filter(act => {
            const matchSearch = act.titulo.toLowerCase().includes(this.busqueda);
            const matchFilter = this.filtro === 'all' || (this.filtro === 'pending' && act.estado === 'EN_PROCESO');
            return matchSearch && matchFilter;
        });

        this.grid.innerHTML = '';
        if (filtradas.length === 0) {
            this.grid.innerHTML = `<div style="text-align:center; padding:40px; color:#999;">No se encontraron actividades.</div>`;
            return;
        }

        filtradas.forEach(act => {
            const card = document.createElement('div');
            card.className = `activity-card status-${act.estado}`;
            const icon = act.estado === 'EN_PROCESO' ? '<i class="fas fa-clock"></i>' : '<i class="fas fa-check-circle"></i>';
            
            card.innerHTML = `
                <div class="card-header">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div class="card-thumb" style="background-image:url('${act.foto_inicial || ''}')"></div>
                        <span class="card-title">${act.titulo}</span>
                    </div>
                    <div class="status-icon">${icon}</div>
                </div>
                <div class="card-body" style="padding-top:10px;">
                    <small style="color:#888;"><i class="fas fa-play"></i> ${act.hora_inicio}</small>
                </div>
            `;
            card.addEventListener('click', () => this.openDetailPanel(act));
            this.grid.appendChild(card);
        });
    }

    bindEvents() {
        document.getElementById('search-activity').addEventListener('input', (e) => {
            this.busqueda = e.target.value.toLowerCase();
            this.render(); 
        });
        document.querySelectorAll('.filter-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.filtro = btn.dataset.filter;
                this.render();
            });
        });
        document.getElementById('fab-add-activity').addEventListener('click', () => this.openCreationPanel());
        document.getElementById('btn-close-zone').addEventListener('click', () => this.intentarCerrarZona());
        
        const btnTools = document.getElementById('fab-tools');
        if (btnTools) btnTools.addEventListener('click', () => this.abrirPanelHerramientas());
    }

    async intentarCerrarZona() {
         const pendientes = this.actividades.filter(a => a.estado === 'EN_PROCESO').length;
         if (pendientes > 0) return ui.showError(`Tienes ${pendientes} actividades pendientes.`);
         if (!await ui.confirm('¿Finalizar Jornada?', 'Se generará el reporte.', 'Finalizar')) return;
         
         ui.showLoading();
         try {
            await api.post(this.urls.salirZona, {});
            window.location.href = '/dashboard/';
         } catch(e) { ui.showError(e.message); }
    }

    async abrirPanelHerramientas() {
        ui.showLoading();
        try {
            const data = await toolsApi.fetchInventario();
            const inv = [...(data.herramientas || []), ...(data.computo || [])];
            const ids = inv.filter(i => i.ingresado).map(i => i.id);
            ui.hideLoading();
            if(this.inventoryPanel) this.inventoryPanel.open(inv, ids);
        } catch(e) { ui.hideLoading(); ui.showError("Error inventario"); }
    }
    
    async procesarAgregadoMasivo(ids) {
        if (!ids || ids.length === 0) return;
        ui.showLoading();
        try { await toolsApi.gestionMasiva(ids, 'AGREGAR'); ui.hideLoading(); ui.showNotification('Equipos agregados', 'success'); } 
        catch (e) { ui.hideLoading(); ui.showError(e.message); }
    }
}

document.addEventListener('DOMContentLoaded', () => new ActivitiesController());
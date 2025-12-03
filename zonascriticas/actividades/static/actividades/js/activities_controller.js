import { ui } from '/static/home/js/core/ui.js';
import { CameraModalManager } from '/static/home/js/core/camera_ui.js';
import { GlobalPanel } from '/static/home/js/core/panel.js';
import { imageUtils } from '/static/home/js/core/image.js';

// UI Helper
import { ActivitiesUI } from './ui_activities.js';

// API Service
import * as activitiesApi from './apiService.js';

// Módulos opcionales (Herramientas)
import { InventoryPanel } from '/static/registro_herramientas/js/inventory_panel.js'; 
import * as toolsApi from '/static/registro_herramientas/js/apiService.js';

class ActivitiesController {
    
    constructor() {
        this.container = document.getElementById('activities-app');
        if (!this.container) return;

        // Datos iniciales desde el HTML (Data Attributes)
        this.modalidad = this.container.dataset.modalidad;
        const segundosIniciales = parseInt(this.container.dataset.segundosRestantes) || 0;
        
        // Configuración del Timer
        this.endTime = new Date().getTime() + (segundosIniciales * 1000);
        this.timerInterval = null;
        this.isExpelling = false; // Bandera para evitar loops de redirección

        // Estado local
        this.actividades = [];
        this.filtro = 'all';
        this.busqueda = '';
        this.tempImageBlob = null; 

        // Componentes UI
        this.cameraModal = new CameraModalManager('modal-camera');
        this.grid = document.getElementById('activities-grid');
        
        // Inicialización de módulos opcionales
        if (this.modalidad === 'CON_EQUIPOS') {
            this.inventoryPanel = new InventoryPanel(
                () => ui.showNotification('Catálogo actualizado', 'success'),
                (ids) => this.procesarAgregadoMasivo(ids)
            ); 
        }

        this.init();
    }

    async init() {
        // 1. Iniciar reloj visual
        this.startTimer();
        
        // 2. Eventos del DOM
        this.bindEvents();
        
        // 3. Cargar datos iniciales
        // Si el tiempo ya expiró en el servidor, esta llamada fallará (403) 
        // y api.js redirigirá automáticamente.
        await this.cargarActividades(true);
    }

    // =========================================================
    // === 1. GESTIÓN DEL TIEMPO (CRONÓMETRO SEGURO) ===========
    // =========================================================

    startTimer() {
        this.updateTimerUI();
        this.timerInterval = setInterval(() => {
            this.updateTimerUI();
        }, 1000);
    }

    updateTimerUI() {
        if (this.isExpelling) return; // Si ya nos estamos yendo, no actualizar nada

        const now = new Date().getTime();
        const distance = this.endTime - now;
        
        // CASO: TIEMPO AGOTADO (Muerte Súbita)
        if (distance <= 0) {
            clearInterval(this.timerInterval);
            this.renderTime(0); // Poner en 00:00 visualmente
            this.handleTimeExpiration(); // Iniciar protocolo de salida
            return;
        }

        const safeSeconds = Math.floor(distance / 1000);
        this.renderTime(safeSeconds);
    }

    renderTime(safeSeconds) {
        const hours = Math.floor(safeSeconds / 3600);
        const minutes = Math.floor((safeSeconds % 3600) / 60);
        const seconds = safeSeconds % 60;

        const display = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const textEl = document.getElementById('timer-countdown');
        const circleEl = document.getElementById('timer-circle');
        const wrapperEl = document.querySelector('.timer-wrapper');
        
        if(textEl) textEl.textContent = display;

        // Animación del círculo SVG
        const totalBase = 28800; // 8 horas en segundos (Referencia visual)
        const maxOffset = 283; 
        const percentage = Math.min(safeSeconds / totalBase, 1);
        const offset = maxOffset - (percentage * maxOffset);
        
        if(circleEl) {
            circleEl.style.strokeDashoffset = offset;
            
            // Colores de alerta
            if (safeSeconds < 900) { // Menos de 15 min
                circleEl.style.stroke = '#ff4757'; 
                if(wrapperEl) wrapperEl.classList.add('timer-critical');
            } else {
                circleEl.style.stroke = '#2ecc71'; 
                if(wrapperEl) wrapperEl.classList.remove('timer-critical');
            }
        }
    }

    /**
     * PROTOCOLO DE SALIDA AUTOMÁTICA
     * Se ejecuta cuando el reloj visual llega a 0.
     */
    async handleTimeExpiration() {
        if (this.isExpelling) return;
        this.isExpelling = true;

        // 1. Bloqueo Visual Inmediato
        await ui.showError(
            "El tiempo de tu jornada ha finalizado. Redirigiendo al cierre...", 
            "Tiempo Agotado"
        );

        // 2. Redirección Forzosa
        // Usamos replace para que no puedan volver atrás con el navegador
        window.location.replace('/responsabilidad/');
    }

    // =========================================================
    // === 2. GESTIÓN DEL PANEL DE CREACIÓN ====================
    // =========================================================

    openCreationPanel() {
        if (this.isExpelling) return; // Bloqueo extra

        this.tempImageBlob = null;
        const html = ActivitiesUI.getCreateForm(this.actividades);
        
        GlobalPanel.open({
            title: 'Nueva Actividad',
            contentHTML: html
        });

        const panelBody = GlobalPanel.getBodyElement();
        
        // Eventos del Panel
        const triggerCamera = panelBody.querySelector('#trigger-camera-panel');
        if (triggerCamera) triggerCamera.addEventListener('click', () => this.abrirCamaraParaInicio());

        const btnSave = panelBody.querySelector('#btn-save-activity');
        if (btnSave) btnSave.addEventListener('click', () => this.intentarGuardarActividad());

        // Eventos lista pendientes interna
        const pendingCards = panelBody.querySelectorAll('.activity-card');
        pendingCards.forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.id;
                const act = this.actividades.find(a => a.id == id);
                if (act) this.openDetailPanel(act);
            });
        });
    }

    abrirCamaraParaInicio() {
        this.cameraModal.open({
            onConfirm: async (data) => {
                this.tempImageBlob = data.blob;
                this.cameraModal.close();
                this.actualizarPreviewEnPanel(data.blob);
            }
        });
    }

    async actualizarPreviewEnPanel(blob) {
        const panelBody = GlobalPanel.getBodyElement();
        const imgPreview = panelBody.querySelector('#panel-img-preview');
        const placeholder = panelBody.querySelector('#panel-img-placeholder'); // Si existe en tu HTML
        const container = panelBody.querySelector('.image-upload-container');

        if (imgPreview && blob) {
            const url = await imageUtils.toBase64(blob);
            imgPreview.src = url;
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

        if (!this.tempImageBlob) return ui.showNotification('La foto de evidencia es obligatoria', 'warning');
        if (!titulo) return ui.showNotification('El título es obligatorio', 'warning');

        const formData = new FormData();
        formData.append('titulo', titulo);
        formData.append('observacion_inicial', obs);
        formData.append('foto_inicial', this.tempImageBlob, 'inicio.jpg');

        ui.showLoading('Guardando actividad...');
        try {
            // Si el tiempo expiró durante el llenado del form, api.js lanzará 403 y redirigirá.
            await activitiesApi.iniciarActividad(formData);
            
            ui.hideLoading();
            GlobalPanel.close();
            ui.showNotification('Actividad registrada', 'success');
            this.tempImageBlob = null;
            await this.cargarActividades();
            
        } catch (e) {
            ui.hideLoading();
            // Solo mostramos error si no es la redirección de seguridad
            if (e.message !== "Jornada finalizada por el servidor.") {
                ui.showError(e.message);
            }
        }
    }

    // =========================================================
    // === 3. DETALLE Y FINALIZACIÓN ===========================
    // =========================================================

    openDetailPanel(actividad) {
        if (this.isExpelling) return;

        const html = ActivitiesUI.getDetailView(actividad);
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
        this.cameraModal.open({
            initialObservaciones: obsPrevia,
            onConfirm: (data) => this.enviarCierreReal(id, data)
        });
    }

    async enviarCierreReal(id, { blob, observaciones }) {
        const formData = new FormData();
        formData.append('observacion_final', observaciones);
        if (blob) {
             formData.append('foto_final', blob, 'fin.jpg');
        }
        
        ui.showLoading('Finalizando...');
        try {
            await activitiesApi.finalizarActividad(id, formData);
            
            ui.hideLoading(); 
            this.cameraModal.close();
            GlobalPanel.close();
            ui.showNotification('Actividad finalizada', 'success'); 
            await this.cargarActividades();
            
        } catch (e) { 
            ui.hideLoading(); 
            if (e.message !== "Jornada finalizada por el servidor.") {
                ui.showError(e.message);
            }
        }
    }

    // =========================================================
    // === 4. RENDERIZADO GRID =================================
    // =========================================================
    
    async cargarActividades(isFirstLoad = false) {
        try {
            const data = await activitiesApi.fetchActividades();
            this.actividades = data.actividades || [];
            this.render(isFirstLoad);
        } catch (e) {
            console.error(e);
            // Si es la carga inicial y falla por tiempo, api.js redirige.
            // Si falla por otra cosa, mostramos error.
            if (!isFirstLoad && e.message !== "Jornada finalizada por el servidor.") {
                ui.showError("Error al cargar actividades");
            }
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
            const cardHTML = ActivitiesUI.createActivityCard(act);
            
            const template = document.createElement('template');
            template.innerHTML = cardHTML.trim();
            const card = template.content.firstChild;

            card.addEventListener('click', () => this.openDetailPanel(act));
            this.grid.appendChild(card);
        });
    }

    // =========================================================
    // === 5. EVENTOS GLOBALES Y HERRAMIENTAS ==================
    // =========================================================

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
        
        // Salida Voluntaria
        document.getElementById('btn-close-zone').addEventListener('click', () => this.intentarCerrarZona());
        
        const btnTools = document.getElementById('fab-tools');
        if (btnTools) btnTools.addEventListener('click', () => this.abrirPanelHerramientas());
    }

    async intentarCerrarZona() {
         const pendientes = this.actividades.filter(a => a.estado === 'EN_PROCESO').length;
         if (pendientes > 0) return ui.showError(`Tienes ${pendientes} actividades pendientes.`);
         
         if (!await ui.confirm('¿Finalizar Jornada?', 'Se generará el reporte de salida.', 'Finalizar')) return;
         
         ui.showLoading();
         try {
            // Nota: Este endpoint no debería tener el decorador de tiempo, 
            // o si lo tiene, debe permitir la salida.
            await activitiesApi.salirZona();
            window.location.href = '/dashboard/';
         } catch(e) { 
             ui.hideLoading();
             ui.showError(e.message); 
         }
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
        try { 
            await toolsApi.gestionMasiva(ids, 'AGREGAR'); 
            ui.hideLoading(); 
            ui.showNotification('Equipos agregados', 'success'); 
        } catch (e) { 
            ui.hideLoading(); 
            ui.showError(e.message); 
        }
    }
}

// Iniciar
document.addEventListener('DOMContentLoaded', () => new ActivitiesController());
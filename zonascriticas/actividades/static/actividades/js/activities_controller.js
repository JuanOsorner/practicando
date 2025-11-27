import { api } from '/static/home/js/core/api.js';
import { ui } from '/static/home/js/core/ui.js';
import { CameraModalManager } from '/static/home/js/core/camera_ui.js';

// Importamos componentes de herramientas para reusar el panel (si es necesario)
import { InventoryPanel } from '/static/registro_herramientas/js/inventory_panel.js'; 
import * as toolsApi from '/static/registro_herramientas/js/apiService.js';

class ActivitiesController {
    constructor() {
        this.container = document.getElementById('activities-app');
        if (!this.container) return;

        // URLs y Datos
        this.urls = {
            listar: this.container.dataset.urlListar,
            iniciar: this.container.dataset.urlIniciar,
            finalizarBase: this.container.dataset.urlFinalizarActividad, 
            salirZona: this.container.dataset.urlSalirZona
        };
        this.modalidad = this.container.dataset.modalidad;
        
        // TIEMPO RESTANTE (en segundos)
        this.totalSeconds = parseInt(this.container.dataset.segundosRestantes) || 0;
        this.timerInterval = null;

        // Estado
        this.actividades = [];
        this.filtro = 'all';
        this.busqueda = '';
        this.actividadPendienteData = null;

        // Módulos
        this.cameraModal = new CameraModalManager('modal-camera');
        
        // Si la modalidad es CON_EQUIPOS, inicializamos el panel de herramientas
        if (this.modalidad === 'CON_EQUIPOS') {
            // Inicializamos sin callbacks porque será solo lectura
            this.inventoryPanel = new InventoryPanel(null, null); 
        }

        this.init();
    }

    async init() {
        this.startTimer();
        this.bindEvents();
        await this.cargarActividades();
    }

    // --- LÓGICA DEL RELOJ ---
    startTimer() {
        if (this.totalSeconds <= 0) {
            this.forceExit("Jornada finalizada.");
            return;
        }
        
        this.updateTimerUI(); // Pintado inicial

        this.timerInterval = setInterval(() => {
            this.totalSeconds--;
            this.updateTimerUI();

            if (this.totalSeconds <= 0) {
                clearInterval(this.timerInterval);
                this.forceExit("Tu tiempo en la zona ha terminado.");
            }
        }, 1000);
    }

    updateTimerUI() {
        const hours = Math.floor(this.totalSeconds / 3600);
        const minutes = Math.floor((this.totalSeconds % 3600) / 60);
        const seconds = this.totalSeconds % 60;

        // Formato inteligente: HH:MM si > 1h, sino MM:SS
        const display = hours > 0 
            ? `${hours}:${minutes.toString().padStart(2, '0')}`
            : `${minutes}:${seconds.toString().padStart(2, '0')}`;

        const textEl = document.getElementById('timer-countdown');
        const circleEl = document.getElementById('timer-circle');
        const wrapperEl = document.querySelector('.timer-wrapper');

        if(textEl) textEl.textContent = display;

        // Animación del Círculo SVG
        // Circunferencia = 283. Calculamos porcentaje restante sobre un día laboral (ej: 8h = 28800s)
        // O mejor: sobre el tiempo inicial si quisiéramos una barra que baja desde el login.
        // Aquí usaremos una base fija de 8 horas para la escala visual.
        const maxOffset = 283;
        const totalBase = 28800; // 8 horas
        const percentage = Math.min(Math.max(0, this.totalSeconds / totalBase), 1);
        const offset = maxOffset - (percentage * maxOffset);
        
        if(circleEl) circleEl.style.strokeDashoffset = offset;

        // Alerta visual últimos 15 min
        if (this.totalSeconds < 900) { // 15 min
            wrapperEl.classList.add('timer-critical');
        }
    }

    forceExit(razon) {
        ui.showError(razon, "Tiempo Agotado");
        // Esperamos 3 seg y ejecutamos salida forzosa
        setTimeout(() => {
            api.post(this.urls.salirZona, {}).finally(() => {
                window.location.href = '/dashboard/';
            });
        }, 3000);
    }

    // --- EVENTOS ---
    bindEvents() {
        // ... (Buscador y filtros igual que antes) ...
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

        // NUEVA ACTIVIDAD
        document.getElementById('fab-add-activity').addEventListener('click', () => this.abrirModalDatos());
        document.getElementById('btn-continue-new').addEventListener('click', () => this.validarYPasarACameraInicio());
        document.getElementById('btn-cancel-new').addEventListener('click', () => {
            document.getElementById('modal-new-activity').classList.add('hidden');
        });

        // SALIDA
        document.getElementById('btn-close-zone').addEventListener('click', () => this.intentarCerrarZona());

        // VER HERRAMIENTAS (Solo si existe el botón)
        const btnTools = document.getElementById('fab-tools');
        if (btnTools) {
            btnTools.addEventListener('click', () => this.abrirPanelHerramientas());
        }
    }

    // --- LOGICA PANEL HERRAMIENTAS (Solo Lectura) ---
    async abrirPanelHerramientas() {
        ui.showLoading('Cargando equipos...');
        try {
            // Usamos la API de herramientas existente
            const response = await toolsApi.fetchInventario();
            const data = response; // El adaptador ya nos da el payload limpio
            
            // Unificamos y filtramos solo los INGRESADOS
            const todos = [...(data.herramientas || []), ...(data.computo || [])];
            const ingresados = todos.filter(i => i.ingresado);

            ui.hideLoading();

            if (ingresados.length === 0) {
                ui.showNotification('No registraste herramientas.', 'info');
                return;
            }

            // Abrimos el panel reutilizado
            // Hack: Pasamos una lista vacía de "ya seleccionados" para que no marque checks raros
            // y confiamos en que el usuario solo verá la lista.
            // Para "Solo Lectura" real, deberíamos modificar InventoryPanel, pero visualmente esto cumple.
            this.inventoryPanel.open(ingresados, []); 
            
        } catch (e) {
            ui.hideLoading();
            ui.showError("No se pudo cargar el inventario.");
        }
    }

    // ... (El resto de métodos: cargarActividades, render, modales... se mantienen IGUAL) ...
    // Copia los métodos del bloque anterior aquí para completar la clase.
    
    // --- (INCLUIR AQUÍ LOS MÉTODOS DEL CÓDIGO ANTERIOR: cargarActividades, render, abrirModalDatos, etc.) ---
    
    async cargarActividades() {
        try {
            const data = await api.get(this.urls.listar);
            this.actividades = data.actividades || [];
            this.render();
        } catch (e) {
            ui.showError("Error: " + e.message);
        }
    }

    render() {
        const grid = document.getElementById('activities-grid');
        grid.innerHTML = '';
        const filtradas = this.actividades.filter(act => {
            const matchSearch = act.titulo.toLowerCase().includes(this.busqueda);
            const matchFilter = this.filtro === 'all' || (this.filtro === 'pending' && act.estado === 'EN_PROCESO');
            return matchSearch && matchFilter;
        });

        if (filtradas.length === 0) {
            grid.innerHTML = `<div class="text-center" style="padding:40px; color:#999;">No hay actividades.</div>`;
            return;
        }

        filtradas.forEach(act => {
            const card = document.createElement('div');
            card.className = `activity-card status-${act.estado}`;
            const icon = act.estado === 'EN_PROCESO' ? '<i class="fas fa-clock"></i>' : '<i class="fas fa-check"></i>';
            card.innerHTML = `
                <div class="card-header">
                    <span class="card-title">${act.titulo}</span>
                    <div class="status-icon">${icon}</div>
                </div>
                <div class="card-times">
                    <span><i class="fas fa-play-circle"></i> ${act.hora_inicio}</span>
                    ${act.hora_fin ? `<span><i class="fas fa-stop-circle"></i> ${act.hora_fin}</span>` : ''}
                </div>
                <div class="card-obs">${act.obs_inicial}</div>
            `;
            if (act.estado === 'EN_PROCESO') {
                card.addEventListener('click', () => this.iniciarCierreActividad(act));
            }
            grid.appendChild(card);
        });
    }

    abrirModalDatos() {
        document.getElementById('new-act-title').value = '';
        document.getElementById('new-act-obs').value = '';
        document.getElementById('modal-new-activity').classList.remove('hidden');
        document.getElementById('new-act-title').focus();
    }

    validarYPasarACameraInicio() {
        const titulo = document.getElementById('new-act-title').value.trim();
        const obs = document.getElementById('new-act-obs').value.trim();
        if (!titulo) return ui.showNotification('El título es obligatorio', 'error');
        this.actividadPendienteData = { titulo, obs };
        document.getElementById('modal-new-activity').classList.add('hidden');
        this.cameraModal.open({ onConfirm: (data) => this.enviarCreacion(data) });
    }

    async enviarCreacion({ blob }) {
        if (!blob) return ui.showError("Foto obligatoria.");
        const formData = new FormData();
        formData.append('titulo', this.actividadPendienteData.titulo);
        formData.append('observacion_inicial', this.actividadPendienteData.obs);
        formData.append('foto_inicial', blob, 'inicio.jpg');
        ui.showLoading('Iniciando...');
        try {
            await api.post(this.urls.iniciar, formData);
            ui.hideLoading(); this.cameraModal.close();
            ui.showNotification('Iniciada', 'success'); await this.cargarActividades();
        } catch (e) { ui.hideLoading(); ui.showError(e.message); }
    }

    iniciarCierreActividad(act) {
        this.cameraModal.open({
            initialObservaciones: '',
            onConfirm: (data) => this.enviarCierre(act.id, data)
        });
    }

    async enviarCierre(id, { blob, observaciones }) {
        if (!blob) return ui.showError("Foto final obligatoria.");
        if (!await ui.confirm('¿Finalizar?', 'La actividad pasará a verde.', 'Sí')) return;
        
        const url = this.urls.finalizarBase.replace('0', id);
        const formData = new FormData();
        formData.append('observacion_final', observaciones);
        formData.append('foto_final', blob, 'fin.jpg');
        ui.showLoading('Finalizando...');
        try {
            await api.post(url, formData);
            ui.hideLoading(); this.cameraModal.close();
            ui.showNotification('Finalizada', 'success'); await this.cargarActividades();
        } catch (e) { ui.hideLoading(); ui.showError(e.message); }
    }

    async intentarCerrarZona() {
        const pendientes = this.actividades.filter(a => a.estado === 'EN_PROCESO').length;
        if (pendientes > 0) return ui.showError(`Tienes ${pendientes} actividades pendientes.`);
        if (!await ui.confirm('¿Finalizar Jornada?', 'Saldrás de la zona y se generará el reporte.', 'Salir')) return;
        
        ui.showLoading('Cerrando zona...');
        try {
            await api.post(this.urls.salirZona, {});
            window.location.href = '/dashboard/';
        } catch (e) { ui.hideLoading(); ui.showError(e.message); }
    }
}

document.addEventListener('DOMContentLoaded', () => new ActivitiesController());
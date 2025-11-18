/*
 * descargo_responsabilidad/static/descargo_responsabilidad/js/form_controller.js
 *
 * SOLUCIÓN ROBUSTA: Corrige la "Race Condition"
 */

// --- 1. Importaciones de Módulos ---
import { api } from '/static/home/js/core/api.js';
import { ui } from '/static/home/js/core/ui.js';
import { CanvasManager } from './canvas.js';
import { QRScanner } from './scanner.js';

// --- 2. Clase del Controlador ---
class DescargoFormController {

    constructor(container) {
        if (!container) {
            console.error("Controlador no pudo iniciarse: Contenedor no encontrado.");
            return;
        }
        this.container = container;
        
        this.urls = {
            buscarUsuario: container.dataset.urlBuscarUsuario,
            buscarZona: container.dataset.urlBuscarZona,
            procesarIngreso: container.dataset.urlProcesarIngreso,
            dashboard: container.dataset.urlDashboard
        };

        this.estado = {
            responsable: null,
            zona: null,
        };

        this.elementos = {
            checkDescargo: document.getElementById('check-acepta-descargo'),
            checkPoliticas: document.getElementById('check-acepta-politicas'),
            seccionFirmas: document.getElementById('seccion-firma-y-boton'),
            respContainer: document.getElementById('responsable-cedula-container'),
            respPlaceholder: document.getElementById('responsable-cedula-placeholder'),
            respInput: document.getElementById('responsable-cedula-input'),
            respNombre: document.getElementById('responsable-nombre'),
            respCargo: document.getElementById('responsable-cargo'),
            zonaTrigger: document.getElementById('scan-trigger-zona'),
            zonaCiudad: document.getElementById('qr-ciudad'),
            btnSiguiente: document.getElementById('btn-siguiente'),
            spinner: document.getElementById('loading-spinner')
        };
        
        // --- INICIO DE CAMBIOS ---
        // Bandera de estado para evitar inicializaciones múltiples
        this.firmasInicializadas = false;
        // --- FIN DE CAMBIOS ---
        
        // Instanciamos los módulos
        this.scanner = new QRScanner('scan-trigger-zona');
        this.canvasVisitante = new CanvasManager('firma-visitante-canvas');
        this.canvasResponsable = new CanvasManager('firma-responsable-canvas');
    }

    init() {
        this.elementos.checkDescargo.addEventListener('change', () => this.onCheckboxChange());
        this.elementos.checkPoliticas.addEventListener('change', () => this.onCheckboxChange());
        this.elementos.respContainer.addEventListener('click', () => this.activarModoEdicionResponsable());
        this.elementos.respInput.addEventListener('blur', () => this.onBuscarResponsable());
        this.elementos.respInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.elementos.respInput.blur();
        });
        this.elementos.btnSiguiente.addEventListener('click', () => this.onSubmit());
        window.addEventListener('qrCodeScanned', (e) => this.onZonaEscaneada(e.detail.codigo));
        
        // --- INICIO DE CAMBIOS ---
        // Escuchamos el fin de la transición CSS
        this.elementos.seccionFirmas.addEventListener('transitionend', (e) => {
            // Nos aseguramos que la transición sea la del max-height
            if (e.propertyName === 'max-height') {
                this.onSeccionFirmasVisible();
            }
        });
        // --- FIN DE CAMBIOS ---

        this.onCheckboxChange(); // Llamada inicial
    }

    // --- 3. Lógica de Eventos ---

    /**
     * (MODIFICADO)
     * Ahora solo se encarga de cambiar la visibilidad.
     * La inicialización se delega a 'onSeccionFirmasVisible'.
     */
    onCheckboxChange() {
        const ambosAceptados = this.elementos.checkDescargo.checked && this.elementos.checkPoliticas.checked;

        // 1. Inicia la animación del CSS
        this.elementos.seccionFirmas.classList.toggle('visible', ambosAceptados);
        
        // 2. Si se van a MOSTRAR...
        if (ambosAceptados && !this.firmasInicializadas) {
            // Añadimos un fallback por si 'transitionend' no se dispara
            // (ej. transiciones deshabilitadas o CSS no cargado).
            // 550ms es > que la transición de 0.5s (500ms).
            setTimeout(() => this.onSeccionFirmasVisible(), 550);
        }
    }

    /**
     * (NUEVO MÉTODO)
     * Se llama CUANDO la transición CSS ha terminado (o en el fallback).
     * Ahora es seguro leer clientWidth.
     */
    onSeccionFirmasVisible() {
        // Verificamos que esté visible y que no lo hayamos hecho ya
        if (this.firmasInicializadas || !this.elementos.seccionFirmas.classList.contains('visible')) {
            return;
        }

        // ¡Solo se ejecuta UNA VEZ!
        this.firmasInicializadas = true; 

        // Ahora que el layout es estable, preparamos los canvas.
        this.canvasVisitante.prepararCanvas();
        this.canvasResponsable.prepararCanvas();
    }

    // ... (El resto de métodos: activarModoEdicionResponsable, onBuscarResponsable, 
    // ... onZonaEscaneada, onSubmit, preguntarIngreso, redirigir, mostrarSpinner)
    // ... (NO REQUIEREN CAMBIOS) ...

    activarModoEdicionResponsable() {
        this.elementos.respPlaceholder.classList.add('oculto');
        this.elementos.respInput.classList.remove('oculto');
        this.elementos.respInput.focus();
    }

    desactivarModoEdicionResponsable() {
        this.elementos.respInput.classList.add('oculto');
        this.elementos.respPlaceholder.classList.remove('oculto');
    }

    async onBuscarResponsable() {
        const documento = this.elementos.respInput.value.trim();
        if (!documento) {
            this.desactivarModoEdicionResponsable();
            return;
        }

        ui.showLoading('Buscando responsable...');
        try {
            const data = await api.get(`${this.urls.buscarUsuario}?documento=${documento}`);
            this.estado.responsable = data;
            
            this.elementos.respNombre.textContent = data.nombre;
            this.elementos.respCargo.textContent = data.cargo;
            this.elementos.respPlaceholder.textContent = data.numero_documento;
            
            ui.hideLoading();
        } catch (error) {
            this.estado.responsable = null;
            this.elementos.respNombre.textContent = '[Esperando responsable...]';
            this.elementos.respCargo.textContent = '[Esperando responsable...]';
            this.elementos.respPlaceholder.innerHTML = '[Haga clic aquí para ingresar la cédula] <i class="fas fa-pencil-alt fa-xs"></i>';
            this.elementos.respInput.value = '';
            ui.showError(error.message || 'Responsable no encontrado');
        } finally {
            this.desactivarModoEdicionResponsable();
        }
    }

    async onZonaEscaneada(codigo) {
        ui.showLoading('Validando zona...');
        try {
            const data = await api.get(`${this.urls.buscarZona}?codigo=${codigo}`);
            this.estado.zona = data;
            this.elementos.zonaTrigger.textContent = data.nombre;
            this.elementos.zonaCiudad.textContent = data.ciudad;
            this.elementos.zonaTrigger.classList.remove('elemento-pulsante');
            ui.hideLoading();
            ui.showNotification('Zona validada con éxito', 'success');
        } catch (error) {
            this.estado.zona = null;
            this.elementos.zonaTrigger.textContent = '[Toque aquí para escanear la zona]';
            this.elementos.zonaCiudad.textContent = '[Ciudad por definir]';
            this.elementos.zonaTrigger.classList.add('elemento-pulsante');
            ui.showError(error.message || 'Código QR no válido');
        }
    }

    async onSubmit() {
        
        if (!this.estado.zona) {
            return ui.showError('Debes escanear una zona válida antes de continuar.', 'Dato Faltante');
        }
        if (!this.estado.responsable) {
            return ui.showError('Debes ingresar un responsable válido antes de continuar.', 'Dato Faltante');
        }
        if (this.canvasVisitante.isEmpty()) {
            return ui.showError('La firma del visitante es obligatoria.', 'Dato Faltante');
        }
        if (this.canvasResponsable.isEmpty()) {
            return ui.showError('La firma del responsable es obligatoria.', 'Dato Faltante');
        }

        const decision = await this.preguntarIngreso();
        
        if (decision === 'cancel') {
            return;
        }

        const ingresaEquiposValor = (decision === 'equipos') ? 'SI' : 'NO';

        const payload = {
            idResponsable: this.estado.responsable.id,
            nombreZona: this.estado.zona.nombre,
            ciudadZona: this.estado.zona.ciudad,
            aceptaDescargo: this.elementos.checkDescargo.checked,
            aceptaPoliticas: this.elementos.checkPoliticas.checked,
            ingresaEquipos: ingresaEquiposValor,
            firmaVisitante: this.canvasVisitante.toDataURL(),
            firmaResponsable: this.canvasResponsable.toDataURL()
        };

        this.mostrarSpinner(true);
        
        try {
            await api.post(this.urls.procesarIngreso, payload);
            
            await Swal.fire({
                title: '¡Registro Exitoso!',
                text: 'Tu descargo de responsabilidad ha sido guardado y enviado a tu correo.',
                icon: 'success',
                confirmButtonText: 'Entendido'
            });

            this.redirigir(decision);

        } catch (error) {
            ui.showError(error.message || 'No se pudo guardar el registro.', 'Error del Servidor');
            this.mostrarSpinner(false);
        }
    }

    async preguntarIngreso() {
        const resultado = await Swal.fire({
            title: 'Finalizando Registro',
            text: '¿Cuál es el propósito de tu ingreso?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-tools"></i> Ingreso Equipos',
            confirmButtonColor: '#352460',
            showDenyButton: true,
            denyButtonText: '<i class="fas fa-clipboard-list"></i> Registro Actividades',
            denyButtonColor: '#6c757d',
            cancelButtonText: '<i class="fas fa-user-clock"></i> Solo Visita'
        });

        if (resultado.isConfirmed) {
            return 'equipos';
        } else if (resultado.isDenied) {
            return 'actividades';
        } else {
            if (resultado.dismiss === Swal.DismissReason.cancel) {
                return 'visita';
            }
            return 'cancel';
        }
    }

    redirigir(decision) {
        ui.showLoading('Redirigiendo...');
        
        if (decision === 'equipos') {
            window.location.href = this.urls.dashboard; 
        } else if (decision === 'actividades') {
            window.location.href = this.urls.dashboard;
        } else {
            window.location.href = this.urls.dashboard;
        }
    }
    
    mostrarSpinner(mostrar) {
        this.elementos.spinner.classList.toggle('oculto', !mostrar);
        this.elementos.btnSiguiente.style.display = mostrar ? 'none' : 'block';
    }
}

// --- 4. Punto de Entrada ---
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('descargo-form-container');
    if (container) {
        const controller = new DescargoFormController(container);
        controller.init();
    }
});
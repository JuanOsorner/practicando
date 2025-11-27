/*
 * form_controller.js
 * * Controlador principal del formulario de Descargo de Responsabilidad.
 * Orquesta la interacción entre el Escáner QR, los Canvas de Firma y la API de Django.
 * * ACTUALIZACIÓN FASE 2: Ahora envía IDs relacionales (idZona) en lugar de texto plano.
 */

// --- 1. Importaciones de Módulos ---
import { api } from '/static/home/js/core/api.js';
import { ui } from '/static/home/js/core/ui.js';
import { CanvasManager } from './canvas.js';
import { QRScanner } from './scanner.js';

// --- 2. Clase del Controlador ---
class DescargoFormController {

    constructor(container) {
        // Validación defensiva: Si el HTML no cargó bien, detenemos todo.
        if (!container) {
            console.error("Controlador no pudo iniciarse: Contenedor no encontrado.");
            return;
        }
        this.container = container;
        
        // Mapeo de URLs desde los data-attributes del HTML (Desacoplamiento)
        this.urls = {
            buscarUsuario: container.dataset.urlBuscarUsuario,
            buscarZona: container.dataset.urlBuscarZona,
            procesarIngreso: container.dataset.urlProcesarIngreso,
            dashboard: container.dataset.urlDashboard
        };

        // Estado interno de la aplicación
        this.estado = {
            responsable: null, // Objeto completo del usuario responsable (incluye ID)
            zona: null,        // Objeto completo de la zona (incluye ID, nombre, ciudad)
        };

        // Cache de elementos del DOM para no buscarlos repetidamente
        this.elementos = {
            checkDescargo: document.getElementById('check-acepta-descargo'),
            checkPoliticas: document.getElementById('check-acepta-politicas'),
            seccionFirmas: document.getElementById('seccion-firma-y-boton'),
            
            // Elementos del Responsable
            respContainer: document.getElementById('responsable-cedula-container'),
            respPlaceholder: document.getElementById('responsable-cedula-placeholder'),
            respInput: document.getElementById('responsable-cedula-input'),
            respNombre: document.getElementById('responsable-nombre'),
            respCargo: document.getElementById('responsable-cargo'),
            
            // Elementos de la Zona
            zonaTrigger: document.getElementById('scan-trigger-zona'),
            zonaCiudad: document.getElementById('qr-ciudad'),
            
            // Acciones
            btnSiguiente: document.getElementById('btn-siguiente'),
            spinner: document.getElementById('loading-spinner')
        };
        
        // Bandera para evitar reinicializar los canvas múltiples veces
        this.firmasInicializadas = false;
        
        // Instanciamos los submódulos
        this.scanner = new QRScanner('scan-trigger-zona');
        this.canvasVisitante = new CanvasManager('firma-visitante-canvas');
        this.canvasResponsable = new CanvasManager('firma-responsable-canvas');
    }

    /**
     * Punto de arranque. Asigna todos los Event Listeners.
     */
    init() {
        // 1. Escuchar cambios en los checkboxes para mostrar/ocultar firmas
        this.elementos.checkDescargo.addEventListener('change', () => this.onCheckboxChange());
        this.elementos.checkPoliticas.addEventListener('change', () => this.onCheckboxChange());

        // 2. Lógica de búsqueda de responsable (UI Interactiva)
        this.elementos.respContainer.addEventListener('click', () => this.activarModoEdicionResponsable());
        this.elementos.respInput.addEventListener('blur', () => this.onBuscarResponsable());
        this.elementos.respInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.elementos.respInput.blur();
        });

        // 3. Envío del formulario
        this.elementos.btnSiguiente.addEventListener('click', () => this.onSubmit());

        // 4. Escuchar evento global del Scanner (Desacoplado)
        window.addEventListener('qrCodeScanned', (e) => this.onZonaEscaneada(e.detail.codigo));
        
        // 5. Lógica de "Race Condition" para los Canvas (Esperar transición CSS)
        this.elementos.seccionFirmas.addEventListener('transitionend', (e) => {
            // Solo reaccionamos si lo que cambió de tamaño fue la altura (max-height)
            if (e.propertyName === 'max-height') {
                this.onSeccionFirmasVisible();
            }
        });

        // Llamada inicial para asegurar estado correcto al cargar la página
        this.onCheckboxChange(); 
    }

    // --- 3. Lógica de Eventos de Interfaz ---

    /**
     * Gestiona la visibilidad de la sección de firmas.
     * No inicializa los canvas directamente para evitar que se vean borrosos (tamaño 0).
     */
    onCheckboxChange() {
        const ambosAceptados = this.elementos.checkDescargo.checked && this.elementos.checkPoliticas.checked;

        // Toggle clase CSS para iniciar la animación
        this.elementos.seccionFirmas.classList.toggle('visible', ambosAceptados);
        
        // Fallback de seguridad: Si la transición CSS falla o el navegador es lento,
        // forzamos la inicialización después de 550ms.
        if (ambosAceptados && !this.firmasInicializadas) {
            setTimeout(() => this.onSeccionFirmasVisible(), 550);
        }
    }

    /**
     * Se ejecuta cuando la sección de firmas ya está completamente desplegada.
     * Aquí es seguro calcular el ancho de los canvas.
     */
    onSeccionFirmasVisible() {
        // Guard clause: Si ya inicializamos o la sección se ocultó, no hacemos nada.
        if (this.firmasInicializadas || !this.elementos.seccionFirmas.classList.contains('visible')) {
            return;
        }

        this.firmasInicializadas = true; 

        // Preparamos los canvas con las dimensiones correctas
        this.canvasVisitante.prepararCanvas();
        this.canvasResponsable.prepararCanvas();
    }

    // --- 4. Lógica de Negocio: Responsable ---

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
        
        // Si borró el número, cancelamos edición
        if (!documento) {
            this.desactivarModoEdicionResponsable();
            return;
        }

        ui.showLoading('Buscando responsable...');
        
        try {
            const data = await api.get(`${this.urls.buscarUsuario}?documento=${documento}`);
            
            // Guardamos el objeto completo (incluyendo ID) en el estado
            this.estado.responsable = data;
            
            // Actualizamos UI
            this.elementos.respNombre.textContent = data.nombre;
            this.elementos.respCargo.textContent = data.cargo;
            this.elementos.respPlaceholder.textContent = data.numero_documento;
            
            ui.hideLoading();
        } catch (error) {
            // Reset en caso de error
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

    // --- 5. Lógica de Negocio: Escaneo de Zona ---

    async onZonaEscaneada(codigo) {
        ui.showLoading('Validando zona...');
        try {
            // Consultamos a la API (que ahora busca en la DB local Ubicacion)
            const data = await api.get(`${this.urls.buscarZona}?codigo=${codigo}`);
            
            // IMPORTANTE: 'data' contiene { id, nombre, ciudad, descripcion }
            this.estado.zona = data;
            
            // Actualizamos UI
            this.elementos.zonaTrigger.textContent = data.nombre;
            this.elementos.zonaCiudad.textContent = data.ciudad;
            this.elementos.zonaTrigger.classList.remove('elemento-pulsante'); // Dejamos de pulsar
            
            ui.hideLoading();
            ui.showNotification('Zona validada con éxito', 'success');
        } catch (error) {
            this.estado.zona = null;
            this.elementos.zonaTrigger.textContent = '[Toque aquí para escanear la zona]';
            this.elementos.zonaCiudad.textContent = '[Ciudad por definir]';
            this.elementos.zonaTrigger.classList.add('elemento-pulsante');
            
            ui.showError(error.message || 'Código QR no válido o zona inactiva');
        }
    }

    // --- 6. Lógica de Envío (Submit) ---

    async onSubmit() {
        
        // A. Validaciones Previas
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

        // B. Preguntar Propósito
        const decision = await this.preguntarIngreso(); // Retorna: 'equipos', 'actividades', 'visita' o 'cancel'
        
        if (decision === 'cancel') return;

        // --- CORRECCIÓN CRÍTICA: Mapeo a Modalidad ---
        let modalidadEnvio = 'VISITA';
        if (decision === 'equipos') modalidadEnvio = 'CON_EQUIPOS';
        else if (decision === 'actividades') modalidadEnvio = 'SOLO_ACTIVIDADES';

        // C. Construcción del Payload Actualizado
        const payload = {
            idResponsable: this.estado.responsable.id,
            idZona: this.estado.zona.id,
            aceptaDescargo: this.elementos.checkDescargo.checked,
            aceptaPoliticas: this.elementos.checkPoliticas.checked,
            
            // Enviamos el campo nuevo que espera el backend
            modalidad: modalidadEnvio, 
            
            firmaVisitante: this.canvasVisitante.toDataURL(),
            firmaResponsable: this.canvasResponsable.toDataURL()
        };

        // D. Envío
        this.mostrarSpinner(true);
        try {
            await api.post(this.urls.procesarIngreso, payload);
            
            await Swal.fire({
                title: '¡Registro Exitoso!',
                text: 'Descargo guardado. Procediendo...',
                icon: 'success',
                confirmButtonColor: '#352460'
            });

            // Redirección directa controlada por el frontend
            if (decision === 'equipos') {
                window.location.href = '/herramientas/'; // Va a registrar equipos
            } else if (decision === 'actividades') {
                window.location.href = '/actividades/';  // Va directo a bitácora
            } else {
                window.location.href = this.urls.dashboard; // Visita simple
            }

        } catch (error) {
            ui.showError(error.message);
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
            // Si el usuario hace clic en "Solo Visita" (Botón cancelar)
            if (resultado.dismiss === Swal.DismissReason.cancel) {
                return 'visita';
            }
            // Si hace clic fuera del modal o ESC
            return 'cancel';
        }
    }

    /**
     * Enrutador simple basado en la decisión del usuario.
     * NOTA: En fases futuras, aquí cambiaremos las URLs de destino.
     */
    redirigir(decision) {
        ui.showLoading('Redirigiendo...');
        
        // Por ahora todos van al dashboard, pero la lógica está lista para separar caminos.
        if (decision === 'equipos') {
            window.location.href = this.urls.dashboard; 
        } else if (decision === 'actividades') {
            window.location.href = this.urls.dashboard;
        } else {
            // Visita simple
            window.location.href = this.urls.dashboard;
        }
    }
    
    mostrarSpinner(mostrar) {
        this.elementos.spinner.classList.toggle('oculto', !mostrar);
        // Ocultamos el botón para evitar doble envío
        this.elementos.btnSiguiente.style.display = mostrar ? 'none' : 'block';
    }
}

// --- 7. Punto de Entrada ---
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('descargo-form-container');
    if (container) {
        const controller = new DescargoFormController(container);
        controller.init();
    }
});
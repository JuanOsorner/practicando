/*
 * descargo_responsabilidad/static/descargo_responsabilidad/js/canvas.js
 */

// Asumimos que SignaturePad se carga globalmente
const SignaturePad = window.SignaturePad;

export class CanvasManager {
    
    constructor(canvasId) {
        // 1. Referencias al Canvas Principal (Vista Previa/Trigger)
        this.canvasEl = document.getElementById(canvasId);
        this.clearButton = document.querySelector(`[data-canvas-id="${canvasId}"]`);
        
        if (!this.canvasEl) {
            console.error(`CanvasManager: Canvas #${canvasId} no encontrado.`);
            return;
        }

        // 2. Referencias al Modal (Editor Real en Móvil)
        this.modal = document.getElementById('modal-firma');
        this.modalCanvas = document.getElementById('modal-canvas-firma');
        this.modalPad = null; // La instancia se creará dinámicamente
        this.modalGuardarBtn = document.getElementById('modal-btn-guardar');
        this.modalLimpiarBtn = document.getElementById('modal-btn-limpiar');

        // 3. Detección de Táctil
        this.isTactil = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

        // 4. Configuración de Eventos
        if (this.isTactil) {
            // En móvil, el canvas principal es solo un BOTÓN para abrir el modal
            // Usamos 'click' (o touchstart si la respuesta es lenta)
            this.canvasEl.addEventListener('click', (e) => {
                e.preventDefault(); 
                this.abrirModal();
            });
            
            // Opcional: feedback visual al tocar
            this.canvasEl.style.cursor = "pointer";
        }

        // Botón de borrar (del canvas principal)
        if (this.clearButton) {
            this.clearButton.addEventListener('click', (e) => {
                e.stopPropagation(); 
                this.limpiar();
            });
        }
    }

    /**
     * Se llama desde el controller cuando la sección se hace visible.
     * Configura el canvas principal.
     */
    prepararCanvas() {
        // Dimensionamos el canvas principal para que no se vea borroso
        const wrapper = this.canvasEl.parentElement;
        if (wrapper && wrapper.clientWidth > 0) {
            this.canvasEl.width = wrapper.clientWidth;
            this.canvasEl.height = 160; // Coincide con tu CSS .firma-canvas
        }

        // En Desktop, inicializamos el Pad directamente aquí.
        // En Móvil, NO inicializamos aquí, usamos el modal.
        if (!this.isTactil) {
            if (this.pad) this.pad.clear();
            else {
                this.pad = new SignaturePad(this.canvasEl, {
                    backgroundColor: 'rgba(255, 255, 255, 0)',
                    penColor: 'rgb(0, 0, 0)'
                });
            }
        }
    }

    /**
     * Lógica crítica para el Modal
     */
    abrirModal() {
        if (!this.modal || !this.modalCanvas) return;

        // A. Mostrar el modal PRIMERO (quita display: none)
        this.modal.classList.remove('oculto');

        // B. Calcular dimensiones REALES ahora que es visible
        // Tu CSS define .modal-canvas-wrapper { height: 40vh; }
        const wrapper = this.modalCanvas.parentElement;
        const rect = wrapper.getBoundingClientRect();

        // C. Asignar tamaño al mapa de bits del canvas
        this.modalCanvas.width = rect.width;
        this.modalCanvas.height = rect.height;

        // D. Inicializar SignaturePad (o reinicializar)
        // Si ya existía, lo destruimos para reciclar y evitar conflictos de tamaño
        if (this.modalPad) {
            this.modalPad.off();
        }

        this.modalPad = new SignaturePad(this.modalCanvas, {
            minWidth: 1, // Ajuste fino para firma de dedo
            maxWidth: 3,
            penColor: 'rgb(0, 0, 0)',
            backgroundColor: 'rgb(255, 255, 255)' // Fondo blanco explícito
        });

        // E. Asignar eventos a los botones del modal
        // Usamos .onclick para no acumular event listeners si se abre/cierra varias veces
        this.modalLimpiarBtn.onclick = () => this.modalPad.clear();
        this.modalGuardarBtn.onclick = () => this.guardarFirmaModal();
    }

    guardarFirmaModal() {
        if (!this.modalPad || this.modalPad.isEmpty()) {
            // Usamos alert nativo o tu ui.showError si tienes acceso (aquí simple alert para no romper)
            alert("Por favor, firme antes de guardar.");
            return;
        }

        // 1. Obtener imagen del modal
        const dataURL = this.modalPad.toDataURL();

        // 2. Pintarla en el Canvas Principal (Preview)
        const ctx = this.canvasEl.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            // Limpiamos el preview
            ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
            // Dibujamos la imagen escalada al tamaño del preview
            ctx.drawImage(img, 0, 0, this.canvasEl.width, this.canvasEl.height);
            
            // Cerramos modal
            this.cerrarModal();
        };
        img.src = dataURL;
    }

    cerrarModal() {
        if (this.modal) this.modal.classList.add('oculto');
        // Limpiamos memoria del pad del modal
        if (this.modalPad) {
            this.modalPad.off();
            this.modalPad = null;
        }
    }

    limpiar() {
        // Limpia el preview (y el pad desktop si existe)
        const ctx = this.canvasEl.getContext('2d');
        ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
        
        if (this.pad) {
            this.pad.clear();
        }
        
        // Nota: Al limpiar el preview en móvil, visualmente se borra, 
        // y isEmpty() validará correctamente los píxeles transparentes.
    }

    isEmpty() {
        // Verificación agnóstica (funciona para Móvil y Desktop)
        // Revisa si el canvas principal tiene píxeles pintados
        const ctx = this.canvasEl.getContext('2d');
        const pixelBuffer = new Uint32Array(
            ctx.getImageData(0, 0, this.canvasEl.width, this.canvasEl.height).data.buffer
        );
        
        // Devuelve true si todos los píxeles son transparentes (0)
        return !pixelBuffer.some(color => color !== 0);
    }

    toDataURL() {
        if (this.isEmpty()) return null;
        return this.canvasEl.toDataURL('image/png');
    }
}
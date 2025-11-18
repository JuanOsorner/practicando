/*
 * descargo_responsabilidad/static/descargo_responsabilidad/js/canvas.js
 * Módulo de Lógica de Firma (SignaturePad Abstraction)
 *
 * SOLUCIÓN ROBUSTA: Corrige la "Race Condition"
 */

// Asumimos que SignaturePad se carga globalmente desde home.html
const SignaturePad = window.SignaturePad;

export class CanvasManager {
    
    constructor(canvasId) {
        this.canvasEl = document.getElementById(canvasId);
        this.clearButton = document.querySelector(`[data-canvas-id="${canvasId}"]`);
        
        if (!this.canvasEl) {
            console.error(`CanvasManager: Elemento canvas con ID #${canvasId} no encontrado.`);
            return;
        }

        // Propiedades del Modal (para móvil)
        this.modalCanvas = document.getElementById('modal-canvas-firma');
        this.modalPad = null;
        this.modalGuardarBtn = document.getElementById('modal-btn-guardar');
        this.modalLimpiarBtn = document.getElementById('modal-btn-limpiar');

        // Propiedades de Desktop
        this.pad = null; // El pad de escritorio
        this.desktopInitialized = false; // Bandera

        this.isTactil = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

        if (this.isTactil) {
            // MÓVIL: Solo añadimos el listener para abrir el modal
            this.canvasEl.addEventListener('click', () => this.abrirModal());
        } else {
            // DESKTOP: No hacemos NADA. Esperamos a prepararCanvas().
        }

        // Listener del botón de limpiar
        if (this.clearButton) {
            this.clearButton.addEventListener('click', (e) => {
                e.stopPropagation(); 
                this.limpiar();
            });
        }
    }

    /**
     * (NUEVO MÉTODO)
     * Llamado por el controlador DESPUÉS de que la animación CSS ha terminado.
     * Este es el único punto de entrada para la inicialización.
     */
    prepararCanvas() {
        // Evitar doble inicialización
        if (this.desktopInitialized) return;

        const wrapper = this.canvasEl.parentElement;
        if (!wrapper || wrapper.clientWidth === 0) {
            console.warn(`CanvasManager (${this.canvasEl.id}): wrapper no encontrado o clientWidth es 0.`);
            // Si el clientWidth es 0, no podemos hacer nada.
            return;
        }

        // 1. Dimensionar el bitmap del canvas
        // Leemos el ancho del wrapper (que ahora SÍ es correcto)
        this.canvasEl.width = wrapper.clientWidth;
        // El alto lo define el CSS (.firma-canvas) como 160px.
        this.canvasEl.height = 160; 

        if (this.isTactil) {
            // MÓVIL: Solo necesitábamos dimensionar el canvas de previsualización.
            // No creamos un SignaturePad aquí.
        } else {
            // DESKTOP: Inicializamos el pad completo.
            if (this.pad) {
                this.pad.clear(); 
            } else {
                this.pad = new SignaturePad(this.canvasEl);
            }
        }
        
        // Marcamos como inicializado para ambos flujos (móvil y desktop)
        // para que no se vuelva a ejecutar el dimensionamiento.
        this.desktopInitialized = true;
    }


    limpiar() {
        if (this.isTactil) {
            // En móvil, solo limpiamos el canvas de previsualización
            const ctx = this.canvasEl.getContext('2d');
            ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
        } else {
            // En desktop, usamos el método del pad
            if (this.pad) {
                this.pad.clear();
            }
        }
    }

    isEmpty() {
        if (this.isTactil) {
            // En móvil, leemos el pixel data de nuestro canvas de previsualización
            // Si el canvas AÚN es 0x0 (porque falló prepararCanvas), reportar vacío.
            if (this.canvasEl.width === 0 || this.canvasEl.height === 0) {
                return true;
            }
            const ctx = this.canvasEl.getContext('2d', { willReadFrequently: true });
            const data = ctx.getImageData(0, 0, this.canvasEl.width, this.canvasEl.height).data;
            return data.every(p => p === 0);
        } else {
            // En desktop, delegamos al pad
            return this.pad ? this.pad.isEmpty() : true;
        }
    }

    toDataURL() {
        if (this.isEmpty()) {
            return null;
        }
        
        // Este canvas temporal asegura un fondo blanco
        const tempCanvas = document.createElement('canvas');
        
        // Usamos las dimensiones del bitmap del canvas (que ahora son correctas)
        tempCanvas.width = this.canvasEl.width;
        tempCanvas.height = this.canvasEl.height;
        
        const ctx = tempCanvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        ctx.drawImage(this.canvasEl, 0, 0);
        
        return tempCanvas.toDataURL('image/png');
    }

    // --- Métodos solo para Táctil (Modal) ---

    abrirModal() {
        const modal = document.getElementById('modal-firma');
        if (!modal || !this.modalCanvas) return;

        const rect = this.modalCanvas.parentElement.getBoundingClientRect();
        this.modalCanvas.width = rect.width;
        this.modalCanvas.height = rect.height;

        this.modalPad = new SignaturePad(this.modalCanvas);
        this.modalPad.clear();

        modal.classList.remove('oculto');

        // Asignamos los eventos de forma segura
        this.modalLimpiarBtn.onclick = () => this.modalPad.clear();
        this.modalGuardarBtn.onclick = () => this.guardarFirmaModal();
    }

    guardarFirmaModal() {
        if (!this.modalPad || this.modalPad.isEmpty()) {
            alert("Por favor, firme antes de guardar."); 
            return;
        }

        // --- INICIO DE CAMBIOS (Fallback de robustez) ---
        // Doble verificación: Si el canvas de previsualización AÚN no tiene
        // el tamaño correcto (porque prepararCanvas falló), se lo damos AHORA.
        if (!this.desktopInitialized || this.canvasEl.width === 0) {
            const wrapper = this.canvasEl.parentElement;
            if (wrapper) {
                this.canvasEl.width = wrapper.clientWidth;
                this.canvasEl.height = 160;
                this.desktopInitialized = true;
            }
        }
        // --- FIN DE CAMBIOS ---

        const dataURL = this.modalPad.toDataURL();
        const ctxDestino = this.canvasEl.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            ctxDestino.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
            
            // Dibuja la firma del modal en el canvas de previsualización
            // (que ahora tiene el tamaño correcto)
            ctxDestino.drawImage(img, 0, 0, this.canvasEl.width, this.canvasEl.height);
            
            this.cerrarModal();
        };
        img.src = dataURL;
    }

    cerrarModal() {
        const modal = document.getElementById('modal-firma');
        if (modal) modal.classList.add('oculto');
        if (this.modalPad) {
            this.modalPad.off(); // Limpia listeners
            this.modalPad = null;
        }
    }
}
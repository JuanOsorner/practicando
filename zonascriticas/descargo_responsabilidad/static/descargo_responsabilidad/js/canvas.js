/*
 * descargo_responsabilidad/static/descargo_responsabilidad/js/canvas.js
 * Módulo de Lógica de Firma (SignaturePad Abstraction)
 *
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
        this.pad = null; // El pad de escritorio se inicializará MÁS TARDE
        this.desktopInitialized = false;

        // Detectar si es táctil
        this.isTactil = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

        if (this.isTactil) {
            // MÓVIL: Solo añadimos el listener para abrir el modal
            this.canvasEl.addEventListener('click', () => this.abrirModal());
        } else {
            // DESKTOP: No hacemos NADA. Esperamos a onCheckboxChange.
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
     * Inicializa el pad de firma para DESKTOP.
     * Se debe llamar SÓLO cuando el canvas sea visible.
     */
    initDesktopPad() {
        if (this.isTactil || this.desktopInitialized) {
            return;
        }

        const wrapper = this.canvasEl.parentElement;

        // --- INICIO DE LA CORRECCIÓN CLAVE ---
        // El problema de leer clientHeight/clientWidth es que falla
        // si la animación de CSS no ha terminado.
        
        // Solución: No leemos. Asignamos los valores que sabemos que son correctos.
        
        // 1. Forzamos el tamaño del bitmap del canvas
        // El ancho (width) es el del wrapper (que es 100% de su contenedor)
        this.canvasEl.width = wrapper.clientWidth;
        
        // El alto (height) lo define el CSS en .firma-canvas como 160px.
        // Lo asignamos explícitamente.
        this.canvasEl.height = 160; 
        
        // 2. Redimensionamos el pad (si ya existía por error) o lo creamos
        if (this.pad) {
            // Si ya existía un pad de 0x0, lo actualizamos
            this.pad.clear(); 
        } else {
            // Creamos el pad
            this.pad = new SignaturePad(this.canvasEl);
        }
        
        // --- FIN DE LA CORRECCIÓN CLAVE ---

        this.desktopInitialized = true; 
    }

    limpiar() {
        if (this.isTactil) {
            const ctx = this.canvasEl.getContext('2d');
            ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
        } else {
            if (this.pad) {
                this.pad.clear();
            }
        }
    }

    isEmpty() {
        if (this.isTactil) {
            const ctx = this.canvasEl.getContext('2d', { willReadFrequently: true });
            const data = ctx.getImageData(0, 0, this.canvasEl.width, this.canvasEl.height).data;
            return data.every(p => p === 0);
        } else {
            return this.pad ? this.pad.isEmpty() : true;
        }
    }

    toDataURL() {
        if (this.isEmpty()) {
            return null;
        }
        
        const tempCanvas = document.createElement('canvas');
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

        this.modalLimpiarBtn.onclick = () => this.modalPad.clear();
        this.modalGuardarBtn.onclick = () => this.guardarFirmaModal();
    }

    guardarFirmaModal() {
        if (!this.modalPad || this.modalPad.isEmpty()) {
            alert("Por favor, firme antes de guardar."); 
            return;
        }

        const dataURL = this.modalPad.toDataURL();
        const ctxDestino = this.canvasEl.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            ctxDestino.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
            ctxDestino.drawImage(img, 0, 0, this.canvasEl.width, this.canvasEl.height);
            this.cerrarModal();
        };
        img.src = dataURL;
    }

    cerrarModal() {
        const modal = document.getElementById('modal-firma');
        if (modal) modal.classList.add('oculto');
        if (this.modalPad) {
            this.modalPad.off();
            this.modalPad = null;
        }
    }
}
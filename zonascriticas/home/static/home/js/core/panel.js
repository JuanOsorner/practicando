/**
 * home/static/home/js/core/panel.js
 * CONTROLADOR GLOBAL DEL PANEL LATERAL
 */

class GlobalPanelController {
    constructor() {
        this.panelEl = null;
        this.overlayEl = null;
        this.titleEl = null;
        this.contentEl = null;
        this.closeBtn = null;
        
        this.onCloseCallback = null;
    }

    /**
     * Vincula los elementos del DOM.
     * SE EJECUTA SIEMPRE que se intenta abrir para evitar referencias muertas.
     */
    _bindElements() {
        // Intentamos buscar los elementos de nuevo
        this.panelEl = document.getElementById('global-side-panel');
        this.overlayEl = document.getElementById('global-panel-overlay');
        this.titleEl = document.getElementById('global-panel-title');
        this.contentEl = document.getElementById('global-panel-content');
        this.closeBtn = document.getElementById('global-panel-close-btn');

        if (!this.panelEl || !this.contentEl) {
            console.error("GlobalPanel Error: Elementos HTML no encontrados en el DOM.");
            return false;
        }

        // Aseguramos que los eventos estén limpios (clonando el nodo o reasignando)
        // Para simplificar, usamos una bandera en el elemento para no duplicar listeners
        if (!this.overlayEl.dataset.listening) {
            this.overlayEl.addEventListener('click', () => this.close());
            this.closeBtn.addEventListener('click', () => this.close());
            this.overlayEl.dataset.listening = "true";
        }

        return true;
    }

    /**
     * Abre el panel lateral con contenido nuevo.
     */
    open({ title, contentHTML, onClose = null }) {
        // 1. RE-BINDING CRÍTICO (Solución del Bug Blanco)
        // Verificamos si tenemos referencias y si siguen conectadas al DOM
        const isConnected = this.panelEl && document.body.contains(this.panelEl);
        
        if (!isConnected) {
            const success = this._bindElements();
            if (!success) return; // No podemos abrir si no hay HTML
        }

        // 2. Configurar Contenido
        this.titleEl.textContent = title || 'Detalle';
        
        // Limpieza preventiva
        this.contentEl.innerHTML = ''; 
        // Inyección
        this.contentEl.innerHTML = contentHTML;
        
        this.onCloseCallback = onClose;

        // 3. Mostrar (Animación CSS)
        // Forzamos un reflow pequeño para asegurar que el navegador pinte
        void this.panelEl.offsetWidth; 
        document.body.classList.add('panel-is-open');
    }

    /**
     * Cierra el panel.
     */
    close() {
        document.body.classList.remove('panel-is-open');

        if (typeof this.onCloseCallback === 'function') {
            this.onCloseCallback();
            this.onCloseCallback = null;
        }

        setTimeout(() => {
            if (this.contentEl) {
                this.contentEl.innerHTML = '';
                if (this.titleEl) this.titleEl.textContent = '';
            }
        }, 300);
    }

    setTitle(newTitle) {
        if (this.titleEl) this.titleEl.textContent = newTitle;
    }
    
    getBodyElement() {
        // Asegurar referencia antes de devolverla
        if (!this.contentEl || !document.body.contains(this.contentEl)) {
            this._bindElements();
        }
        return this.contentEl;
    }
}

export const GlobalPanel = new GlobalPanelController();
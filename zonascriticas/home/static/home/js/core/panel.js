/**
 * home/static/home/js/core/panel.js
 * CONTROLADOR GLOBAL DEL PANEL LATERAL
 * ------------------------------------
 * Este módulo es un Singleton que controla la apertura, cierre y
 * contenido del panel lateral único de la aplicación.
 */

class GlobalPanelController {
    constructor() {
        this.panelEl = null;
        this.overlayEl = null;
        this.titleEl = null;
        this.contentEl = null;
        this.closeBtn = null;
        
        this.onCloseCallback = null; // Función opcional a ejecutar al cerrar
        this.isInitialized = false;
    }

    /**
     * Inicializa las referencias al DOM.
     * Se llama automáticamente la primera vez que se intenta abrir.
     */
    init() {
        if (this.isInitialized) return;

        this.panelEl = document.getElementById('global-side-panel');
        this.overlayEl = document.getElementById('global-panel-overlay');
        this.titleEl = document.getElementById('global-panel-title');
        this.contentEl = document.getElementById('global-panel-content');
        this.closeBtn = document.getElementById('global-panel-close-btn');

        if (!this.panelEl) {
            console.error("GlobalPanel: No se encontró el HTML del panel en home.html");
            return;
        }

        // Eventos de Cierre
        this.overlayEl.addEventListener('click', () => this.close());
        this.closeBtn.addEventListener('click', () => this.close());

        this.isInitialized = true;
    }

    /**
     * Abre el panel lateral con contenido nuevo.
     * @param {object} config
     * @param {string} config.title - Título del encabezado.
     * @param {string} config.contentHTML - String HTML para inyectar.
     * @param {function} [config.onClose] - Callback opcional al cerrar.
     */
    open({ title, contentHTML, onClose = null }) {
        this.init(); // Asegurar inicialización

        // 1. Configurar Contenido
        this.titleEl.textContent = title || 'Detalle';
        this.contentEl.innerHTML = contentHTML;
        this.onCloseCallback = onClose;

        // 2. Mostrar (Animación CSS)
        document.body.classList.add('panel-is-open');
    }

    /**
     * Cierra el panel.
     */
    close() {
        if (!this.isInitialized) return;

        document.body.classList.remove('panel-is-open');

        // Ejecutar callback si existía
        if (typeof this.onCloseCallback === 'function') {
            this.onCloseCallback();
            this.onCloseCallback = null;
        }

        // Limpiar contenido después de la animación (300ms)
        // para evitar parpadeos visuales mientras se cierra.
        setTimeout(() => {
            this.contentEl.innerHTML = '';
            this.titleEl.textContent = '';
        }, 300);
    }

    /**
     * Actualiza solo el título sin recargar el contenido.
     */
    setTitle(newTitle) {
        if (this.titleEl) this.titleEl.textContent = newTitle;
    }
    
    /**
     * Permite obtener el contenedor del cuerpo para añadir listeners
     * manualmente desde el controlador de la app.
     */
    getBodyElement() {
        this.init();
        return this.contentEl;
    }
}

// Exportamos una instancia única (Singleton)
export const GlobalPanel = new GlobalPanelController();
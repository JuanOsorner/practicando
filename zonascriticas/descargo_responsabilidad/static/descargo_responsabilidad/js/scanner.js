/*
 * descargo_responsabilidad/static/descargo_responsabilidad/js/scanner.js
 * Módulo de Lógica de Escaneo (Html5Qrcode Abstraction)
 */

// Asumimos que Html5Qrcode se carga globalmente desde home.html
const Html5Qrcode = window.Html5Qrcode;

export class QRScanner {

    /**
     * @param {string} triggerId - ID del elemento que abre el modal (ej: 'scan-trigger-zona')
     */
    constructor(triggerId) {
        this.triggerElement = document.getElementById(triggerId);
        
        // Elementos del Modal
        this.modal = document.getElementById('scanner-modal');
        this.closeBtn = document.getElementById('scanner-close-btn');
        this.tabs = document.querySelectorAll('.scanner-tab');
        this.tabContents = document.querySelectorAll('.scanner-tab-content');
        this.fileInput = document.getElementById('qr-input-file');
        this.cameraReaderDivId = 'qr-reader-camera'; // El ID del div en el HTML

        this.html5Qrcode = null; // Instancia del lector de cámara

        if (!this.triggerElement || !this.modal) {
            console.error("QRScanner: Elementos del DOM (trigger o modal) no encontrados.");
            return;
        }
        
        this.initializeListeners();
    }

    initializeListeners() {
        this.triggerElement.addEventListener('click', () => this.openModal());
        this.closeBtn.addEventListener('click', () => this.closeModal());
        
        // Lógica de Pestañas (Tabs)
        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Lógica de Subir Archivo
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                this.scanFile(e.target.files[0]);
            }
        });
    }

    openModal() {
        this.modal.style.display = 'flex';
        // Por defecto, al abrir, activamos la pestaña de la cámara
        this.switchTab('camera');
    }

    closeModal() {
        this.stopCamera(); // Siempre intentar detener la cámara al cerrar
        this.modal.style.display = 'none';
    }

    switchTab(tabId) {
        // Ocultar todos los contenidos y desactivar todas las pestañas
        this.tabContents.forEach(content => content.classList.remove('active'));
        this.tabs.forEach(tab => tab.classList.remove('active'));

        // Mostrar el contenido y la pestaña seleccionados
        document.getElementById(`tab-content-${tabId}`).classList.add('active');
        document.querySelector(`.scanner-tab[data-tab="${tabId}"]`).classList.add('active');

        if (tabId === 'camera') {
            this.startCamera();
        } else {
            this.stopCamera(); // Detener la cámara si cambiamos a la pestaña de archivo
        }
    }

    startCamera() {
        if (this.html5Qrcode && this.html5Qrcode.isScanning) {
            return; // Ya está escaneando
        }

        this.html5Qrcode = new Html5Qrcode(this.cameraReaderDivId);
        
        const config = { 
            fps: 10, 
            qrbox: (w, h) => ({ width: Math.min(w, h) * 0.7, height: Math.min(w, h) * 0.7 })
        };
        
        this.html5Qrcode.start(
            { facingMode: "environment" }, // Cámara trasera
            config,
            (decodedText, decodedResult) => this.onScanSuccess(decodedText),
            (errorMessage) => { /* Ignorar errores de "no se encontró QR" */ }
        ).catch(err => {
            console.error("Error al iniciar la cámara:", err);
            // Aquí podríamos usar ui.js para mostrar un error si tuviéramos acceso
        });
    }

    stopCamera() {
        if (this.html5Qrcode && this.html5Qrcode.isScanning) {
            this.html5Qrcode.stop().catch(err => {
                console.error("Error al detener la cámara:", err);
            }).finally(() => {
                this.html5Qrcode.clear();
                this.html5Qrcode = null;
            });
        }
    }

    scanFile(file) {
        // Usamos una instancia temporal para escanear archivos
        const fileScanner = new Html5Qrcode(this.cameraReaderDivId, false);
        fileScanner.scanFile(file, true)
            .then(decodedText => this.onScanSuccess(decodedText))
            .catch(err => {
                // Notificar al usuario que no se encontró QR
                alert("No se pudo detectar un código QR en la imagen seleccionada.");
            })
            .finally(() => {
                fileScanner.clear();
            });
    }

    onScanSuccess(codigo) {
        // ¡Éxito! Cerramos el modal
        this.closeModal();
        
        // Notificamos al resto de la aplicación (al form_controller)
        // usando un Evento Global.
        window.dispatchEvent(new CustomEvent('qrCodeScanned', {
            detail: { codigo: codigo }
        }));
    }
}
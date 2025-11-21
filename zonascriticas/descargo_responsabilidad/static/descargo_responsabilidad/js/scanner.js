/*
 * descargo_responsabilidad/static/descargo_responsabilidad/js/scanner.js
 * Módulo de Lógica de Escaneo (Html5Qrcode Abstraction)
 * REFACTORIZADO: Ahora usa core/image.js para optimizar memoria.
 */

// 1. IMPORTAMOS NUESTRO MÓDULO
import { imageUtils } from '/static/home/js/core/image.js';

// Asumimos que Html5Qrcode se carga globalmente
const Html5Qrcode = window.Html5Qrcode;

export class QRScanner {

    constructor(triggerId) {
        this.triggerElement = document.getElementById(triggerId);
        
        // Elementos del Modal
        this.modal = document.getElementById('scanner-modal');
        this.closeBtn = document.getElementById('scanner-close-btn');
        this.tabs = document.querySelectorAll('.scanner-tab');
        this.tabContents = document.querySelectorAll('.scanner-tab-content');
        this.fileInput = document.getElementById('qr-input-file');
        this.cameraReaderDivId = 'qr-reader-camera'; 

        this.html5Qrcode = null; 

        if (!this.triggerElement || !this.modal) {
            console.error("QRScanner: Elementos del DOM no encontrados.");
            return;
        }
        
        this.initializeListeners();
    }

    initializeListeners() {
        this.triggerElement.addEventListener('click', () => this.openModal());
        this.closeBtn.addEventListener('click', () => this.closeModal());
        
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
        this.switchTab('camera');
    }

    closeModal() {
        this.stopCamera(); 
        this.modal.style.display = 'none';
        // Limpiamos el input file por si el usuario quiere subir la misma imagen 2 veces seguidas
        this.fileInput.value = ''; 
    }

    switchTab(tabId) {
        this.tabContents.forEach(content => content.classList.remove('active'));
        this.tabs.forEach(tab => tab.classList.remove('active'));

        document.getElementById(`tab-content-${tabId}`).classList.add('active');
        document.querySelector(`.scanner-tab[data-tab="${tabId}"]`).classList.add('active');

        if (tabId === 'camera') {
            this.startCamera();
        } else {
            this.stopCamera(); 
        }
    }

    startCamera() {
        if (this.html5Qrcode && this.html5Qrcode.isScanning) return;

        this.html5Qrcode = new Html5Qrcode(this.cameraReaderDivId);
        const config = { fps: 10, qrbox: (w, h) => ({ width: Math.min(w, h) * 0.7, height: Math.min(w, h) * 0.7 }) };
        
        this.html5Qrcode.start(
            { facingMode: "environment" }, 
            config,
            (decodedText) => this.onScanSuccess(decodedText),
            (errorMessage) => { /* Ignorar errores de tracking */ }
        ).catch(err => console.error("Error cámara:", err));
    }

    stopCamera() {
        if (this.html5Qrcode && this.html5Qrcode.isScanning) {
            this.html5Qrcode.stop().catch(err => console.error(err)).finally(() => {
                this.html5Qrcode.clear();
                this.html5Qrcode = null;
            });
        }
    }

    // --- AQUÍ ESTÁ LA REFACTORIZACIÓN CLAVE ---
    async scanFile(file) {
        try {
            // 1. OPTIMIZACIÓN: Comprimimos la imagen antes de escanearla.
            // Esto evita crashes en móviles cuando la foto pesa 10MB+
            // Usamos maxWidth 1024px que es más que suficiente para un QR.
            const compressedBlob = await imageUtils.compress(file, 1024, 0.8);
            
            // Convertimos Blob a File nuevamente porque Html5Qrcode prefiere File
            const optimizedFile = new File([compressedBlob], "qr_optimizado.jpg", { type: "image/jpeg" });

            // 2. Escaneo
            const fileScanner = new Html5Qrcode(this.cameraReaderDivId, false);
            const decodedText = await fileScanner.scanFile(optimizedFile, true);
            
            this.onScanSuccess(decodedText);
            fileScanner.clear();

        } catch (err) {
            console.warn("Error escaneando archivo:", err);
            // Si falla la compresión o el escaneo, intentamos con el archivo original como fallback
            // o notificamos error.
            alert("No se pudo detectar un código QR. Intenta enfocar mejor o usar la cámara.");
        }
    }

    onScanSuccess(codigo) {
        this.closeModal();
        window.dispatchEvent(new CustomEvent('qrCodeScanned', {
            detail: { codigo: codigo }
        }));
    }
}
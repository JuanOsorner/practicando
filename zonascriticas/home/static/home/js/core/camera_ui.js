/**
 * home/static/home/js/core/camera_ui.js
 * VERSIÓN 3.0: Diseño App-Style SIN Observaciones (Solo Foto).
 */

import { CameraController } from './camera.js';
import { imageUtils } from './image.js';
import { ui } from './ui.js';

export class CameraModalManager {
    
    constructor(modalId = 'modal-camera') {
        this.modal = document.getElementById(modalId);
        if (!this.modal) return;

        // Elementos de Video/Imagen
        this.videoEl = document.getElementById('camera-video');
        this.previewEl = document.getElementById('camera-preview');
        this.fileInput = document.getElementById('evidence-file-input');

        // Contenedores de Botones
        this.preCaptureControls = document.getElementById('pre-capture-controls');
        this.postCaptureControls = document.getElementById('post-capture-controls');

        this.camera = new CameraController(this.videoEl);
        this.currentBlob = null;
        this.onConfirmCallback = null;

        this._bindEvents();
    }

    _bindEvents() {
        const btnClose = document.getElementById('btn-close-camera');
        const btnCapture = document.getElementById('btn-capture');
        const btnRetry = document.getElementById('btn-retry');
        const btnConfirm = document.getElementById('btn-confirm-photo');
        const btnGallery = document.getElementById('btn-gallery-placeholder');

        if (btnClose) btnClose.onclick = () => this.close();
        if (btnCapture) btnCapture.onclick = () => this.takePhoto();
        if (btnRetry) btnRetry.onclick = () => this.resetView();
        if (btnConfirm) btnConfirm.onclick = () => this.confirm();

        if (btnGallery && this.fileInput) {
            btnGallery.onclick = () => this.fileInput.click();
            this.fileInput.onchange = (e) => {
                if (e.target.files[0]) this.processFile(e.target.files[0]);
            };
        }
    }

    async open(options = {}) {
        this.onConfirmCallback = options.onConfirm;
        // Ya no reseteamos obsInput porque no existe
        
        this.modal.classList.remove('hidden');
        this.resetView();

        try {
            await this.camera.start();
        } catch (e) {
            ui.showError("Cámara no disponible: " + e.message);
            this.close(); // Cerramos si falla para no dejar pantalla negra bloqueada
        }
    }

    close() {
        this.modal.classList.add('hidden');
        this.camera.stop();
        this.currentBlob = null;
        if(this.fileInput) this.fileInput.value = '';
    }

    async takePhoto() {
        try {
            // Efecto visual flash
            this.videoEl.style.opacity = '0.5';
            setTimeout(() => this.videoEl.style.opacity = '1', 100);

            const blob = await this.camera.takePhoto();
            this.processFile(blob); 
        } catch (e) {
            ui.showError(e.message);
        }
    }

    async processFile(blobOrFile) {
        try {
            this.currentBlob = await imageUtils.compress(blobOrFile, 800, 0.7);
            const url = URL.createObjectURL(this.currentBlob);
            this.previewEl.src = url;
            this._toggleUI('preview');
            this.camera.stop(); 
        } catch (e) {
            ui.showError("Error imagen: " + e.message);
        }
    }

    resetView() {
        this.currentBlob = null;
        this._toggleUI('video');
        if (!this.modal.classList.contains('hidden')) {
            this.camera.start().catch(console.error);
        }
    }

    confirm() {
        if (!this.currentBlob) return;

        // Devolvemos observaciones vacías para compatibilidad
        if (this.onConfirmCallback) {
            this.onConfirmCallback({
                blob: this.currentBlob,
                observaciones: '' 
            });
        }
        this.camera.stop();
    }

    _toggleUI(mode) {
        if (mode === 'preview') {
            this.videoEl.classList.add('hidden'); // Style helper
            this.videoEl.style.display = 'none';
            this.previewEl.style.display = 'block';
            
            this.preCaptureControls.classList.add('hidden');
            this.postCaptureControls.classList.remove('hidden');
            this.postCaptureControls.style.display = 'flex';
            this.preCaptureControls.style.display = 'none';
        } else {
            this.previewEl.style.display = 'none';
            this.videoEl.style.display = 'block';
            this.videoEl.classList.remove('hidden');

            this.postCaptureControls.classList.add('hidden');
            this.preCaptureControls.classList.remove('hidden');
            this.postCaptureControls.style.display = 'none';
            this.preCaptureControls.style.display = 'flex';
        }
    }
}
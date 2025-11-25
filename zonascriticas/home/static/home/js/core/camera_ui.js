/**
 * home/static/home/js/core/camera_ui.js
 * Wrapper de UI para el Controlador de Cámara.
 * Maneja el modal, los botones y el ciclo de vida de la captura.
 */

import { CameraController } from './camera.js';
import { imageUtils } from './image.js';
import { ui } from './ui.js';

export class CameraModalManager {
    
    constructor(modalId = 'modal-camera') {
        this.modal = document.getElementById(modalId);
        if (!this.modal) return;

        this.videoEl = document.getElementById('camera-video');
        this.previewEl = document.getElementById('camera-preview');
        
        // Controlador de Hardware
        this.camera = new CameraController(this.videoEl);
        
        this.currentBlob = null;
        this.onConfirmCallback = null;

        this._bindEvents();
    }

    _bindEvents() {
        // Botones
        const btnCapture = document.getElementById('btn-capture');
        const btnRetry = document.getElementById('btn-retry');
        const btnConfirm = document.getElementById('btn-confirm-entry');
        const btnGallery = document.getElementById('btn-gallery');
        const btnClose = document.querySelector('[data-close="modal-camera"]');
        const fileInput = document.getElementById('evidence-file-input');

        if(btnCapture) btnCapture.onclick = () => this.takePhoto();
        if(btnRetry) btnRetry.onclick = () => this.resetView();
        if(btnConfirm) btnConfirm.onclick = () => this.confirm();
        if(btnClose) btnClose.onclick = () => this.close();
        
        if(btnGallery) btnGallery.onclick = () => fileInput.click();
        if(fileInput) {
            fileInput.onchange = (e) => {
                if(e.target.files[0]) this.processFile(e.target.files[0]);
            };
        }
    }

    async open(options = {}) {
        this.onConfirmCallback = options.onConfirm;
        
        // Pre-llenar observaciones si existen
        const obsInput = document.getElementById('entry-observaciones');
        if(obsInput) obsInput.value = options.initialObservaciones || '';

        this.modal.classList.remove('hidden');
        this.resetView();

        try {
            await this.camera.start();
        } catch (e) {
            ui.showError("Cámara no disponible: " + e.message);
        }
    }

    close() {
        this.modal.classList.add('hidden');
        this.camera.stop();
        this.currentBlob = null;
    }

    async takePhoto() {
        try {
            const blob = await this.camera.takePhoto();
            this.processFile(blob); // Reutilizamos lógica
        } catch (e) {
            ui.showError(e.message);
        }
    }

    async processFile(blobOrFile) {
        try {
            // Comprimir
            this.currentBlob = await imageUtils.compress(blobOrFile, 800, 0.7);
            
            // Mostrar Preview
            const url = URL.createObjectURL(this.currentBlob);
            this.previewEl.src = url;
            
            // Switch UI: Video -> Preview
            this._toggleUI('preview');
            
            this.camera.stop(); // Ahorrar recursos

        } catch (e) {
            ui.showError("Error imagen: " + e.message);
        }
    }

    resetView() {
        this.currentBlob = null;
        this._toggleUI('video');
        this.camera.start();
    }

    confirm() {
        const obs = document.getElementById('entry-observaciones').value;
        if (this.onConfirmCallback) {
            this.onConfirmCallback({
                blob: this.currentBlob,
                observaciones: obs
            });
        }
    }

    _toggleUI(mode) {
        const videoGroup = [this.videoEl, document.getElementById('btn-capture'), document.getElementById('btn-gallery')];
        const previewGroup = [this.previewEl, document.getElementById('post-capture-actions')];

        if (mode === 'preview') {
            videoGroup.forEach(el => el?.classList.add('hidden'));
            previewGroup.forEach(el => el?.classList.remove('hidden'));
        } else {
            // Mode Video
            videoGroup.forEach(el => el?.classList.remove('hidden'));
            previewGroup.forEach(el => el?.classList.add('hidden'));
        }
    }
}
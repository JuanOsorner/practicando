/**
 * tools_controller.js
 * Controlador de la lógica de Registro de Herramientas.
 * Integra: API, Cámara y Compresión de Imágenes.
 */

import { api } from '/static/home/js/core/api.js';
import { ui } from '/static/home/js/core/ui.js';
import { imageUtils } from '/static/home/js/core/image.js';
import { CameraController } from '/static/home/js/core/camera.js';

class ToolsManager {
    constructor() {
        this.container = document.getElementById('tools-app');
        this.urls = {
            inventario: this.container.dataset.urlInventario,
            crear: this.container.dataset.urlCrear,
            registrar: this.container.dataset.urlRegistrar,
            finalizar: this.container.dataset.urlFinalizar,
            dashboard: this.container.dataset.urlDashboard
        };

        // Estado
        this.inventoryData = { herramientas: [], computo: [] };
        this.currentTab = 'herramientas';
        this.selectedItem = null; // Ítem que se está procesando en la cámara
        this.itemsIngresadosCount = 0; // Contador local para UX

        // Módulos
        this.camera = new CameraController(document.getElementById('camera-video'));
        this.capturedBlob = null; // Foto tomada

        this.init();
    }

    async init() {
        await this.loadInventory();
        this.setupEventListeners();
    }

    // --- 1. CARGA DE DATOS ---
    async loadInventory() {
        try {
            const response = await api.get(this.urls.inventario);
            this.inventoryData = response.data;
            this.renderList();
        } catch (error) {
            ui.showError("No se pudo cargar el inventario.");
        }
    }

    // --- 2. RENDERIZADO ---
    renderList() {
        const listContainer = document.getElementById('inventory-list');
        listContainer.innerHTML = '';

        const items = this.inventoryData[this.currentTab];

        if (items.length === 0) {
            listContainer.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:40px; color:#999;">
                    <i class="fas fa-box-open fa-3x"></i>
                    <p>No tienes ${this.currentTab} registradas.<br>Usa el botón + para agregar.</p>
                </div>`;
            return;
        }

        items.forEach(item => {
            // Verificar si ya fue "marcado" (esto es visual, idealmente vendría del backend, 
            // pero por ahora lo manejamos en sesión visual simple o recarga).
            // Para la V1, asumimos que inicia limpio.
            
            const card = document.createElement('div');
            card.className = 'tool-card';
            card.onclick = () => this.openCameraForEntry(item);

            // Imagen o Icono por defecto
            let imgHtml = `<div class="tool-icon"><i class="fas fa-${this.currentTab === 'computo' ? 'laptop' : 'tools'}"></i></div>`;
            if (item.foto) {
                imgHtml = `<img src="${item.foto}" alt="${item.nombre}">`;
            }

            card.innerHTML = `
                ${imgHtml}
                <span class="tool-name">${item.nombre}</span>
                <span class="tool-serial">${item.marca || item.serial}</span>
            `;
            listContainer.appendChild(card);
        });
    }

    // --- 3. GESTIÓN DE CÁMARA Y REGISTRO ---
    
    async openCameraForEntry(item) {
        this.selectedItem = item;
        
        // Resetear UI del modal
        document.getElementById('camera-video').classList.remove('hidden');
        document.getElementById('camera-preview').classList.add('hidden');
        document.getElementById('btn-capture').classList.remove('hidden');
        document.getElementById('post-capture-actions').classList.add('hidden');
        document.getElementById('entry-observaciones').value = '';

        // Abrir modal
        document.getElementById('modal-camera').classList.remove('hidden');

        // Iniciar Cámara
        try {
            await this.camera.start();
        } catch (error) {
            ui.showError(error.message);
            this.closeModal('modal-camera');
        }
    }

    async takePhoto() {
        try {
            // 1. Capturar blob (alta calidad inicial)
            const blob = await this.camera.takePhoto();
            
            // 2. Comprimir usando nuestro Core (800px es suficiente para evidencia)
            this.capturedBlob = await imageUtils.compress(blob, 800, 0.7);

            // 3. Mostrar Preview
            const previewUrl = URL.createObjectURL(this.capturedBlob);
            const imgPreview = document.getElementById('camera-preview');
            imgPreview.src = previewUrl;
            imgPreview.classList.remove('hidden');
            
            // 4. Ocultar video y mostrar controles de guardar
            document.getElementById('camera-video').classList.add('hidden');
            document.getElementById('btn-capture').classList.add('hidden');
            document.getElementById('post-capture-actions').classList.remove('hidden');

            // Detener cámara para ahorrar batería mientras el usuario decide
            this.camera.stop();

        } catch (error) {
            ui.showError("Error al tomar foto: " + error.message);
        }
    }

    retryPhoto() {
        // Reiniciar UI
        document.getElementById('camera-preview').classList.add('hidden');
        document.getElementById('camera-video').classList.remove('hidden');
        document.getElementById('post-capture-actions').classList.add('hidden');
        document.getElementById('btn-capture').classList.remove('hidden');
        
        // Reiniciar cámara
        this.camera.start();
    }

    async confirmEntry() {
        if (!this.capturedBlob || !this.selectedItem) return;

        const obs = document.getElementById('entry-observaciones').value;
        const formData = new FormData();
        formData.append('id_inventario', this.selectedItem.id);
        formData.append('observaciones', obs);
        formData.append('foto_evidencia', this.capturedBlob, 'evidencia.jpg');

        ui.showLoading('Registrando ingreso...');

        try {
            await api.post(this.urls.registrar, formData);
            
            ui.hideLoading();
            ui.showNotification('Herramienta registrada', 'success');
            
            this.closeModal('modal-camera');
            
            // Actualizar contador y UI
            this.itemsIngresadosCount++;
            document.getElementById('counter-text').textContent = `${this.itemsIngresadosCount} elementos seleccionados`;

            // Marcar visualmente la tarjeta (opcional, requeriría buscar el ID en el DOM)
            // Por ahora simple.

        } catch (error) {
            ui.hideLoading();
            ui.showError(error.message);
        }
    }

    // --- 4. CREACIÓN DE NUEVO ÍTEM ---
    
    async handleCreateNewItem(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        // Si hay foto de referencia, comprimirla
        const fileInput = document.getElementById('new-item-photo');
        if (fileInput.files[0]) {
            const compressed = await imageUtils.compress(fileInput.files[0], 600, 0.7);
            formData.set('foto_referencia', compressed, 'ref.jpg');
        }

        ui.showLoading('Guardando en Inventario...');

        try {
            const resp = await api.post(this.urls.crear, formData);
            ui.hideLoading();
            ui.showNotification(resp.mensaje, 'success');
            
            // Recargar inventario para que aparezca el nuevo ítem
            await this.loadInventory(); 
            this.closeModal('modal-new-item');
            form.reset();

        } catch (error) {
            ui.hideLoading();
            ui.showError(error.message);
        }
    }

    // --- 5. FINALIZAR ---
    async handleFinish() {
        if (this.itemsIngresadosCount === 0) {
            const seguro = await ui.confirm('¿Sin herramientas?', 'No has registrado ninguna herramienta. ¿Seguro que quieres continuar?', 'Sí, finalizar');
            if (!seguro) return;
        }

        ui.showLoading('Finalizando registro...');
        try {
            await api.post(this.urls.finalizar, {});
            window.location.href = this.urls.dashboard; // Redirigir al dashboard real
        } catch (error) {
            ui.hideLoading();
            ui.showError(error.message);
        }
    }

    // --- UTILIDADES ---
    setupEventListeners() {
        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTab = btn.dataset.category;
                this.renderList();
            });
        });

        // Modales
        document.getElementById('btn-open-new-modal').onclick = () => {
            document.getElementById('modal-new-item').classList.remove('hidden');
        };

        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.currentTarget.dataset.close;
                this.closeModal(modalId);
            });
        });

        // Formulario Nuevo Ítem
        document.getElementById('form-new-item').onsubmit = (e) => this.handleCreateNewItem(e);

        // Controles Cámara
        document.getElementById('btn-capture').onclick = () => this.takePhoto();
        document.getElementById('btn-retry').onclick = () => this.retryPhoto();
        document.getElementById('btn-confirm-entry').onclick = () => this.confirmEntry();

        // Botón Finalizar
        document.getElementById('btn-finish').onclick = () => this.handleFinish();
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
        if (modalId === 'modal-camera') {
            this.camera.stop(); // Asegurar que la cámara se apague al cerrar
        }
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    new ToolsManager();
});

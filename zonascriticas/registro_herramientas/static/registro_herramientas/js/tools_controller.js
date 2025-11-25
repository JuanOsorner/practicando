/**
 * tools_controller.js
 * Controlador Principal de la App de Herramientas.
 * Gestiona: Listado Principal (Carrito), Cámara, Edición y Comunicación con el Panel.
 */

import { api } from '/static/home/js/core/api.js';
import { ui } from '/static/home/js/core/ui.js';
import { imageUtils } from '/static/home/js/core/image.js';
import { CameraController } from '/static/home/js/core/camera.js';
import { InventoryPanel } from './inventory_panel.js';
import { toolsUI } from './tools_ui.js';

class ToolsManager {
    constructor() {
        this.container = document.getElementById('tools-app');
        
        // Mapeo de URLs
        this.urls = {
            inventario: this.container.dataset.urlInventario,
            crear: this.container.dataset.urlCrear,
            registrar: this.container.dataset.urlRegistrar,
            finalizar: this.container.dataset.urlFinalizar,
            dashboard: this.container.dataset.urlDashboard
        };

        // Estado
        this.fullInventory = []; // Lista plana con todos los ítems
        this.admittedItems = []; // Lista de ítems ya ingresados
        this.currentTab = 'todos'; // Pestaña actual
        this.searchTerm = '';    // Buscador
        
        this.selectedItem = null;   // Ítem en proceso
        this.capturedBlob = null;   // Foto en memoria

        // Módulos
        this.camera = new CameraController(document.getElementById('camera-video'));

        // Panel Lateral
        this.inventoryPanel = new InventoryPanel(
            () => this.loadInventory(),             // OnCreated: Recargar datos del backend
            (item) => this.selectItemDirectly(item) // OnSelect: Añadir al carrito directamente
        );

        this.init();
    }

    async init() {
        await this.loadInventory();
        this.setupEventListeners();
    }

    // =================================================
    // === 1. LÓGICA DE DATOS ===
    // =================================================

    async loadInventory() {
        try {
            const response = await api.get(this.urls.inventario);
            const data = response.data;

            // Aplanamos para tener una lista maestra
            this.fullInventory = [...data.herramientas, ...data.computo];

            // Persistencia: Recuperar los que ya tienen flag 'ingresado' desde el backend
            this.admittedItems = this.fullInventory.filter(item => item.ingresado);

            this.renderMainList();
            this.updateCounter();

        } catch (error) {
            ui.showError("No se pudo cargar el inventario: " + error.message);
        }
    }

    /**
     * Método llamado por el Panel cuando el usuario selecciona un ítem.
     * Lo añade visualmente a la lista principal.
     */
    async selectItemDirectly(item) {
        ui.showLoading('Añadiendo...');
        try {
            const formData = new FormData();
            formData.append('id_inventario', item.id);
            const urlAgregar = '/herramientas/api/carrito/agregar/'; 
            
            // 1. Recibimos la respuesta completa
            const response = await api.post(urlAgregar, formData);
            
            ui.hideLoading();

            // 2. Usamos el ítem que nos devolvió el servidor (que viene con datos frescos)
            const updatedItem = response.item || item; 
            updatedItem.ingresado = true;

            // 3. Actualizamos listas
            if (!this.admittedItems.find(i => i.id === updatedItem.id)) {
                this.admittedItems.push(updatedItem);
            }
            
            // Renderizamos
            this.renderMainList();
            this.updateCounter();
            
            // Actualizamos visualmente el panel lateral
            this.inventoryPanel.open(this.fullInventory, this.admittedItems.map(i => i.id));
            
        } catch (error) {
            ui.hideLoading();
            ui.showError("Error: " + error.message);
        }
    }

    // =================================================
    // === 2. RENDERIZADO LISTA PRINCIPAL ===
    // =================================================

    renderMainList() {
        const listContainer = document.getElementById('inventory-list');
        listContainer.innerHTML = '';

        // Filtrado Visual (Pestaña + Buscador)
        const itemsToShow = this.admittedItems.filter(item => {
            let matchCat = true;
            if (this.currentTab !== 'todos') {
                const categoryFilter = this.currentTab === 'computo' ? 'COMPUTO' : 'HERRAMIENTA';
                matchCat = item.categoria === categoryFilter;
            }

            const matchText = !this.searchTerm || 
                              item.nombre.toLowerCase().includes(this.searchTerm) ||
                              (item.marca || '').toLowerCase().includes(this.searchTerm);
            return matchCat && matchText;
        });

        // Estado Vacío
        if (itemsToShow.length === 0) {
            const msg = this.searchTerm ? 'No se encontraron coincidencias.' : 'No hay equipos ingresados.';
            listContainer.innerHTML = `
                <div class="loading-state" style="text-align:center; padding:40px; color:#999;">
                    <i class="fas fa-box-open fa-3x" style="margin-bottom:15px; opacity:0.3;"></i>
                    <p>${msg}</p>
                </div>`;
            return;
        }

        // Renderizar Cards
        itemsToShow.forEach(item => {
            const cardHTML = toolsUI.createMainCard(item);
            const template = document.createElement('template');
            template.innerHTML = cardHTML.trim();
            const cardEl = template.content.firstChild;

            // Botón Retirar (Basura)
            const btnRemove = cardEl.querySelector('.btn-remove-item');
            if (btnRemove) {
                btnRemove.onclick = (e) => {
                    e.stopPropagation();
                    this.removeItem(item);
                };
            }

            // Botón Editar (Lápiz) -> Abre cámara para actualizar evidencia/obs
            const btnEdit = cardEl.querySelector('.btn-edit-main');
            if (btnEdit) {
                btnEdit.onclick = (e) => {
                    e.stopPropagation();
                    this.openCameraForEntry(item); 
                };
            }

            // Clic en Card -> Ver Detalle Ampliado
            cardEl.onclick = () => this.showItemDetail(item);

            listContainer.appendChild(cardEl);
        });
    }

    updateCounter() {
        const count = this.admittedItems.length;
        document.getElementById('counter-text').textContent = count;
    }

    // =================================================
    // === 3. DETALLES Y MODALES ===
    // =================================================

    showItemDetail(item) {
        const imgUrl = item.foto || 'https://via.placeholder.com/400x300?text=Sin+Foto';
        const obs = item.observaciones || '<i>Sin observaciones</i>';

        Swal.fire({
            title: `<h3 style="color:#352460; margin:0;">${item.nombre}</h3>`,
            html: `
                <div style="text-align:left; font-size:0.95em; color:#555; line-height:1.6;">
                    <p><strong>Marca/Serial:</strong> ${item.marca || 'N/A'}</p>
                    <p><strong>Categoría:</strong> <span class="category-badge ${item.categoria === 'COMPUTO' ? 'badge-computo' : 'badge-tool'}">${item.categoria}</span></p>
                    <div style="background:#f9f9f9; padding:10px; border-radius:8px; margin-top:10px; border:1px solid #eee;">
                        <strong style="display:block; margin-bottom:5px; color:#333;">Observaciones de ingreso:</strong>
                        ${obs}
                    </div>
                </div>
            `,
            imageUrl: imgUrl,
            imageHeight: 200,
            imageAlt: 'Evidencia',
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-camera"></i> Cambiar Foto/Obs',
            cancelButtonText: 'Cerrar',
            confirmButtonColor: '#352460',
            cancelButtonColor: '#aaa',
            background: '#fff',
            customClass: { popup: 'swal-corporativo' } 
        }).then((result) => {
            if (result.isConfirmed) {
                this.openCameraForEntry(item);
            }
        });
    }

    // =================================================
    // === 4. GESTIÓN DE CÁMARA (EVIDENCIA) ===
    // =================================================

    async openCameraForEntry(item) {
        this.selectedItem = item;
        
        // Reset UI Modal
        document.getElementById('camera-video').classList.remove('hidden');
        document.getElementById('camera-preview').classList.add('hidden');
        document.getElementById('btn-capture').classList.remove('hidden');
        document.getElementById('btn-gallery').classList.remove('hidden');
        document.getElementById('post-capture-actions').classList.add('hidden');
        
        // Precargar observaciones si existen (Edición)
        document.getElementById('entry-observaciones').value = item.observaciones || '';

        document.getElementById('modal-camera').classList.remove('hidden');

        try { await this.camera.start(); } 
        catch (e) { ui.showError("Error al iniciar cámara: " + e.message); }
    }

    async processEvidence(blobOrFile) {
        try {
            this.capturedBlob = await imageUtils.compress(blobOrFile, 800, 0.7);
            
            const url = URL.createObjectURL(this.capturedBlob);
            const img = document.getElementById('camera-preview');
            img.src = url;
            img.classList.remove('hidden');
            
            // UI Switch: Ocultar video, mostrar preview y botones de guardar
            document.getElementById('camera-video').classList.add('hidden');
            document.getElementById('btn-capture').classList.add('hidden');
            document.getElementById('btn-gallery').classList.add('hidden');
            document.getElementById('post-capture-actions').classList.remove('hidden');
            
            this.camera.stop(); // Ahorrar batería

        } catch (e) { ui.showError("Error procesando imagen: " + e.message); }
    }

    async takePhoto() {
        try {
            const blob = await this.camera.takePhoto();
            this.processEvidence(blob);
        } catch (e) { ui.showError(e.message); }
    }

    retryPhoto() {
        // Reiniciar UI
        document.getElementById('camera-preview').classList.add('hidden');
        document.getElementById('camera-video').classList.remove('hidden');
        document.getElementById('post-capture-actions').classList.add('hidden');
        document.getElementById('btn-capture').classList.remove('hidden');
        document.getElementById('btn-gallery').classList.remove('hidden');
        
        this.camera.start();
    }

    async confirmEntry() {
        // Validar que haya foto O que sea edición de observación (si ya tenía foto)
        if (!this.capturedBlob && !this.selectedItem.foto) {
             // Si es nuevo ingreso, exigimos foto. Si es edición y no cambió foto, permitimos pasar.
             // Aquí somos estrictos: si no subió blob nuevo y no tiene foto URL previa, return.
             return; 
        }

        const obs = document.getElementById('entry-observaciones').value;
        const formData = new FormData();
        
        formData.append('id_inventario', this.selectedItem.id);
        formData.append('observaciones', obs);
        
        if (this.capturedBlob) {
            formData.append('foto_evidencia', this.capturedBlob, 'evidencia.jpg');
        }

        ui.showLoading('Guardando evidencia...');

        try {
            await api.post(this.urls.registrar, formData);
            
            ui.hideLoading();
            this.closeModal('modal-camera');
            ui.showNotification('Evidencia actualizada', 'success');

            // Actualizar estado local
            this.selectedItem.ingresado = true;
            this.selectedItem.observaciones = obs;
            
            if (this.capturedBlob) {
                this.selectedItem.foto = URL.createObjectURL(this.capturedBlob);
            }

            // Asegurar que está en la lista
            if (!this.admittedItems.find(i => i.id === this.selectedItem.id)) {
                this.admittedItems.push(this.selectedItem);
            }

            this.renderMainList();
            this.updateCounter();

        } catch (error) {
            ui.hideLoading();
            ui.showError(error.message);
        }
    }

    // =================================================
    // === 5. ACCIONES FINALES ===
    // =================================================

    async removeItem(item) {
        // Confirmación UX
        const confirm = await ui.confirm(
            '¿Retirar del ingreso?', 
            `"${item.nombre}" seguirá en tu inventario para futuras visitas.`, 
            'Sí, retirar'
        );
        
        if (!confirm) return;

        ui.showLoading('Retirando...');

        try {
            // 1. Petición al Backend (Fix Zombie)
            const formData = new FormData();
            formData.append('id_inventario', item.id);
            const urlRemover = '/herramientas/api/carrito/remover/'; // Asegúrate de la ruta
            
            await api.post(urlRemover, formData);
            
            ui.hideLoading();

            // 2. Actualización Local (UI)
            this.admittedItems = this.admittedItems.filter(i => i.id !== item.id);
            
            // IMPORTANTE: Actualizar el flag en la lista maestra también
            const masterItem = this.fullInventory.find(i => i.id === item.id);
            if (masterItem) masterItem.ingresado = false;

            this.renderMainList();
            this.updateCounter();
            
            // Actualizar Panel Lateral (Quitar check verde)
            this.openPanel(); 
            
            ui.showNotification('Elemento retirado de la lista.', 'info');

        } catch (error) {
            ui.hideLoading();
            ui.showError("No se pudo retirar: " + error.message);
        }
    }

    async handleFinish() {
        if (this.admittedItems.length === 0) {
            const s = await ui.confirm('¿Sin equipos?', 'No has registrado nada. ¿Seguro que deseas finalizar?', 'Sí, finalizar');
            if (!s) return;
        }

        ui.showLoading('Finalizando ingreso...');
        try {
            await api.post(this.urls.finalizar, {});
            window.location.href = this.urls.dashboard;
        } catch (e) {
            ui.hideLoading();
            ui.showError(e.message);
        }
    }

    // =================================================
    // === 6. SETUP GLOBAL ===
    // =================================================

    openPanel() {
        const selectedIds = this.admittedItems.map(i => i.id);
        this.inventoryPanel.open(this.fullInventory, selectedIds);
    }

    setupEventListeners() {
        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTab = btn.dataset.category;
                this.renderMainList();
            });
        });

        // Buscador Principal
        const searchInput = document.getElementById('main-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.renderMainList();
            });
        }

        // Botón Flotante (+)
        document.getElementById('btn-open-new-modal').onclick = () => this.openPanel();

        // Cámara & Galería
        const fileInput = document.getElementById('evidence-file-input');
        document.getElementById('btn-gallery').onclick = () => fileInput.click();
        
        fileInput.onchange = (e) => { 
            if(e.target.files[0]) this.processEvidence(e.target.files[0]); 
        };

        document.getElementById('btn-capture').onclick = () => this.takePhoto();
        document.getElementById('btn-retry').onclick = () => this.retryPhoto();
        document.getElementById('btn-confirm-entry').onclick = () => this.confirmEntry();
        
        const closeCam = document.querySelector('[data-close="modal-camera"]');
        if (closeCam) closeCam.onclick = () => this.closeModal('modal-camera');

        // Botón Finalizar
        document.getElementById('btn-finish').onclick = () => this.handleFinish();
    }

    closeModal(id) {
        document.getElementById(id).classList.add('hidden');
        if (id === 'modal-camera') this.camera.stop();
    }
}

// Inicialización segura
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('tools-app')) {
        new ToolsManager();
    }
});
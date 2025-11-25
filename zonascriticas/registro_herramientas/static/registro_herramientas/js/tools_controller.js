/**
 * tools_controller.js
 * Controlador Maestro de la App de Herramientas.
 * * FUNCIONALIDADES:
 * 1. Carga y Renderizado de Inventario (Carrito).
 * 2. Gestión de "Bulk Add" (Desde el Panel Lateral).
 * 3. Gestión de "Bulk Delete" (Modo Selección en Lista Principal).
 * 4. Captura de Evidencia (Cámara/Galería).
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

        // Estado de Datos
        this.fullInventory = []; 
        this.admittedItems = []; 
        
        // Estado de UI
        this.currentTab = 'todos'; 
        this.searchTerm = '';    
        
        // Estado de Operaciones
        this.selectedItem = null;   // Ítem siendo editado (cámara)
        this.capturedBlob = null;   // Foto temporal
        
        // Estado Modo Eliminación (Bulk Delete)
        this.isDeleteMode = false;
        this.itemsToDelete = new Set();

        // Módulos
        this.camera = new CameraController(document.getElementById('camera-video'));

        // Inicializar Panel con Callback Masivo
        this.inventoryPanel = new InventoryPanel(
            () => this.loadInventory(),      // Al crear nuevo ítem
            (ids) => this.handleBulkAdd(ids) // Al confirmar selección masiva
        );

        this.init();
    }

    async init() {
        await this.loadInventory();
        this.setupEventListeners();
    }

    // =================================================
    // === 1. LÓGICA DE DATOS (Sincronización) ===
    // =================================================

    async loadInventory() {
        try {
            const response = await api.get(this.urls.inventario);
            const data = response.data;

            this.fullInventory = [...data.herramientas, ...data.computo];
            this.admittedItems = this.fullInventory.filter(item => item.ingresado);

            this.renderMainList();
            this.updateCounter();

        } catch (error) {
            ui.showError("No se pudo cargar el inventario: " + error.message);
        }
    }

    // =================================================
    // === 2. OPERACIONES MASIVAS (BULK ACTIONS) ===
    // =================================================

    /**
     * Recibe lista de IDs del Panel Lateral y los agrega al ingreso.
     */
    async handleBulkAdd(ids) {
        if (!ids || ids.length === 0) return;

        ui.showLoading(`Agregando ${ids.length} ítems...`);

        try {
            const urlBulk = '/herramientas/api/carrito/masivo/'; // Ruta backend
            const response = await api.post(urlBulk, {
                ids: ids,
                accion: 'AGREGAR'
            });

            ui.hideLoading();
            ui.showNotification(response.mensaje, 'success');
            
            // Recarga completa para asegurar consistencia
            await this.loadInventory();

        } catch (error) {
            ui.hideLoading();
            ui.showError("Error al agregar: " + error.message);
        }
    }

    /**
     * Confirma y ejecuta la eliminación de los ítems seleccionados en la lista principal.
     */
    async confirmBulkDelete() {
        if (this.itemsToDelete.size === 0) return;

        const confirm = await ui.confirm(
            '¿Retirar seleccionados?', 
            `Se retirarán ${this.itemsToDelete.size} elementos del ingreso actual.`, 
            'Sí, retirar'
        );
        
        if (!confirm) return;

        const ids = Array.from(this.itemsToDelete);
        ui.showLoading('Retirando...');

        try {
            const urlBulk = '/herramientas/api/carrito/masivo/';
            await api.post(urlBulk, {
                ids: ids,
                accion: 'REMOVER'
            });

            ui.hideLoading();
            ui.showNotification('Elementos retirados correctamente', 'info');
            
            this.toggleDeleteMode(false); // Salir del modo borrado
            await this.loadInventory();   // Recargar

        } catch (error) {
            ui.hideLoading();
            ui.showError(error.message);
        }
    }

    // =================================================
    // === 3. GESTIÓN DE UI (Renderizado y Modos) ===
    // =================================================

    toggleDeleteMode(forceState = null) {
        this.isDeleteMode = forceState !== null ? forceState : !this.isDeleteMode;
        this.itemsToDelete.clear(); // Limpiar selección previa

        // Actualizar Botón Toggle (Retirar / Cancelar)
        const btn = document.getElementById('btn-toggle-delete-mode');
        const actionsWrapper = document.getElementById('delete-actions-wrapper');
        const mainFooter = document.querySelector('.floating-footer');
        const fabAdd = document.querySelector('.fab-add');

        if (this.isDeleteMode) {
            // Activar Modo Borrado
            btn.classList.add('active');
            btn.innerHTML = '<i class="fas fa-times"></i> Cancelar';
            
            actionsWrapper.classList.remove('hidden');
            if(mainFooter) mainFooter.style.display = 'none'; // Ocultar "Finalizar"
            if(fabAdd) fabAdd.style.display = 'none';         // Ocultar "+"
            
            ui.showNotification('Toca los elementos para marcarlos.', 'info');
        } else {
            // Volver a Normal
            btn.classList.remove('active');
            btn.innerHTML = '<i class="fas fa-trash-alt"></i> Retirar';
            
            actionsWrapper.classList.add('hidden');
            if(mainFooter) mainFooter.style.display = 'flex';
            if(fabAdd) fabAdd.style.display = 'flex';
        }

        this.renderMainList();
        this.updateDeleteCounter();
    }

    updateDeleteCounter() {
        const el = document.getElementById('delete-counter');
        if(el) el.textContent = this.itemsToDelete.size;
    }

    renderMainList() {
        const listContainer = document.getElementById('inventory-list');
        listContainer.innerHTML = '';

        // 1. Filtrado
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

        // 2. Estado Vacío
        if (itemsToShow.length === 0) {
            const msg = this.searchTerm ? 'No hay coincidencias.' : 'No hay equipos en el ingreso.';
            listContainer.innerHTML = `
                <div class="loading-state" style="text-align:center; padding:40px; color:#999;">
                    <i class="fas fa-box-open fa-3x" style="margin-bottom:15px; opacity:0.3;"></i>
                    <p>${msg}</p>
                </div>`;
            return;
        }

        // 3. Renderizar Cartas
        itemsToShow.forEach(item => {
            const cardHTML = toolsUI.createMainCard(item);
            const template = document.createElement('template');
            template.innerHTML = cardHTML.trim();
            const cardEl = template.content.firstChild;

            // LÓGICA VISUAL DE SELECCIÓN (Modo Borrado)
            if (this.isDeleteMode) {
                cardEl.classList.add('selection-mode');
                if (this.itemsToDelete.has(item.id)) {
                    cardEl.classList.add('selected');
                }
                // El clic selecciona/deselecciona
                cardEl.onclick = () => {
                    if (this.itemsToDelete.has(item.id)) this.itemsToDelete.delete(item.id);
                    else this.itemsToDelete.add(item.id);
                    this.renderMainList(); // Re-renderizar para ver cambios visuales
                    this.updateDeleteCounter();
                };
            } else {
                // Modo Normal: El clic abre detalle
                cardEl.onclick = () => this.showItemDetail(item);

                // Botones internos (solo funcionan en modo normal)
                const btnRemove = cardEl.querySelector('.btn-remove-item');
                if (btnRemove) {
                    btnRemove.onclick = (e) => {
                        e.stopPropagation();
                        this.removeItemSingle(item); // Borrado individual legado
                    };
                }
                const btnEdit = cardEl.querySelector('.btn-edit-main');
                if (btnEdit) {
                    btnEdit.onclick = (e) => {
                        e.stopPropagation();
                        this.openCameraForEntry(item); 
                    };
                }
            }

            listContainer.appendChild(cardEl);
        });
    }

    updateCounter() {
        const count = this.admittedItems.length;
        const el = document.getElementById('counter-text');
        if(el) el.textContent = count;
    }

    // =================================================
    // === 4. ELIMINACIÓN INDIVIDUAL (Legacy) ===
    // =================================================
    
    async removeItemSingle(item) {
        const confirm = await ui.confirm('¿Retirar?', `Sacar "${item.nombre}" del ingreso actual.`, 'Sí, retirar');
        if (!confirm) return;

        ui.showLoading('Retirando...');
        try {
            const urlRemover = '/herramientas/api/carrito/remover/'; 
            const formData = new FormData();
            formData.append('id_inventario', item.id);
            
            await api.post(urlRemover, formData);
            
            ui.hideLoading();
            this.admittedItems = this.admittedItems.filter(i => i.id !== item.id);
            
            // Actualizar flag en maestra
            const master = this.fullInventory.find(i => i.id === item.id);
            if(master) master.ingresado = false;

            this.renderMainList();
            this.updateCounter();
            ui.showNotification('Retirado.', 'info');
        } catch (error) {
            ui.hideLoading();
            ui.showError(error.message);
        }
    }

    // =================================================
    // === 5. GESTIÓN DE EVIDENCIA (CÁMARA) ===
    // =================================================

    showItemDetail(item) {
        const imgUrl = item.foto || 'https://via.placeholder.com/400x300?text=Sin+Foto';
        const obs = item.observaciones || '<i>Sin observaciones</i>';

        Swal.fire({
            title: `<h3 style="color:#352460; margin:0;">${item.nombre}</h3>`,
            html: `
                <div style="text-align:left; font-size:0.95em; color:#555; line-height:1.6;">
                    <p><strong>Marca:</strong> ${item.marca || 'N/A'}</p>
                    <div style="background:#f9f9f9; padding:10px; border-radius:8px; margin-top:10px; border:1px solid #eee;">
                        <strong style="display:block; margin-bottom:5px; color:#333;">Observaciones:</strong>
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
            background: '#fff',
            customClass: { popup: 'swal-corporativo' } 
        }).then((result) => {
            if (result.isConfirmed) this.openCameraForEntry(item);
        });
    }

    async openCameraForEntry(item) {
        this.selectedItem = item;
        this.capturedBlob = null; 
        
        // Reset UI Modal
        document.getElementById('camera-video').classList.remove('hidden');
        document.getElementById('camera-preview').classList.add('hidden');
        document.getElementById('btn-capture').classList.remove('hidden');
        document.getElementById('btn-gallery').classList.remove('hidden');
        document.getElementById('post-capture-actions').classList.add('hidden');
        
        document.getElementById('entry-observaciones').value = item.observaciones || '';
        document.getElementById('modal-camera').classList.remove('hidden');

        try { await this.camera.start(); } 
        catch (e) { ui.showError("Error cámara: " + e.message); }
    }

    async processEvidence(blobOrFile) {
        try {
            this.capturedBlob = await imageUtils.compress(blobOrFile, 800, 0.7);
            const url = URL.createObjectURL(this.capturedBlob);
            const img = document.getElementById('camera-preview');
            img.src = url;
            img.classList.remove('hidden');
            
            document.getElementById('camera-video').classList.add('hidden');
            document.getElementById('btn-capture').classList.add('hidden');
            document.getElementById('btn-gallery').classList.add('hidden');
            document.getElementById('post-capture-actions').classList.remove('hidden');
            
            this.camera.stop();
        } catch (e) { ui.showError("Error imagen: " + e.message); }
    }

    async takePhoto() {
        try {
            const blob = await this.camera.takePhoto();
            this.processEvidence(blob);
        } catch (e) { ui.showError(e.message); }
    }

    retryPhoto() {
        document.getElementById('camera-preview').classList.add('hidden');
        document.getElementById('camera-video').classList.remove('hidden');
        document.getElementById('post-capture-actions').classList.add('hidden');
        document.getElementById('btn-capture').classList.remove('hidden');
        document.getElementById('btn-gallery').classList.remove('hidden');
        this.camera.start();
    }

    async confirmEntry() {
        const obs = document.getElementById('entry-observaciones').value;
        const formData = new FormData();
        
        formData.append('id_inventario', this.selectedItem.id);
        formData.append('observaciones', obs);
        
        if (this.capturedBlob) {
            formData.append('foto_evidencia', this.capturedBlob, 'evidencia.jpg');
        }

        ui.showLoading('Guardando...');

        try {
            await api.post(this.urls.registrar, formData);
            
            ui.hideLoading();
            this.closeModal('modal-camera');
            ui.showNotification('Guardado', 'success');

            // Actualización local rápida
            this.selectedItem.ingresado = true;
            this.selectedItem.observaciones = obs;
            if (this.capturedBlob) this.selectedItem.foto = URL.createObjectURL(this.capturedBlob);

            this.renderMainList();

        } catch (error) {
            ui.hideLoading();
            ui.showError(error.message);
        }
    }

    // =================================================
    // === 6. SETUP INICIAL ===
    // =================================================

    async handleFinish() {
        if (this.admittedItems.length === 0) {
            const s = await ui.confirm('¿Sin equipos?', 'No has registrado nada. ¿Seguro que deseas finalizar?', 'Sí, finalizar');
            if (!s) return;
        }
        ui.showLoading('Finalizando...');
        try {
            await api.post(this.urls.finalizar, {});
            window.location.href = this.urls.dashboard;
        } catch (e) {
            ui.hideLoading();
            ui.showError(e.message);
        }
    }

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

        // Buscador
        const searchInput = document.getElementById('main-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.renderMainList();
            });
        }

        // Botón Retirar (Toggle Modo Borrado)
        const btnToggleDelete = document.getElementById('btn-toggle-delete-mode');
        if (btnToggleDelete) {
            btnToggleDelete.onclick = () => this.toggleDeleteMode();
        }

        // Botones Confirmación Borrado
        const btnConfirmDel = document.getElementById('btn-confirm-delete');
        if(btnConfirmDel) btnConfirmDel.onclick = () => this.confirmBulkDelete();
        
        const btnCancelDel = document.getElementById('btn-cancel-delete');
        if(btnCancelDel) btnCancelDel.onclick = () => this.toggleDeleteMode(false);

        // Panel (+)
        document.getElementById('btn-open-new-modal').onclick = () => this.openPanel();

        // Cámara
        const fileInput = document.getElementById('evidence-file-input');
        document.getElementById('btn-gallery').onclick = () => fileInput.click();
        fileInput.onchange = (e) => { if(e.target.files[0]) this.processEvidence(e.target.files[0]); };

        document.getElementById('btn-capture').onclick = () => this.takePhoto();
        document.getElementById('btn-retry').onclick = () => this.retryPhoto();
        document.getElementById('btn-confirm-entry').onclick = () => this.confirmEntry();
        
        const closeCam = document.querySelector('[data-close="modal-camera"]');
        if (closeCam) closeCam.onclick = () => this.closeModal('modal-camera');

        // Finalizar
        document.getElementById('btn-finish').onclick = () => this.handleFinish();
    }

    closeModal(id) {
        document.getElementById(id).classList.add('hidden');
        if (id === 'modal-camera') this.camera.stop();
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('tools-app')) {
        new ToolsManager();
    }
});
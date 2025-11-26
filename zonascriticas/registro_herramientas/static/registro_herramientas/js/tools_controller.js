/**
 * tools_controller.js (REFACTORIZADO V2)
 * Implementa apiService para limpieza arquitectónica.
 */

import { ui } from '/static/home/js/core/ui.js';
import { CameraModalManager } from '/static/home/js/core/camera_ui.js';
// IMPORTAMOS NUESTRO NUEVO SERVICIO
import * as toolsApi from './apiService.js';
import { InventoryPanel } from './inventory_panel.js';
import { toolsUI } from './tools_ui.js';

class ToolsManager {
    constructor() {
        this.container = document.getElementById('tools-app');
        
        // Solo conservamos la URL de redirección, las APIs ya no viven aquí.
        this.dashboardUrl = this.container.dataset.urlDashboard;

        // Estado
        this.fullInventory = []; 
        this.admittedItems = []; 
        this.currentTab = 'todos'; 
        this.searchTerm = '';    
        
        this.selectedItem = null;   
        this.isDeleteMode = false;
        this.itemsToDelete = new Set();

        // Módulos
        this.cameraModal = new CameraModalManager('modal-camera');

        this.inventoryPanel = new InventoryPanel(
            () => this.loadInventory(),
            (ids) => this.handleBulkAdd(ids)
        );

        this.init();
    }

    async init() {
        await this.loadInventory();
        this.setupEventListeners();
    }

    // --- LÓGICA DE DATOS ---

    async loadInventory() {
        try {
            // REFACTOR: Uso de servicio
            const response = await toolsApi.fetchInventario();
            
            // la data (payload) gracias a api.js
            const data = response; 

            // Validamos que existan los arrays para evitar errores si el backend falla silenciosamente
            const herramientas = data.herramientas || [];
            const computo = data.computo || [];

            this.fullInventory = [...herramientas, ...computo];
            this.admittedItems = this.fullInventory.filter(item => item.ingresado);

            this.renderMainList();
            this.updateCounter();

        } catch (error) {
            ui.showError("Error cargando inventario: " + error.message);
        }
    }

    // --- OPERACIONES MASIVAS ---

    async handleBulkAdd(ids) {
        if (!ids || ids.length === 0) return;
        ui.showLoading(`Agregando ${ids.length} ítems...`);

        try {
            const response = await toolsApi.gestionMasiva(ids, 'AGREGAR');
            
            ui.hideLoading();
            // Nota: Como api.js devuelve el payload, el mensaje puede perderse si no venía en 'data'.
            // Mensaje genérico de éxito o el que venga en el payload 'resumen'
            ui.showNotification('Ítems agregados correctamente', 'success'); 
            
            await this.loadInventory();

        } catch (error) {
            ui.hideLoading();
            ui.showError("Error al agregar: " + error.message);
        }
    }

    async confirmBulkDelete() {
        if (this.itemsToDelete.size === 0) return;

        const confirm = await ui.confirm('¿Retirar seleccionados?', `Se retirarán ${this.itemsToDelete.size} elementos.`, 'Sí, retirar');
        if (!confirm) return;

        const ids = Array.from(this.itemsToDelete);
        ui.showLoading('Retirando...');

        try {
            // REFACTOR: Uso de servicio
            await toolsApi.gestionMasiva(ids, 'REMOVER');

            ui.hideLoading();
            ui.showNotification('Elementos retirados', 'info');
            
            this.toggleDeleteMode(false); 
            await this.loadInventory();   

        } catch (error) {
            ui.hideLoading();
            ui.showError(error.message);
        }
    }

    // --- GESTIÓN UI ---

    toggleDeleteMode(forceState = null) {
        this.isDeleteMode = forceState !== null ? forceState : !this.isDeleteMode;
        this.itemsToDelete.clear(); 

        const btn = document.getElementById('btn-toggle-delete-mode');
        const actionsWrapper = document.getElementById('delete-actions-wrapper');
        const mainFooter = document.querySelector('.floating-footer');
        const fabAdd = document.querySelector('.fab-add');

        if (this.isDeleteMode) {
            btn.classList.add('active');
            btn.innerHTML = '<i class="fas fa-times"></i> Cancelar';
            actionsWrapper.classList.remove('hidden');
            if(mainFooter) mainFooter.style.display = 'none'; 
            if(fabAdd) fabAdd.style.display = 'none';         
            ui.showNotification('Selecciona para retirar.', 'info');
        } else {
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

        if (itemsToShow.length === 0) {
            listContainer.innerHTML = `<div class="loading-state" style="text-align:center; padding:40px; color:#999;"><p>Sin resultados.</p></div>`;
            return;
        }

        itemsToShow.forEach(item => {
            const cardHTML = toolsUI.createMainCard(item);
            const template = document.createElement('template');
            template.innerHTML = cardHTML.trim();
            const cardEl = template.content.firstChild;

            if (this.isDeleteMode) {
                cardEl.classList.add('selection-mode');
                if (this.itemsToDelete.has(item.id)) cardEl.classList.add('selected');
                cardEl.onclick = () => {
                    if (this.itemsToDelete.has(item.id)) this.itemsToDelete.delete(item.id);
                    else this.itemsToDelete.add(item.id);
                    this.renderMainList();
                    this.updateDeleteCounter();
                };
            } else {
                cardEl.onclick = () => this.showItemDetail(item);
                
                // Botones individuales (Legacy support)
                const btnEdit = cardEl.querySelector('.btn-edit-main');
                if (btnEdit) {
                    btnEdit.onclick = (e) => { e.stopPropagation(); this.openCameraForEntry(item); };
                }
            }
            listContainer.appendChild(cardEl);
        });
    }

    updateCounter() {
        const el = document.getElementById('counter-text');
        if(el) el.textContent = this.admittedItems.length;
    }

    // --- GESTIÓN EVIDENCIA ---

    showItemDetail(item) {
        // ... (Código Swal igual que antes) ...
        // Solo para abreviar en esta respuesta, mantén tu lógica de Swal aquí.
        const imgUrl = item.foto || 'https://via.placeholder.com/400x300?text=Sin+Foto';
        Swal.fire({
            title: item.nombre,
            text: item.marca,
            imageUrl: imgUrl,
            imageHeight: 200,
            showCancelButton: true,
            confirmButtonText: 'Cambiar Foto/Obs',
            confirmButtonColor: '#352460'
        }).then((result) => {
            if (result.isConfirmed) this.openCameraForEntry(item);
        });
    }

    openCameraForEntry(item) {
        this.selectedItem = item;
        this.cameraModal.open({
            initialObservaciones: item.observaciones,
            onConfirm: (data) => this.saveEvidence(data)
        });
    }

    async saveEvidence({ blob, observaciones }) {
        
        const formData = new FormData();
        formData.append('id_inventario', this.selectedItem.id);
        formData.append('observaciones', observaciones);
        if (blob) formData.append('foto_evidencia', blob, 'evidencia.jpg');

        ui.showLoading('Guardando...');

        try {
            await toolsApi.registrarEvidencia(formData); // api.js lanza error si falla
            
            ui.hideLoading();
            this.cameraModal.close();
            ui.showNotification('Evidencia guardada', 'success');

            // Actualización optimista local
            this.selectedItem.ingresado = true;
            this.selectedItem.observaciones = observaciones;
            if (blob) this.selectedItem.foto = URL.createObjectURL(blob);

            this.renderMainList();

        } catch (error) {
            ui.hideLoading();
            ui.showError(error.message);
        }
    }

    // --- FINALIZAR ---

    async handleFinish() {
        if (this.admittedItems.length === 0) {
            const s = await ui.confirm('¿Finalizar sin equipos?', 'No has registrado nada.', 'Sí, finalizar');
            if (!s) return;
        }
        ui.showLoading('Finalizando...');
        try {
            // REFACTOR: Uso de servicio
            await toolsApi.finalizarIngreso();
            window.location.href = this.dashboardUrl;
        } catch (e) {
            ui.hideLoading();
            ui.showError(e.message);
        }
    }

    setupEventListeners() {
        // ... (Toda la configuración de eventos igual que antes, tabs, search, etc.) ...
        // Reutiliza tu setupEventListeners anterior, es compatible.
        
        document.getElementById('btn-toggle-delete-mode').onclick = () => this.toggleDeleteMode();
        document.getElementById('btn-confirm-delete').onclick = () => this.confirmBulkDelete();
        document.getElementById('btn-cancel-delete').onclick = () => this.toggleDeleteMode(false);
        document.getElementById('btn-open-new-modal').onclick = () => this.inventoryPanel.open(this.fullInventory, this.admittedItems.map(i => i.id));
        document.getElementById('btn-finish').onclick = () => this.handleFinish();
        
        // Tabs y Search... (copiar de la versión anterior)
        const searchInput = document.getElementById('main-search-input');
        if (searchInput) searchInput.addEventListener('input', (e) => { this.searchTerm = e.target.value.toLowerCase(); this.renderMainList(); });
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTab = btn.dataset.category;
                this.renderMainList();
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('tools-app')) {
        new ToolsManager();
    }
});
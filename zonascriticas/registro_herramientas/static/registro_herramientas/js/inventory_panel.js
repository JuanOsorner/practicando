/**
 * inventory_panel.js
 * Controlador específico para el Panel de Gestión de Inventario.
 * CORREGIDO: Compatible con el nuevo tools_ui.js y global.css
 */

import { GlobalPanel } from '/static/home/js/core/panel.js';
import { imageUtils } from '/static/home/js/core/image.js';
import { ui } from '/static/home/js/core/ui.js';
import { toolsUI } from './tools_ui.js';
import * as toolsApi from './apiService.js';

export class InventoryPanel {
    
    constructor(onItemCreated, onBulkAdd) {
        this.onItemCreated = onItemCreated; 
        this.onBulkAdd = onBulkAdd; 
        
        // Estado de Datos
        this.currentInventory = [];
        this.selectedIdsCache = []; 
        this.localSelection = new Set(); 
        
        // Estado de Formulario
        this.tempImageBlob = null;
        this.isEditing = false;
        this.editingItemId = null;
        
        // Estado de Filtros
        this.filterState = {
            text: '',
            category: 'ALL'
        };
    }

    open(inventoryList, alreadyAddedIds = []) {
        try {
            this.currentInventory = inventoryList;
            this.selectedIdsCache = alreadyAddedIds;
            this.localSelection.clear(); 

            // Resetear estado visual
            this.filterState = { text: '', category: 'ALL' };
            this.isEditing = false;
            this.editingItemId = null;
            this.tempImageBlob = null;

            // 1. Inyectar HTML Base
            const htmlContent = toolsUI.getPanelContent();
            GlobalPanel.open({
                title: 'Gestionar Equipos',
                contentHTML: htmlContent
            });

            // 2. Renderizar lista inicial
            this._renderFilteredList();

            // 3. Conectar eventos
            this._attachEvents();

        } catch (error) {
            console.error("Error abriendo panel:", error);
            ui.showError("No se pudo cargar el panel.");
        }
    }

    // =================================================
    // === LÓGICA DE LISTADO, FILTROS Y SELECCIÓN ===
    // =================================================

    _renderFilteredList() {
        const container = GlobalPanel.getBodyElement().querySelector('#panel-inventory-grid');
        if (!container) return;
        
        container.innerHTML = '';

        // 1. Filtrar Datos
        const filteredItems = this.currentInventory.filter(item => {
            const searchText = this.filterState.text.toLowerCase();
            const matchText = item.nombre.toLowerCase().includes(searchText) || 
                              (item.marca || '').toLowerCase().includes(searchText) ||
                              (item.serial || '').toLowerCase().includes(searchText);
            
            const matchCat = this.filterState.category === 'ALL' || item.categoria === this.filterState.category;
            return matchText && matchCat;
        });

        // 2. Actualizar Botón Flotante
        this._updateFloatingButton();

        // 3. Estado Vacío
        if (filteredItems.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; grid-column:1/-1; padding:30px; color:#9ca3af;">
                    <i class="fas fa-search" style="font-size: 1.5em; margin-bottom: 10px; opacity: 0.5;"></i>
                    <p>No se encontraron equipos.</p>
                </div>`;
            return;
        }

        // 4. Renderizar Cards
        filteredItems.forEach(item => {
            const inDb = this.selectedIdsCache.includes(item.id);
            const inLocal = this.localSelection.has(item.id);
            
            const cardHTML = toolsUI.createCompactCard(item, inDb || inLocal);
            
            const template = document.createElement('template');
            template.innerHTML = cardHTML.trim();
            const cardEl = template.content.firstChild;

            // Eventos
            cardEl.addEventListener('click', (e) => this._handleGridClick(e, item, inDb));

            container.appendChild(cardEl);
        });
    }

    _handleGridClick(e, item, isAlreadyInDb) {
        // A. Botón EDITAR 
        if (e.target.closest('.btn-edit-item')) {
            e.stopPropagation();
            this._loadItemForEdit(item);
            return;
        }

        // B. Botón ELIMINAR 
        if (e.target.closest('.btn-delete-item')) {
            e.stopPropagation();
            this._handleDelete(item.id);
            return;
        }

        // C. Selección Principal (Logica Bulk)
        if (isAlreadyInDb) {
            ui.showNotification('Este ítem ya está en la lista.', 'info');
            return;
        }

        if (this.localSelection.has(item.id)) {
            this.localSelection.delete(item.id);
        } else {
            this.localSelection.add(item.id);
        }

        this._renderFilteredList();
    }

    /**
     * CORRECCIÓN: Apuntamos al nuevo contenedor .panel-inventory-list-header
     */
    _updateFloatingButton() {
        // CORRECCIÓN: Selector actualizado para coincidir con tools_ui.js
        const container = GlobalPanel.getBodyElement().querySelector('.panel-inventory-list-header');
        
        // Si por alguna razón el HTML no cargó bien, salimos para evitar el crash
        if (!container) return; 

        let btn = container.querySelector('#btn-bulk-add');
        
        if (this.localSelection.size > 0) {
            if (!btn) {
                btn = document.createElement('button');
                btn.id = 'btn-bulk-add';
                btn.className = 'btn-bulk-confirm'; // Clase CSS global
                btn.onclick = () => this._confirmBulkAdd();
                container.appendChild(btn);
            }
            btn.innerHTML = `<i class="fas fa-plus"></i> Agregar (${this.localSelection.size})`;
            btn.style.display = 'block';
        } else {
            if (btn) btn.style.display = 'none';
        }
    }

    _confirmBulkAdd() {
        if (this.onBulkAdd && this.localSelection.size > 0) {
            this.onBulkAdd(Array.from(this.localSelection));
            GlobalPanel.close();
        }
    }

    // =================================================
    // === GESTIÓN DE EVENTOS DOM ===
    // =================================================

    _attachEvents() {
        const container = GlobalPanel.getBodyElement();
        
        // Buscador
        const searchInput = container.querySelector('#panel-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterState.text = e.target.value;
                this._renderFilteredList();
            });
        }

        // CORRECCIÓN: Filtros Categoría (Clase nueva .filter-chip-sm)
        const chips = container.querySelectorAll('.filter-chip-sm');
        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                chips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.filterState.category = chip.dataset.filter;
                this._renderFilteredList();
            });
        });

        // NUEVO: Botones de Categoría en Formulario (Nuevo diseño)
        const catBtns = container.querySelectorAll('.cat-option-btn');
        const hiddenInput = container.querySelector('#hidden-categoria');

        if (catBtns.length > 0 && hiddenInput) {
            catBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    catBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    hiddenInput.value = btn.dataset.value;
                });
            });
        }

        // Formulario Foto Trigger
        const photoTrigger = container.querySelector('#trigger-ref-upload');
        const fileInput = container.querySelector('#foto_referencia');

        if (photoTrigger && fileInput) {
            photoTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                fileInput.click();
            });
            
            fileInput.addEventListener('change', (e) => { 
                if (e.target.files && e.target.files[0]) {
                    this._handleImageSelection(e, container); 
                }
            });
        }

        // Submit Formulario
        const form = container.querySelector('#inventory-form');
        if (form) {
            form.addEventListener('submit', (e) => this._handleSubmit(e));
        }
    }

    // =================================================
    // === LÓGICA DE FORMULARIO (CREAR / EDITAR) ===
    // =================================================

    async _handleImageSelection(e, container) {
        const file = e.target.files[0];
        if (!file) return;

        const preview = container.querySelector('#ref-preview');
        const placeholder = container.querySelector('#ref-placeholder'); // Nuevo

        try {
            this.tempImageBlob = await imageUtils.compress(file, 600, 0.7);
            const base64 = await imageUtils.toBase64(this.tempImageBlob);
            
            if (preview) {
                preview.src = base64;
                preview.style.display = 'block'; 
                // Ocultar placeholder para limpieza visual
                if(placeholder) placeholder.style.opacity = '0';
            }

        } catch (error) {
            ui.showError("Error imagen: " + error.message);
        }
    }

    async _handleSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        if (this.tempImageBlob) {
            formData.set('foto_referencia', this.tempImageBlob, 'ref_item.jpg');
        }

        ui.showLoading(this.isEditing ? 'Actualizando...' : 'Guardando...');

        try {
            const response = await toolsApi.saveItem(formData, this.editingItemId);
            
            ui.hideLoading();
            ui.showNotification(response.mensaje, 'success');
            
            this._resetFormState();
            
            // Actualización Local
            if (response.item) {
                const newItem = response.item;
                if(!newItem.categoria) newItem.categoria = formData.get('categoria');
                if(!newItem.foto && this.tempImageBlob) newItem.foto = URL.createObjectURL(this.tempImageBlob);

                if (this.isEditing) {
                    const index = this.currentInventory.findIndex(i => i.id == this.editingItemId);
                    if (index !== -1) this.currentInventory[index] = { ...this.currentInventory[index], ...newItem };
                } else {
                    this.currentInventory.unshift(newItem);
                }
                
                this._renderFilteredList();
            }

            if (this.onItemCreated) this.onItemCreated();

        } catch (error) {
            ui.hideLoading();
            ui.showError(error.message);
        }
    }

    _resetFormState() {
        this.isEditing = false;
        this.editingItemId = null;
        this.tempImageBlob = null;

        const container = GlobalPanel.getBodyElement();
        if (!container) return;

        const form = container.querySelector('#inventory-form');
        if (form) {
            form.reset();
            form.nombre.disabled = false;
            form.marca_serial.disabled = false;
            
            // Reset Categoría Visual
            const catBtns = container.querySelectorAll('.cat-option-btn');
            if(catBtns.length) {
                catBtns.forEach(b => b.classList.remove('active'));
                catBtns[0].classList.add('active'); // Default Herramienta
                container.querySelector('#hidden-categoria').value = 'HERRAMIENTA';
            }

            // Restaurar Botón
            const btn = form.querySelector('button[type="submit"]');
            btn.innerHTML = '<i class="fas fa-plus"></i> Guardar Ítem';
        }
        
        // Reset Imagen
        const preview = container.querySelector('#ref-preview');
        const placeholder = container.querySelector('#ref-placeholder');
        if (preview) {
            preview.src = '';
            preview.style.display = 'none';
            if(placeholder) placeholder.style.opacity = '1';
        }
        
        container.querySelector('.panel-content-wrapper').scrollTo({ top: 0, behavior: 'smooth' });
    }

    _loadItemForEdit(item) {
        this.isEditing = true;
        this.editingItemId = item.id;
        
        const container = GlobalPanel.getBodyElement();
        const form = container.querySelector('#inventory-form');
        
        // Cargar datos
        form.nombre.value = item.nombre;
        form.marca_serial.value = item.marca || ''; 
        
        // Cargar Categoría Visual
        const catValue = item.categoria || 'HERRAMIENTA';
        container.querySelector('#hidden-categoria').value = catValue;
        const catBtns = container.querySelectorAll('.cat-option-btn');
        catBtns.forEach(b => {
            if(b.dataset.value === catValue) b.classList.add('active');
            else b.classList.remove('active');
        });

        if(form.observaciones_iniciales) form.observaciones_iniciales.value = item.observaciones || '';

        // Bloquear Identidad
        form.nombre.disabled = true;
        form.marca_serial.disabled = true;

        // UI Botón
        const btn = form.querySelector('button[type="submit"]');
        btn.innerHTML = '<i class="fas fa-sync"></i> Actualizar';

        // Cargar Foto
        const preview = container.querySelector('#ref-preview');
        const placeholder = container.querySelector('#ref-placeholder');
        if (item.foto) {
            preview.src = item.foto;
            preview.style.display = 'block';
            if(placeholder) placeholder.style.opacity = '0';
        } else {
            preview.style.display = 'none';
            if(placeholder) placeholder.style.opacity = '1';
        }

        container.querySelector('.panel-content-wrapper').scrollTo({ top: 0, behavior: 'smooth' });
        ui.showNotification('Editando ítem...', 'info');
    }

    // =================================================
    // === LÓGICA DE ELIMINACIÓN ===
    // =================================================

    async _handleDelete(itemId) {
        const confirm = await ui.confirm(
            '¿Eliminar del inventario?', 
            'Esta acción borrará el ítem permanentemente.', 
            'Sí, eliminar'
        );
        
        if (!confirm) return;

        ui.showLoading('Eliminando...');

        try {
            await toolsApi.deleteItem(itemId);
            
            ui.hideLoading();
            ui.showNotification('Eliminado correctamente', 'success');
            
            // Actualización Local
            this.currentInventory = this.currentInventory.filter(i => i.id !== itemId);
            if(this.localSelection.has(itemId)) this.localSelection.delete(itemId);
            
            this._renderFilteredList();
            
            if (this.onItemCreated) this.onItemCreated();

        } catch (error) {
            ui.hideLoading();
            ui.showError(error.message);
        }
    }
}
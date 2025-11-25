/**
 * inventory_panel.js
 * Controlador específico para el Panel de Gestión de Inventario.
 * Funcionalidades: Listar, Filtrar, Crear (con foto), Editar y Eliminar.
 */

import { GlobalPanel } from '/static/home/js/core/panel.js';
import { imageUtils } from '/static/home/js/core/image.js';
import { api } from '/static/home/js/core/api.js';
import { ui } from '/static/home/js/core/ui.js';
import { toolsUI } from './tools_ui.js';

export class InventoryPanel {
    
    constructor(onItemCreated, onItemSelect) {
        this.onItemCreated = onItemCreated; // Callback para avisar al controlador padre
        this.onItemSelect = onItemSelect;   // Callback al seleccionar ítem para ingreso
        
        // Estado de Datos
        this.currentInventory = [];
        this.selectedIdsCache = [];
        
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

    /**
     * Abre el panel.
     * @param {Array} inventoryList - Lista completa de objetos.
     * @param {Array} selectedIds - Lista de IDs que ya están en el carrito.
     */
    open(inventoryList, selectedIds = []) {
        this.currentInventory = inventoryList;
        this.selectedIdsCache = selectedIds;

        // Resetear estado visual al abrir
        this.filterState = { text: '', category: 'ALL' };
        this.isEditing = false;
        this.editingItemId = null;
        this.tempImageBlob = null;

        // 1. Inyectar HTML Base
        GlobalPanel.open({
            title: 'Gestionar Equipos',
            contentHTML: toolsUI.getPanelContent()
        });

        // 2. Renderizar lista inicial
        this._renderFilteredList();

        // 3. Conectar eventos (Formulario, Buscador, Grid)
        this._attachEvents();
    }

    // =================================================
    // === LÓGICA DE LISTADO Y FILTROS ===
    // =================================================

    _renderFilteredList() {
        const container = GlobalPanel.getBodyElement().querySelector('#panel-inventory-grid');
        if (!container) return;
        
        container.innerHTML = '';

        // Filtrar
        const filteredItems = this.currentInventory.filter(item => {
            const searchText = this.filterState.text.toLowerCase();
            const matchText = item.nombre.toLowerCase().includes(searchText) || 
                              (item.marca || '').toLowerCase().includes(searchText) ||
                              (item.serial || '').toLowerCase().includes(searchText);
            
            const matchCat = this.filterState.category === 'ALL' || item.categoria === this.filterState.category;
            return matchText && matchCat;
        });

        // Estado Vacío
        if (filteredItems.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; grid-column:1/-1; padding:30px; color:var(--color-texto-secundario);">
                    <i class="fas fa-search" style="font-size: 1.5em; margin-bottom: 10px; opacity: 0.5;"></i>
                    <p>No se encontraron equipos.</p>
                </div>`;
            return;
        }

        // Renderizar Cards
        filteredItems.forEach(item => {
            const isSelected = this.selectedIdsCache.includes(item.id);
            const cardHTML = toolsUI.createCompactCard(item, isSelected);
            
            const template = document.createElement('template');
            template.innerHTML = cardHTML.trim();
            const cardEl = template.content.firstChild;

            // Asignar Eventos a la Card
            cardEl.addEventListener('click', (e) => this._handleGridClick(e, item, isSelected));

            container.appendChild(cardEl);
        });
    }

    _handleGridClick(e, item, isSelected) {
        // 1. Botón EDITAR
        if (e.target.closest('.btn-edit-item')) {
            e.stopPropagation();
            this._loadItemForEdit(item);
            return;
        }

        // 2. Botón ELIMINAR
        if (e.target.closest('.btn-delete-item')) {
            e.stopPropagation();
            this._handleDelete(item.id);
            return;
        }

        // 3. Selección Principal (Agregar al ingreso)
        if (!isSelected) {
            GlobalPanel.close();
            if (this.onItemSelect) this.onItemSelect(item);
        } else {
            ui.showNotification('Este equipo ya está en tu lista de ingreso.', 'info');
        }
    }

    // =================================================
    // === GESTIÓN DE EVENTOS DOM ===
    // =================================================

    _attachEvents() {
        const container = GlobalPanel.getBodyElement();
        
        // --- A. Buscador y Filtros ---
        const searchInput = container.querySelector('#panel-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterState.text = e.target.value;
                this._renderFilteredList();
            });
        }

        const chips = container.querySelectorAll('.filter-chip');
        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                chips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.filterState.category = chip.dataset.filter;
                this._renderFilteredList();
            });
        });

        // --- B. Formulario ---
        const form = container.querySelector('#inventory-form');
        const photoTrigger = container.querySelector('#trigger-ref-upload');
        const fileInput = container.querySelector('#foto_referencia');

        // Click en el área de foto -> Click en input oculto
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

        try {
            this.tempImageBlob = await imageUtils.compress(file, 600, 0.7);
            const base64 = await imageUtils.toBase64(this.tempImageBlob);
            
            if (preview) {
                preview.src = base64;
                preview.style.display = 'block'; // Esto activará el z-index: 10
            }

        } catch (error) {
            ui.showError("Error imagen: " + error.message);
        }
    }

    async _handleSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        // Inyectar imagen comprimida si existe
        if (this.tempImageBlob) {
            formData.set('foto_referencia', this.tempImageBlob, 'ref_item.jpg');
        }

        // Determinar URL
        const toolsApp = document.getElementById('tools-app');
        let url = toolsApp.dataset.urlCrear;
        
        if (this.isEditing) {
            const urlBase = toolsApp.dataset.urlInventario.replace(/\/$/, ''); 
            url = `${urlBase}/${this.editingItemId}/actualizar/`;
        }

        ui.showLoading(this.isEditing ? 'Actualizando...' : 'Guardando...');

        try {
            const response = await api.post(url, formData);
            
            ui.hideLoading();
            ui.showNotification(response.mensaje, 'success');
            
            // Limpiar formulario
            this._resetFormState();
            
            // ACTUALIZACIÓN EN TIEMPO REAL
            // Si el backend devuelve el objeto creado/editado, actualizamos la lista local
            // para que el usuario lo vea inmediatamente sin recargar.
            if (response.item) {
                // Aseguramos que tenga formato para la lista
                const newItem = response.item;
                // Parche rápido si el backend no devuelve todo:
                if(!newItem.categoria) newItem.categoria = formData.get('categoria');
                if(!newItem.foto && this.tempImageBlob) newItem.foto = URL.createObjectURL(this.tempImageBlob);

                if (this.isEditing) {
                    // Reemplazar en lista
                    const index = this.currentInventory.findIndex(i => i.id == this.editingItemId);
                    if (index !== -1) this.currentInventory[index] = { ...this.currentInventory[index], ...newItem };
                } else {
                    // Agregar al inicio
                    this.currentInventory.unshift(newItem);
                }
                
                // Renderizar de nuevo la lista
                this._renderFilteredList();
            }

            // Notificar al padre para sincronía completa (background refresh)
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
            
            // DESBLOQUEAR CAMPOS
            form.nombre.disabled = false;
            form.marca_serial.disabled = false;
            container.querySelector('#input-categoria').disabled = false;
            
            // Restaurar botón
            const btn = form.querySelector('button[type="submit"]');
            btn.innerHTML = '<i class="fas fa-plus"></i> Guardar';
            btn.classList.remove('btn-warning');
            
            // Quitar highlights residuales
            if(form.observaciones_iniciales) form.observaciones_iniciales.classList.remove('highlight-alert');
            const uploadContainer = container.querySelector('.image-upload-container');
            if(uploadContainer) uploadContainer.classList.remove('highlight-alert');
        }
        
        container.querySelector('.panel-section-title').textContent = 'Nuevo Ítem';
        const preview = container.querySelector('#ref-preview');
        const placeholder = container.querySelector('#ref-placeholder');
        if (preview) { preview.src = ''; preview.style.display = 'none'; }
        if (placeholder) { placeholder.style.display = 'block'; }
        
        container.scrollTo({ top: 0, behavior: 'smooth' });
    }

    _loadItemForEdit(item) {
        this.isEditing = true;
        this.editingItemId = item.id;
        
        const container = GlobalPanel.getBodyElement();
        const form = container.querySelector('#inventory-form');
        
        // 1. Cargar datos
        form.nombre.value = item.nombre;
        form.marca_serial.value = item.marca || ''; 
        form.categoria.value = item.categoria || 'HERRAMIENTA';
        if(form.observaciones_iniciales) form.observaciones_iniciales.value = item.observaciones || '';

        // 2. BLOQUEO QUIRÚRGICO (Solo lectura identidad)
        form.nombre.disabled = true;
        form.marca_serial.disabled = true;
        const catSelect = container.querySelector('#input-categoria');
        if(catSelect) catSelect.disabled = true; 
        
        // 3. UI
        container.querySelector('.panel-section-title').textContent = 'Editar Evidencia / Obs';
        const btn = form.querySelector('button[type="submit"]');
        btn.innerHTML = '<i class="fas fa-sync"></i> Actualizar';
        btn.classList.add('btn-warning'); // Clase visual (asegúrate de tener CSS para btn-warning si quieres)

        // 4. Foto (Preview)
        const preview = container.querySelector('#ref-preview');
        if (item.foto) {
            preview.src = item.foto;
            preview.style.display = 'block'; 
        } else {
            preview.style.display = 'none';
        }

        // 5. UX: Scroll y Alertas
        container.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Resaltar áreas editables
        const uploadContainer = container.querySelector('.image-upload-container');
        this._applyHighlight(uploadContainer);

        const obsInput = form.observaciones_iniciales;
        if(obsInput) this._applyHighlight(obsInput);
        
        ui.showNotification('Modo Edición: Solo foto y observaciones.', 'info');
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
            
            // DESBLOQUEAR TODO
            form.nombre.disabled = false;
            form.marca_serial.disabled = false;
            const catSelect = container.querySelector('#input-categoria');
            if(catSelect) catSelect.disabled = false;
            
            const btn = form.querySelector('button[type="submit"]');
            btn.innerHTML = '<i class="fas fa-plus"></i> Guardar';
            btn.classList.remove('btn-warning');
            
            // Limpiar alertas rojas
            if(form.observaciones_iniciales) form.observaciones_iniciales.classList.remove('highlight-alert');
            const uploadContainer = container.querySelector('.image-upload-container');
            if(uploadContainer) uploadContainer.classList.remove('highlight-alert');
        }
        
        container.querySelector('.panel-section-title').textContent = 'Nuevo Ítem';
        
        const preview = container.querySelector('#ref-preview');
        if (preview) { 
            preview.src = ''; 
            preview.style.display = 'none'; 
        }
        
        container.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Helper para aplicar la clase roja temporalmente
    _applyHighlight(element) {
        if(!element) return;
        element.classList.remove('highlight-alert');
        void element.offsetWidth; // Reinicia animación CSS
        element.classList.add('highlight-alert');
        
        // Quitar alerta al tocar
        const removeFunc = () => {
            element.classList.remove('highlight-alert');
            element.removeEventListener('click', removeFunc);
            element.removeEventListener('focus', removeFunc);
        };
        element.addEventListener('click', removeFunc);
        element.addEventListener('focus', removeFunc);
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
            const urlBase = document.getElementById('tools-app').dataset.urlInventario.replace(/\/$/, '');
            const urlDelete = `${urlBase}/${itemId}/eliminar/`;

            await api.post(urlDelete, {});
            
            ui.hideLoading();
            ui.showNotification('Eliminado correctamente', 'success');
            
            // Eliminar localmente para feedback instantáneo
            this.currentInventory = this.currentInventory.filter(i => i.id !== itemId);
            this._renderFilteredList();
            
            if (this.onItemCreated) this.onItemCreated();

        } catch (error) {
            ui.hideLoading();
            ui.showError(error.message);
        }
    }
}
/**
 * inventory_panel.js
 * Controlador del Panel de Gestión de Inventario.
 * * FUNCIONALIDADES:
 * 1. Gestión de Catálogo (CRUD).
 * 2. Selección Múltiple para ingreso (Bulk Add).
 * 3. Manejo de UX para edición (Bloqueo de campos).
 */

import { GlobalPanel } from '/static/home/js/core/panel.js';
import { imageUtils } from '/static/home/js/core/image.js';
import { api } from '/static/home/js/core/api.js';
import { ui } from '/static/home/js/core/ui.js';
import { toolsUI } from './tools_ui.js';

export class InventoryPanel {
    
    /**
     * @param {Function} onItemCreated - Callback para recargar lista maestra tras crear/editar/borrar.
     * @param {Function} onBulkAdd - Callback para enviar lista de IDs al controlador principal.
     */
    constructor(onItemCreated, onBulkAdd) {
        this.onItemCreated = onItemCreated; 
        this.onBulkAdd = onBulkAdd; 
        
        // Estado de Datos
        this.currentInventory = [];
        this.selectedIdsCache = []; // IDs que YA están en la base de datos (Ingresados)
        this.localSelection = new Set(); // IDs seleccionados AHORA por el usuario (Pendientes)
        
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
     * Abre el panel lateral.
     * @param {Array} inventoryList - Lista maestra.
     * @param {Array} alreadyAddedIds - Lista de IDs que ya están ingresados (para marcarlos).
     */
    open(inventoryList, alreadyAddedIds = []) {
        try {
            this.currentInventory = inventoryList;
            this.selectedIdsCache = alreadyAddedIds;
            this.localSelection.clear(); // Limpiamos selección temporal al abrir

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

        // 2. Actualizar Botón Flotante de "Agregar (X)"
        this._updateFloatingButton();

        // 3. Estado Vacío
        if (filteredItems.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; grid-column:1/-1; padding:30px; color:var(--color-texto-secundario);">
                    <i class="fas fa-search" style="font-size: 1.5em; margin-bottom: 10px; opacity: 0.5;"></i>
                    <p>No se encontraron equipos.</p>
                </div>`;
            return;
        }

        // 4. Renderizar Cards
        filteredItems.forEach(item => {
            // Verificamos si está en BD (Gris/Check) O si está seleccionado localmente (Azul/Check)
            const inDb = this.selectedIdsCache.includes(item.id);
            const inLocal = this.localSelection.has(item.id);
            
            // Pasamos 'true' si está en cualquiera de los dos estados para que muestre el check visual
            const cardHTML = toolsUI.createCompactCard(item, inDb || inLocal);
            
            const template = document.createElement('template');
            template.innerHTML = cardHTML.trim();
            const cardEl = template.content.firstChild;

            // Si está seleccionado localmente, añadimos una clase extra para diferenciarlo (Opcional: borde azul)
            if (inLocal) cardEl.style.borderColor = 'var(--color-primario-medio)';

            // Eventos
            cardEl.addEventListener('click', (e) => this._handleGridClick(e, item, inDb));

            container.appendChild(cardEl);
        });
    }

    _handleGridClick(e, item, isAlreadyInDb) {
        // A. Botón EDITAR (Lápiz)
        if (e.target.closest('.btn-edit-item')) {
            e.stopPropagation();
            this._loadItemForEdit(item);
            return;
        }

        // B. Botón ELIMINAR (Basura)
        if (e.target.closest('.btn-delete-item')) {
            e.stopPropagation();
            this._handleDelete(item.id);
            return;
        }

        // C. Selección Principal (Logica Bulk)
        if (isAlreadyInDb) {
            ui.showNotification('Este ítem ya fue agregado al ingreso.', 'info');
            return;
        }

        // Toggle Selección Local
        if (this.localSelection.has(item.id)) {
            this.localSelection.delete(item.id);
        } else {
            this.localSelection.add(item.id);
        }

        // Re-renderizar para actualizar visualmente
        this._renderFilteredList();
    }

    /**
     * Inyecta o actualiza el botón flotante de confirmación masiva.
     */
    _updateFloatingButton() {
        const container = GlobalPanel.getBodyElement().querySelector('.panel-section.list-section');
        let btn = container.querySelector('#btn-bulk-add');
        
        if (this.localSelection.size > 0) {
            if (!btn) {
                btn = document.createElement('button');
                btn.id = 'btn-bulk-add';
                btn.className = 'btn-bulk-confirm'; // Clase definida en tools.css
                btn.onclick = () => this._confirmBulkAdd();
                container.appendChild(btn);
            }
            btn.innerHTML = `<i class="fas fa-plus"></i> Agregar (${this.localSelection.size}) ítems`;
            btn.style.display = 'block';
        } else {
            if (btn) btn.style.display = 'none';
        }
    }

    _confirmBulkAdd() {
        if (this.onBulkAdd && this.localSelection.size > 0) {
            // Enviamos array de IDs al controlador
            this.onBulkAdd(Array.from(this.localSelection));
            GlobalPanel.close(); // Cerramos panel para UX limpia
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

        // Filtros Categoría
        const chips = container.querySelectorAll('.filter-chip');
        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                chips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.filterState.category = chip.dataset.filter;
                this._renderFilteredList();
            });
        });

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

        try {
            this.tempImageBlob = await imageUtils.compress(file, 600, 0.7);
            const base64 = await imageUtils.toBase64(this.tempImageBlob);
            
            if (preview) {
                preview.src = base64;
                // Solución Bug Visual: Forzar display block para activar z-index del CSS
                preview.style.display = 'block'; 
            }

        } catch (error) {
            ui.showError("Error procesando imagen: " + error.message);
        }
    }

    async _handleSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        if (this.tempImageBlob) {
            formData.set('foto_referencia', this.tempImageBlob, 'ref_item.jpg');
        }

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
            
            this._resetFormState();
            
            // Actualización Optimista / Real-time
            if (response.item) {
                const newItem = response.item;
                // Parche de seguridad para datos faltantes
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
            // 1. DESBLOQUEAR TODOS LOS CAMPOS
            form.nombre.disabled = false;
            form.marca_serial.disabled = false;
            const catSelect = container.querySelector('#input-categoria');
            if(catSelect) catSelect.disabled = false;

            // 2. Restaurar Botón
            const btn = form.querySelector('button[type="submit"]');
            btn.innerHTML = '<i class="fas fa-plus"></i> Guardar';
            btn.classList.remove('btn-warning');

            // 3. Limpiar alertas visuales
            if(form.observaciones_iniciales) this._removeHighlight(form.observaciones_iniciales);
            const uploadContainer = container.querySelector('.image-upload-container');
            if(uploadContainer) this._removeHighlight(uploadContainer);
        }
        
        container.querySelector('.panel-section-title').textContent = 'Nuevo Ítem';
        
        // 4. Reset Imagen (Solución Bug Visual)
        const preview = container.querySelector('#ref-preview');
        if (preview) {
            preview.src = '';
            preview.style.display = 'none'; // Ocultar para ver placeholder
        }
        
        container.scrollTo({ top: 0, behavior: 'smooth' });
    }

    _loadItemForEdit(item) {
        this.isEditing = true;
        this.editingItemId = item.id;
        
        const container = GlobalPanel.getBodyElement();
        const form = container.querySelector('#inventory-form');
        
        // Cargar datos
        form.nombre.value = item.nombre;
        form.marca_serial.value = item.marca || ''; 
        form.categoria.value = item.categoria || 'HERRAMIENTA';
        if(form.observaciones_iniciales) form.observaciones_iniciales.value = item.observaciones || '';

        // 1. BLOQUEAR CAMPOS DE IDENTIDAD
        form.nombre.disabled = true;
        form.marca_serial.disabled = true;
        const catSelect = container.querySelector('#input-categoria');
        if(catSelect) catSelect.disabled = true; 

        // 2. UI Botón
        container.querySelector('.panel-section-title').textContent = 'Editar Evidencia / Obs';
        const btn = form.querySelector('button[type="submit"]');
        btn.innerHTML = '<i class="fas fa-sync"></i> Actualizar';
        btn.classList.add('btn-warning');

        // 3. Cargar Foto Existente
        const preview = container.querySelector('#ref-preview');
        if (item.foto) {
            preview.src = item.foto;
            preview.style.display = 'block'; 
        } else {
            preview.style.display = 'none';
        }

        // 4. UX Scroll y Highlight
        container.scrollTo({ top: 0, behavior: 'smooth' });
        
        const uploadContainer = container.querySelector('.image-upload-container');
        this._applyHighlight(uploadContainer);
        if(form.observaciones_iniciales) this._applyHighlight(form.observaciones_iniciales);
        
        ui.showNotification('Modo Edición: Solo foto y observaciones.', 'info');
    }

    _applyHighlight(element) {
        if(!element) return;
        element.classList.remove('highlight-alert');
        void element.offsetWidth; 
        element.classList.add('highlight-alert');
        
        const removeFunc = () => {
            element.classList.remove('highlight-alert');
            element.removeEventListener('click', removeFunc);
            element.removeEventListener('focus', removeFunc);
        };
        element.addEventListener('click', removeFunc);
        element.addEventListener('focus', removeFunc);
    }

    _removeHighlight(element) {
        if(element) element.classList.remove('highlight-alert');
    }

    // =================================================
    // === LÓGICA DE ELIMINACIÓN DEL CATÁLOGO ===
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
            
            // Actualización Local
            this.currentInventory = this.currentInventory.filter(i => i.id !== itemId);
            // Si estaba seleccionado, lo sacamos
            if(this.localSelection.has(itemId)) this.localSelection.delete(itemId);
            
            this._renderFilteredList();
            
            if (this.onItemCreated) this.onItemCreated();

        } catch (error) {
            ui.hideLoading();
            ui.showError(error.message);
        }
    }
}
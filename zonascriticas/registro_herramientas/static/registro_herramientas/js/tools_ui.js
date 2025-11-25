/**
 * tools_ui.js
 * Generador de plantillas HTML para el módulo de herramientas.
 * ACTUALIZADO: Soporte para Bulk Actions y corrección visual de imagen.
 */

export const toolsUI = {

    /**
     * Genera el HTML interno del Panel Lateral Global.
     * Contiene: Formulario (Arriba) + Buscador/Filtros + Lista (Abajo).
     */
    getPanelContent: () => {
        return `
        <div class="panel-content-wrapper">
            
            <button type="button" class="btn-close-panel-internal" onclick="document.getElementById('global-panel-overlay').click()">
                <i class="fas fa-times"></i>
            </button>

            <div class="panel-section form-section">
                <h4 class="panel-section-title">Nuevo Ítem</h4>
                
                <form id="inventory-form" autocomplete="off">
                    <div class="image-upload-container" id="trigger-ref-upload">
                        <input type="file" id="foto_referencia" name="foto_referencia" accept="image/jpeg, image/png" style="display:none;">
                        
                        <img id="ref-preview" style="display:none;">
                        
                        <div id="ref-placeholder">
                            <i class="fas fa-camera"></i>
                            <span>Foto Referencia</span>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="input-group">
                            <select name="categoria" id="input-categoria" class="styled-input">
                                <option value="HERRAMIENTA">Herramienta</option>
                                <option value="COMPUTO">Cómputo</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <input type="text" name="marca_serial" class="styled-input" placeholder="Marca / Serial" required>
                        </div>
                    </div>

                    <div class="input-group">
                        <input type="text" name="nombre" class="styled-input" placeholder="Nombre (Ej: Taladro Makita)" required>
                    </div>

                    <div class="input-group">
                        <textarea name="observaciones_iniciales" class="styled-input" placeholder="Observaciones (Opcional)" rows="2" style="resize: none;"></textarea>
                    </div>

                    <button type="submit" class="btn-save-inventory">
                        <i class="fas fa-plus"></i> Guardar
                    </button>
                </form>
            </div>

            <hr class="panel-divider">

            <div class="panel-section list-section">
                <h4 class="panel-section-title">Mi Inventario</h4>
                
                <div class="inventory-search-bar">
                    <i class="fas fa-search"></i>
                    <input type="text" id="panel-search-input" placeholder="Buscar por nombre, marca...">
                </div>

                <div class="selection-helper-text">
                    <i class="fas fa-info-circle"></i> Toca los elementos para seleccionarlos
                </div>

                <div class="inventory-filters">
                    <button class="filter-chip active" data-filter="ALL">Todos</button>
                    <button class="filter-chip" data-filter="HERRAMIENTA"><i class="fas fa-tools"></i></button>
                    <button class="filter-chip" data-filter="COMPUTO"><i class="fas fa-laptop"></i></button>
                </div>

                <div id="panel-inventory-grid" class="inventory-grid-compact">
                    <div class="loading-spinner" style="text-align:center; padding:20px; color:#999;">Cargando...</div>
                </div>
                
                </div>
        </div>
        `;
    },

    /**
     * Genera la tarjeta compacta para la lista del PANEL LATERAL.
     * @param {Object} item - Datos del ítem.
     * @param {Boolean} isSelected - Si está seleccionado (ya sea en BD o localmente).
     */
    createCompactCard: (item, isSelected) => {
        const iconClass = item.categoria === 'COMPUTO' ? 'fa-laptop' : 'fa-tools';
        
        // Lógica de Imagen
        const imgHtml = item.foto 
            ? `<img src="${item.foto}" alt="${item.nombre}">` 
            : `<div class="icon-placeholder"><i class="fas ${iconClass}"></i></div>`;

        // Estados
        const selectedClass = isSelected ? 'selected' : '';
        const checkIcon = isSelected ? '<div class="check-badge"><i class="fas fa-check"></i></div>' : '';
        
        // Badge de Categoría
        const badgeClass = item.categoria === 'COMPUTO' ? 'badge-computo' : 'badge-tool';
        const badgeText = item.categoria === 'COMPUTO' ? 'Cómputo' : 'Herramienta';

        // Botones de Acción (Edición de Catálogo)
        // El botón de eliminar solo se muestra si NO está seleccionado para evitar conflictos
        const deleteBtn = !isSelected 
            ? `<button type="button" class="btn-action btn-delete-item" data-action="delete" data-id="${item.id}" title="Eliminar"><i class="fas fa-trash"></i></button>` 
            : '';

        const actions = `
            <div class="card-actions">
                <button type="button" class="btn-action btn-edit-item" data-action="edit" data-id="${item.id}" title="Editar"><i class="fas fa-pencil-alt"></i></button>
                ${deleteBtn}
            </div>
        `;

        return `
        <div class="tool-card-compact ${selectedClass}" data-id="${item.id}" data-name="${item.nombre}">
            ${checkIcon}
            ${actions}
            
            <div class="card-media">
                ${imgHtml}
            </div>
            
            <div class="card-info">
                <span class="category-badge ${badgeClass}">${badgeText}</span>
                <span class="name">${item.nombre}</span>
                <span class="serial">${item.marca || item.serial}</span>
            </div>
        </div>
        `;
    },

    /**
     * Genera la tarjeta grande para la PANTALLA PRINCIPAL (Carrito de Ingreso).
     */
    createMainCard: (item) => {
        const iconClass = item.categoria === 'COMPUTO' ? 'fa-laptop' : 'fa-tools';
        
        const imgHtml = item.foto 
            ? `<img src="${item.foto}" alt="${item.nombre}">` 
            : `<div class="tool-icon"><i class="fas ${iconClass}"></i></div>`;

        const badgeClass = item.categoria === 'COMPUTO' ? 'badge-computo' : 'badge-tool';
        const badgeText = item.categoria === 'COMPUTO' ? 'Cómputo' : 'Herramienta';

        return `
        <div class="tool-card added">
            <button class="btn-remove-item" data-action="remove" data-id="${item.id}" title="Retirar del ingreso">
                <i class="fas fa-trash"></i>
            </button>
            <button class="btn-edit-main" data-action="edit" data-id="${item.id}" title="Editar evidencia">
                <i class="fas fa-pencil-alt"></i>
            </button>
            
            ${imgHtml}
            
            <span class="category-badge ${badgeClass} mb-1">${badgeText}</span>
            <span class="tool-name">${item.nombre}</span>
            <span class="tool-serial">${item.marca || item.serial}</span>
            
            <span class="status-text">INGRESADO</span>
        </div>
        `;
    }
};
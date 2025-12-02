/**
 * tools_ui.js (REFACTORIZADO V3 - CSS UNIFICADO)
 * Genera HTML limpio usando clases de global.css para consistencia total.
 */

export const toolsUI = {

    /**
     * Genera el HTML interno del Panel Lateral Global.
     */
    getPanelContent: () => {
        return `
        <div class="panel-content-wrapper" style="padding: 10px 5px;">
            
            <div class="panel-section form-section">
                
                <form id="inventory-form" autocomplete="off">
                    
                    <div class="image-upload-container" id="trigger-ref-upload">
                        <input type="file" id="foto_referencia" name="foto_referencia" accept="image/jpeg, image/png" style="display:none;">
                        <img id="ref-preview" style="display:none;">
                        
                        <div class="image-upload-placeholder" id="ref-placeholder">
                            <i class="fas fa-camera"></i>
                            <span class = "texto-imagen">Toca para agregar foto</span>
                        </div>
                    </div>

                    <input type="hidden" name="categoria" id="hidden-categoria" value="HERRAMIENTA">
                    <div class="category-selector-group" id="category-selector">
                        <div class="cat-option-btn active" data-value="HERRAMIENTA">
                            <i class="fas fa-tools"></i> Herramienta
                        </div>
                        <div class="cat-option-btn" data-value="COMPUTO">
                            <i class="fas fa-laptop"></i> Cómputo
                        </div>
                    </div>

                    <div class="input-group no-icon">
                        <input type="text" name="marca_serial" class="panel-form-input" placeholder="Marca / Serial (Ej: Makita 123)" required>
                    </div>

                    <div class="input-group no-icon">
                        <input type="text" name="nombre" class="panel-form-input" placeholder="Nombre (Ej: Taladro Percutor)" required>
                    </div>

                    <div class="input-group no-icon">
                        <textarea name="observaciones_iniciales" class="panel-form-input" placeholder="Observaciones (Opcional)" rows="2" style="resize: none;"></textarea>
                    </div>

                    <button type="submit" class="btn-save-full">
                        <i class="fas fa-plus"></i> Guardar Ítem
                    </button>
                </form>
            </div>

            <div class="panel-inventory-list-header">
                <h4 style="margin-bottom:15px; color:var(--color-primario-oscuro);">Mi Inventario</h4>
                
                <div class="search-compact-wrapper">
                    <i class="fas fa-search"></i>
                    <input type="text" id="panel-search-input" placeholder="Buscar...">
                </div>

                <div class="filter-chips-row">
                    <button class="filter-chip-sm active" data-filter="ALL">Todos</button>
                    <button class="filter-chip-sm" data-filter="HERRAMIENTA"><i class="fas fa-tools"></i></button>
                    <button class="filter-chip-sm" data-filter="COMPUTO"><i class="fas fa-laptop"></i></button>
                </div>

                <div class="selection-helper-text" style="font-size:0.8rem; color:#6b7280; margin-bottom:10px; text-align:center;">
                    <i class="fas fa-info-circle"></i> Toca para seleccionar
                </div>

                <div id="panel-inventory-grid" class="inventory-grid-compact">
                    <div class="loading-spinner" style="text-align:center; padding:20px; color:#999;">Cargando...</div>
                </div>
            </div>
        </div>
        `;
    },

    /**
     * Tarjeta Compacta (Lista inferior)
     */
    createCompactCard: (item, isSelected) => {
        // Lógica visual idéntica a la anterior pero con clases limpias
        const imgHtml = item.foto 
            ? `<img src="${item.foto}" alt="${item.nombre}">` 
            : `<div class="icon-placeholder"><i class="fas ${item.categoria === 'COMPUTO' ? 'fa-laptop' : 'fa-tools'}"></i></div>`;

        const selectedClass = isSelected ? 'selected' : '';
        const checkIcon = isSelected ? '<div class="check-badge"><i class="fas fa-check"></i></div>' : '';
        
        // Badge
        const badgeClass = item.categoria === 'COMPUTO' ? 'badge-computo' : 'badge-tool';
        const badgeText = item.categoria === 'COMPUTO' ? 'Cómputo' : 'Herramienta';

        // Acciones (Solo eliminar/editar)
        const deleteBtn = !isSelected 
            ? `<button type="button" class="btn-action btn-delete-item" data-id="${item.id}"><i class="fas fa-trash"></i></button>` 
            : '';

        return `
        <div class="tool-card-compact ${selectedClass}" data-id="${item.id}">
            ${checkIcon}
            <div class="card-actions">
                <button type="button" class="btn-action btn-edit-item" data-id="${item.id}"><i class="fas fa-pencil-alt"></i></button>
                ${deleteBtn}
            </div>
            
            <div class="card-media">
                ${imgHtml}
            </div>
            
            <div class="card-info">
                <span class="category-badge ${badgeClass}">${badgeText}</span>
                <span class="name">${item.nombre}</span>
                <span class="serial">${item.marca || ''}</span>
            </div>
        </div>
        `;
    },

    createMainCard: (item) => {
        // ... (Mantén tu createMainCard actual, ese se ve bien en la pantalla principal)
        const iconClass = item.categoria === 'COMPUTO' ? 'fa-laptop' : 'fa-tools';
        const imgHtml = item.foto 
            ? `<img src="${item.foto}" alt="${item.nombre}">` 
            : `<div class="tool-icon"><i class="fas ${iconClass}"></i></div>`;

        const badgeClass = item.categoria === 'COMPUTO' ? 'badge-computo' : 'badge-tool';
        
        return `
        <div class="tool-card added">
            <button class="btn-remove-item" data-action="remove" data-id="${item.id}"><i class="fas fa-trash"></i></button>
            <button class="btn-edit-main" data-action="edit" data-id="${item.id}"><i class="fas fa-pencil-alt"></i></button>
            ${imgHtml}
            <span class="category-badge ${badgeClass} mb-1">${item.categoria}</span>
            <span class="tool-name">${item.nombre}</span>
            <span class="tool-serial">${item.marca || ''}</span>
            <span class="status-text">INGRESADO</span>
        </div>`;
    }
};
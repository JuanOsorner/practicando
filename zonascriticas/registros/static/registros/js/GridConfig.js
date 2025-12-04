/**
 * zonascriticas\registros\static\registros\js\GridConfig.js
 * CONFIGURACIÓN DE COLUMNAS: MODO DIRECTORIO DE VISITANTES
 */

export const GridConfig = {
    
    // --- 1. GENERADORES DE HTML ---

    columnaVisitante: (props) => {
        if (!props) return '';
        const imgUrl = props.visitante_img ? props.visitante_img : '/static/home/img/default_avatar.png';
        
        return `
            <div class="d-flex align-items-center gap-3">
                <div class="avatar-wrapper">
                    <img src="${imgUrl}" alt="Avatar" class="grid-avatar">
                </div>
                <div class="info-wrapper">
                    <span class="fw-bold d-block text-dark">${props.visitante_nombre}</span>
                    <span class="text-muted small"><i class="far fa-id-card"></i> ${props.visitante_doc}</span>
                </div>
            </div>
        `;
    },

    columnaEmpresa: (props) => {
        // Simple badge o texto para la empresa
        const empresa = props.empresa || 'Particular';
        return `<span class="fw-bold text-secondary"><i class="fas fa-building text-muted me-1"></i> ${empresa}</span>`;
    },

    columnaEstadoActual: (props) => {
        // Semáforo: Verde si está dentro, Gris si está fuera
        if (props.estado_actual === 'En Zona') {
            return `
                <span class="badge badge-soft-success">
                    <i class="fas fa-user-check me-1"></i> En Zona
                </span>
            `;
        } else {
            return `
                <span class="badge badge-soft-secondary">
                    <i class="fas fa-history me-1"></i> Histórico
                </span>
            `;
        }
    },

    columnaAcciones: (props) => {
        // Botón explícito para ver historial (aunque el click en fila también sirva)
        return `
            <div class="action-buttons">
                <button class="btn-icon btn-light btn-sm action-history" title="Ver Historial Completo" data-id="${props.visitante_id}">
                    <i class="fas fa-list-alt text-primary"></i>
                </button>
            </div>
        `;
    },

    // --- 2. DEFINICIÓN DE COLUMNAS ---
    getColumns: function() {
        return [
            { 
                field: 'visitante_nombre', 
                headerText: 'Visitante', 
                width: 250, 
                allowFiltering: true 
            },
            { 
                field: 'empresa', 
                headerText: 'Empresa / Entidad', 
                width: 180, 
                allowFiltering: true 
            },
            { 
                field: 'estado_actual', 
                headerText: 'Estado', 
                width: 130, 
                textAlign: 'Center',
                allowFiltering: true 
            },
            { 
                field: 'ultima_visita', 
                headerText: 'Último Ingreso', 
                width: 160, 
                textAlign: 'Right',
                allowFiltering: false 
            },
            { 
                headerText: 'Detalle', 
                width: 100, 
                textAlign: 'Center',
                allowFiltering: false 
            }
        ];
    }
};
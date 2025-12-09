export const GridConfig = {
    
    // --- TEMPLATES VISUALES ---

    columnaPerfil: (props) => {
        if (!props) return '';
        const imgUrl = props.visitante_img ? props.visitante_img : '/static/home/img/default_avatar.png';
        const empresa = props.empresa || 'Particular';

        // Estructura coincidente con CSS registros.css sección 3
        return `
            <div class="d-flex align-items-center gap-3">
                <div class="avatar-wrapper">
                    <img src="${imgUrl}" alt="Avatar" class="grid-avatar">
                </div>
                <div class="info-wrapper">
                    <span class="visitante-nombre">${props.visitante_nombre}</span>
                    <div class="visitante-meta">
                        <span class="doc-text">${props.visitante_doc}</span>
                        <span class="separator">•</span>
                        <span class="empresa-text">${empresa}</span>
                    </div>
                </div>
            </div>
        `;
    },

    columnaEstado: (props) => {
        if (props.estado_actual === 'En Zona') {
            return `<span class="badge-status badge-active"><div class="dot-pulse"></div> En Zona</span>`;
        } else {
            return `<span class="badge-status badge-inactive">Finalizado</span>`;
        }
    },

    columnaUltimoIngreso: (props) => {
        // Simple, fuente monoespaciada para fechas suele verse bien, 
        // pero aquí usamos la fuente principal para consistencia.
        return `<span style="color: var(--color-texto-principal); font-weight: 500;">${props.ultima_visita}</span>`;
    },

    // --- CONFIGURACIÓN DE COLUMNAS ---
    getColumns: function() {
        return [
            { 
                field: 'visitante_nombre', 
                headerText: 'VISITANTE', 
                width: 280, 
                allowFiltering: false // Aseguramos que no haya filtro individual
            },
            { 
                field: 'estado_actual', 
                headerText: 'ESTADO', 
                width: 130, 
                textAlign: 'Center',
                allowFiltering: false 
            },
            { 
                field: 'ultima_visita', 
                headerText: 'ÚLTIMO ACCESO', 
                width: 160, 
                textAlign: 'Right',
                allowFiltering: false 
            }
        ];
    }
};
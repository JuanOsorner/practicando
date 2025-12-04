export const GridConfig = {
    
    // --- 1. GENERADORES DE HTML (Templates Visuales) ---

    // FUSIONAMOS: Avatar + Nombre + Empresa en una sola celda rica
    columnaPerfil: (props) => {
        if (!props) return '';
        const imgUrl = props.visitante_img ? props.visitante_img : '/static/home/img/default_avatar.png';
        const empresa = props.empresa || 'Particular';

        return `
            <div class="d-flex align-items-center gap-3">
                <div class="avatar-wrapper">
                    <img src="${imgUrl}" alt="Avatar" class="grid-avatar">
                </div>
                <div class="info-wrapper">
                    <span class="visitante-nombre">${props.visitante_nombre}</span>
                    <div class="visitante-meta">
                        <span class="doc-text"><i class="far fa-id-card"></i> ${props.visitante_doc}</span>
                        <span class="separator">•</span>
                        <span class="empresa-text"><i class="fas fa-building"></i> ${empresa}</span>
                    </div>
                </div>
            </div>
        `;
    },

    columnaEstado: (props) => {
        if (props.estado_actual === 'En Zona') {
            return `<span class="badge-status badge-active"><div class="dot-pulse"></div> En Zona</span>`;
        } else {
            return `<span class="badge-status badge-inactive">Histórico</span>`;
        }
    },

    columnaUltimoIngreso: (props) => {
        return `<span class="fecha-texto">${props.ultima_visita}</span>`;
    },

    // --- 2. DEFINICIÓN DE COLUMNAS ---
    getColumns: function() {
        return [
            { 
                field: 'visitante_nombre', 
                headerText: 'PERFIL DEL VISITANTE', 
                width: 300, 
                allowFiltering: true,
                //template: true // Indicamos que usaremos template
            },
            { 
                field: 'estado_actual', 
                headerText: 'ESTADO', 
                width: 120, 
                textAlign: 'Center',
                allowFiltering: true 
            },
            { 
                field: 'ultima_visita', 
                headerText: 'ÚLTIMO ACCESO', 
                width: 150, 
                textAlign: 'Right',
                allowFiltering: false 
            }
            // ELIMINADA: Columna 'Detalle' (Redundante)
        ];
    }
};
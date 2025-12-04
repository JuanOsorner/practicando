import { api } from '/static/home/js/core/api.js';
import { ui } from '/static/home/js/core/ui.js';
import { GridConfig } from './GridConfig.js';
// Importaremos la UI del panel en la Fase 3, por ahora dejamos el placeholder
import { PanelRegistrosUI } from './PanelRegistrosUI.js'; 

export class RegistrosController {
    constructor() {
        this.gridInstance = null;
        this.init();
    }

    async init() {
        try {
            ui.showLoading("Cargando directorio de accesos...");
            
            // 1. Cargar Datos (Nueva API de Visitantes)
            const data = await api.get('/registros/api/listar-visitantes/');
            
            ui.hideLoading();
            this.renderGrid(data);
            
        } catch (error) {
            ui.hideLoading();
            ui.showError("Error cargando directorio: " + error.message);
        }
    }

    renderGrid(dataSource) {
        if (this.gridInstance) {
            this.gridInstance.destroy();
        }

        const isMobile = window.innerWidth <= 768;

        this.gridInstance = new ejs.grids.Grid({
            dataSource: dataSource,
            
            // ... (Configuración de toolbar y búsqueda igual) ...
            toolbar: ['Search'], 
            searchSettings: { 
                fields: ['visitante_nombre', 'visitante_doc', 'empresa'], 
                operator: 'contains', 
                ignoreCase: true
            },

            allowPaging: true,
            pageSettings: { pageSize: 12 },
            allowFiltering: true,
            filterSettings: { type: 'Menu' },
            allowSorting: true,
            allowTextWrap: true,
            
            // --- CORRECCIÓN CRÍTICA AQUÍ ---
            enableAdaptiveUI: true,
            rowRenderingMode: isMobile ? 'Vertical' : 'Horizontal', 
            
            // En móvil usamos 'auto' para que crezca según las tarjetas.
            // En PC usamos '100%' para llenar la pantalla.
            height: isMobile ? 'auto' : '100%', 
            width: '100%',
            
            // ... (resto igual) ...
            rowHeight: 70, 
            columns: GridConfig.getColumns(),
            queryCellInfo: (args) => this.handleQueryCellInfo(args),
            recordClick: (args) => {
                if(args.rowData) {
                    this.openHistoryPanel(args.rowData.visitante_id, args.rowData.visitante_nombre);
                }
            }
        });

        this.gridInstance.appendTo('#GridRegistros');
    }

    handleQueryCellInfo(args) {
        if (!args.column || !args.data) return;

        // Atributo para CSS Móvil
        if (args.cell) {
            args.cell.setAttribute('data-label', args.column.headerText);
        }

        // Lógica de Renderizado
        if (args.column.field === 'visitante_nombre') {
            args.cell.innerHTML = GridConfig.columnaPerfil(args.data);
        }
        else if (args.column.field === 'estado_actual') {
            args.cell.innerHTML = GridConfig.columnaEstado(args.data);
        }
        else if (args.column.field === 'ultima_visita') {
            args.cell.innerHTML = GridConfig.columnaUltimoIngreso(args.data);
        }
    }

    /**
     * Abre el Panel Lateral usando la clase UI dedicada
     */
    openHistoryPanel(visitanteId, visitanteNombre) {
        // Llamamos a la clase estática que gestionará el panel (Fase 3)
        PanelRegistrosUI.open(visitanteId, visitanteNombre, () => {
            // Callback al cerrar panel: Recargar tabla por si hubo reactivación
            this.init();
        });
    }
}
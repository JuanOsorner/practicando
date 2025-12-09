import { api } from '/static/home/js/core/api.js';
import { ui } from '/static/home/js/core/ui.js';
import { GridConfig } from './GridConfig.js';
import { PanelRegistrosUI } from './PanelRegistrosUI.js'; 

export class RegistrosController {
    constructor() {
        this.gridInstance = null;
        this.allData = []; // Guardamos los datos en memoria para el filtro móvil
        this.init();
    }

    async init() {
        try {
            // Solo mostrar loading si es desktop o primera carga
            if (window.innerWidth > 768) ui.showLoading("Cargando directorio...");
            
            // 1. Obtener Datos
            this.allData = await api.get('/registros/api/listar-visitantes/');
            
            ui.hideLoading();

            // 2. Decidir Renderizado según dispositivo
            if (window.innerWidth <= 768) {
                this.renderMobileView(this.allData);
            } else {
                this.renderGrid(this.allData);
            }

            // Listener para cambios de tamaño de pantalla (opcional)
            window.addEventListener('resize', () => {
                // Lógica simple de recarga si cruza el breakpoint
                // (En producción podrías hacer esto más sofisticado)
            });
            
        } catch (error) {
            ui.hideLoading();
            // Mostrar error en el contenedor correspondiente
            const container = window.innerWidth <= 768 
                ? document.getElementById('MobileListView') 
                : document.querySelector('.registros-container');
            container.innerHTML = `<div class="alert alert-danger m-3">${error.message}</div>`;
        }
    }

    // --- LÓGICA ESCRITORIO (Syncfusion) ---
    renderGrid(dataSource) {
        if (this.gridInstance) this.gridInstance.destroy();

        this.gridInstance = new ejs.grids.Grid({
            dataSource: dataSource,
            toolbar: ['Search'], 
            searchSettings: { fields: ['visitante_nombre', 'visitante_doc', 'empresa'], operator: 'contains', ignoreCase: true },
            allowFiltering: false, 
            allowPaging: true,
            pageSettings: { pageSize: 15 },
            allowSorting: true,
            width: '100%',
            height: 'auto',
            rowHeight: 65, 
            gridLines: 'Horizontal',
            columns: GridConfig.getColumns(),
            queryCellInfo: (args) => this.handleQueryCellInfo(args),
            recordClick: (args) => {
                if(args.rowData) this.openHistoryPanel(args.rowData.visitante_id, args.rowData.visitante_nombre);
            }
        });

        this.gridInstance.appendTo('#GridRegistros');
    }

    handleQueryCellInfo(args) {
        if (args.column.field === 'visitante_nombre') args.cell.innerHTML = GridConfig.columnaPerfil(args.data);
        else if (args.column.field === 'estado_actual') args.cell.innerHTML = GridConfig.columnaEstado(args.data);
        else if (args.column.field === 'ultima_visita') args.cell.innerHTML = GridConfig.columnaUltimoIngreso(args.data);
    }

    // --- LÓGICA MÓVIL (Native List) ---
    renderMobileView(data) {
        const container = document.getElementById('MobileListView');
        const inputSearch = document.getElementById('MobileSearchInput');
        
        // 1. Función para pintar la lista
        const paintList = (items) => {
            if (items.length === 0) {
                container.innerHTML = `
                    <div class="text-center p-5 opacity-50">
                        <i class="fas fa-search fa-2x mb-3"></i>
                        <p>No se encontraron resultados</p>
                    </div>`;
                return;
            }

            const html = items.map(item => {
                const img = item.visitante_img || '/static/home/img/default_avatar.png';
                const isEnZona = item.estado_actual === 'En Zona';
                const statusClass = isEnZona ? 'active' : 'inactive';
                const statusText = isEnZona ? 'En Zona' : item.ultima_visita;

                return `
                <div class="m-card" onclick="document.dispatchEvent(new CustomEvent('card-click', {detail: {id: ${item.visitante_id}, name: '${item.visitante_nombre}'}}))">
                    <img src="${img}" class="m-avatar-img" alt="Avatar">
                    <div class="m-info">
                        <div class="m-name">${item.visitante_nombre}</div>
                        <div class="m-details">
                            <span class="m-status-dot ${statusClass}"></span>
                            <span>${item.empresa || 'Particular'} • ${statusText}</span>
                        </div>
                    </div>
                    <i class="fas fa-chevron-right m-chevron"></i>
                </div>
                `;
            }).join('');
            
            container.innerHTML = html;
        };

        // 2. Pintar inicial
        paintList(data);

        // 3. Evento de Búsqueda (Filtro local rápido)
        inputSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = data.filter(item => 
                item.visitante_nombre.toLowerCase().includes(term) ||
                (item.empresa && item.empresa.toLowerCase().includes(term))
            );
            paintList(filtered);
        });

        // 4. Delegación de eventos para clicks en tarjetas (Truco para evitar onclick en HTML string)
        document.addEventListener('card-click', (e) => {
            this.openHistoryPanel(e.detail.id, e.detail.name);
        });
    }

    openHistoryPanel(visitanteId, visitanteNombre) {
        PanelRegistrosUI.open(visitanteId, visitanteNombre, () => {
            // Opcional: Recargar datos silenciosamente al cerrar panel
            // this.refreshData(); 
        });
    }
}
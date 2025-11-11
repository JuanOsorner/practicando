/**
 * main.js (Refactorizado)
 * Punto de entrada. Carga recursos, inicializa componentes (Controladores)
 * y los conecta.
 */
import * as api from './apiService.js';
import { SidePanel } from './SidePanel.js';
import { EmpresasView } from './EmpresasView.js';
import { mostrarNotificacion } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {

    try {
        // 1. Cargar recursos globales que ambos componentes puedan necesitar
        // (En este caso, SidePanel los necesita para sus dropdowns)
        const recursos = await api.fetchRecursos();

        // 2. Obtener los elementos raíz de nuestros componentes
        const viewContainer = document.getElementById('vista-lista');
        const panelElement = document.getElementById('side-panel');
        const overlayElement = document.getElementById('panel-overlay');

        // 3. Crear las instancias de los "expertos"
        const panel = new SidePanel(panelElement, overlayElement, recursos);
        const view = new EmpresasView(viewContainer);

        // 4. Conectar los componentes (El "Glue Code")
        
        // CUANDO la Vista (view) diga "hicieron clic en una tarjeta"...
        view.onCardClick = (empresaData) => {
            // ...DILE al Panel (panel) que se abra con esos datos.
            panel.openForCompany(empresaData);
        };

        // CUANDO la Vista (view) diga "quieren crear una nueva empresa"...
        view.onNewClick = () => {
            // ...DILE al Panel (panel) que se abra en modo "nuevo".
            panel.openForNewCompany();
        };

        // CUANDO el Panel (panel) diga "acabo de guardar una empresa"...
        panel.onCompanySaved = () => {
            // ...DILE a la Vista (view) que se recargue.
            view.loadEmpresas();
        };

        // 5. ¡Que comience el concierto!
        // Carga la lista inicial de empresas.
        view.loadEmpresas();

    } catch (error) {
        // Error catastrófico, ej. no se pudieron cargar los recursos iniciales
        mostrarNotificacion(`Error al cargar la página: ${error.message}`);
    }
});
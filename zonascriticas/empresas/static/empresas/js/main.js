/**
 * main.js (Empresas App)
 * PUNTO DE ENTRADA PRINCIPAL
 * ---------------------------
 * Refactorizado para trabajar con la arquitectura de GlobalPanel.
 */

import * as api from './apiService.js';
import { SidePanel } from './SidePanel.js';
import { EmpresasView } from './EmpresasView.js';
import { ui } from '/static/home/js/core/ui.js';

document.addEventListener('DOMContentLoaded', async () => {

    try {
        // --- PASO 1: PREPARACIÓN ---
        // Cargamos recursos transversales necesarios (Cargos, Servicios)
        const recursos = await api.fetchRecursos();

        // Obtenemos referencias al contenedor principal de la vista (Grid)
        const viewContainer = document.getElementById('vista-lista');

        // Validación de seguridad: Solo verificamos el contenedor de la vista.
        // YA NO buscamos el panel ni el overlay aquí, porque son Globales y SidePanel se encarga.
        if (!viewContainer) {
            throw new Error("No se encontró el contenedor de la vista 'vista-lista'.");
        }

        // --- PASO 2: INICIALIZACIÓN DE COMPONENTES ---
        
        // Instanciamos el Panel Lateral.
        // Pasamos 'null' en los argumentos de elementos DOM porque SidePanel ya usa GlobalPanel.
        const panel = new SidePanel(null, null, recursos);
        
        // Instanciamos la Vista Principal
        const view = new EmpresasView(viewContainer);

        // --- PASO 3: CONEXIÓN DE EVENTOS (GLUE CODE) ---
        
        /**
         * EVENTO: Clic en tarjeta del Grid.
         * ACCIÓN: Abrir Panel en modo Edición.
         */
        view.onCardClick = (empresaData) => {
            panel.openForCompany(empresaData);
        };

        /**
         * EVENTO: Clic en botón "Registrar Empresa".
         * ACCIÓN: Abrir Panel en modo Creación.
         */
        view.onNewClick = () => {
            panel.openForNewCompany();
        };

        /**
         * EVENTO: El Panel guardó cambios exitosamente.
         * ACCIÓN: Recargar el Grid.
         */
        panel.onCompanySaved = () => {
            view.loadEmpresas();
        };

        // --- PASO 4: EJECUCIÓN INICIAL ---
        await view.loadEmpresas();

    } catch (error) {
        console.error("Error crítico en main.js:", error);
        ui.showError(
            `No se pudo iniciar la aplicación de empresas: ${error.message}`,
            "Error de Inicialización"
        );
    }
});
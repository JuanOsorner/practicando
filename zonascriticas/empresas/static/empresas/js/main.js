/**
 * main.js (Empresas App)
 * * PUNTO DE ENTRADA PRINCIPAL
 * ---------------------------
 * Este archivo actúa como el "Controlador" o "Director" del frontend para esta app.
 * Su responsabilidad es:
 * 1. Inicializar los componentes visuales (Vista Principal y Panel Lateral).
 * 2. Cargar los datos iniciales necesarios (Recursos globales).
 * 3. Conectar los eventos entre componentes ("Glue Code").
 * 4. Manejar errores catastróficos de inicialización.
 * * ARQUITECTURA:
 * - Usa 'apiService.js' (local) que a su vez usa 'home/core/api.js' para datos.
 * - Usa 'home/core/ui.js' para notificaciones globales estandarizadas.
 */

// 1. Importaciones Locales (Lógica específica de Empresas)
import * as api from './apiService.js';
import { SidePanel } from './SidePanel.js';
import { EmpresasView } from './EmpresasView.js';
import { ui } from '/static/home/js/core/ui.js';

document.addEventListener('DOMContentLoaded', async () => {

    try {
        // --- PASO 1: PREPARACIÓN ---
        // Cargamos recursos transversales necesarios antes de pintar nada.
        // (Ej: Listas de cargos y servicios para los selects del formulario)
        const recursos = await api.fetchRecursos();

        // Obtenemos referencias a los contenedores principales del DOM
        // Usamos IDs que deben existir en 'empresas.html' (heredado de home)
        const viewContainer = document.getElementById('vista-lista');
        const panelElement = document.getElementById('side-panel'); // Ahora vive en el bloque 'extras'
        const overlayElement = document.getElementById('panel-overlay');

        // Validación de seguridad: Si falta algo crítico en el HTML, detenemos todo.
        if (!viewContainer || !panelElement || !overlayElement) {
            throw new Error("Faltan elementos críticos en el DOM (vista-lista, side-panel o overlay).");
        }

        // --- PASO 2: INICIALIZACIÓN DE COMPONENTES ---
        // Instanciamos el Panel Lateral (Encargado de formularios y edición)
        const panel = new SidePanel(panelElement, overlayElement, recursos);
        
        // Instanciamos la Vista Principal (Encargada del Grid, Buscador y Filtros)
        const view = new EmpresasView(viewContainer);

        // --- PASO 3: CONEXIÓN DE EVENTOS (GLUE CODE) ---
        // Aquí definimos cómo "hablan" los componentes entre sí.
        
        /**
         * EVENTO: Usuario hace clic en una tarjeta de empresa en el Grid.
         * ACCIÓN: Ordenar al Panel que se abra en modo "Edición" con los datos recibidos.
         */
        view.onCardClick = (empresaData) => {
            panel.openForCompany(empresaData);
        };

        /**
         * EVENTO: Usuario hace clic en el botón "Registrar Empresa" (Web o Móvil).
         * ACCIÓN: Ordenar al Panel que se abra en modo "Creación" (limpio).
         */
        view.onNewClick = () => {
            panel.openForNewCompany();
        };

        /**
         * EVENTO: El Panel confirma que guardó cambios exitosamente (Crear o Editar).
         * ACCIÓN: Ordenar a la Vista que recargue los datos del servidor para reflejar cambios.
         */
        panel.onCompanySaved = () => {
            view.loadEmpresas();
        };

        // --- PASO 4: EJECUCIÓN INICIAL ---
        // Todo está listo y conectado. Cargamos la lista inicial de empresas.
        await view.loadEmpresas();

    } catch (error) {
        // --- MANEJO DE ERRORES FATALES ---
        // Si algo falla aquí (ej: API caída al inicio, error de JS),
        // usamos la UI Global para mostrar un mensaje de error elegante.
        console.error("Error crítico en main.js:", error);
        ui.showError(
            `No se pudo iniciar la aplicación de empresas: ${error.message}`,
            "Error de Inicialización"
        );
    }
});
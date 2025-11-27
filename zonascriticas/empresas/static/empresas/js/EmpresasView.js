/**
 * EmpresasView.js
 * ---------------------------
 * Módulo de Vista (View) encargado de la presentación de datos.
 * * RESPONSABILIDADES:
 * 1. Gestionar el Grid de tarjetas (renderizado HTML).
 * 2. Manejar filtros y búsqueda en tiempo real.
 * 3. Sincronizar interfaces Web y Móvil (dos contenedores DOM distintos).
 * 4. Delegar acciones de negocio (Clic en tarjeta, Toggle de estado) al Controlador.
 * * ARQUITECTURA:
 * - Consume 'apiService.js' para obtener datos.
 * - Usa 'ui.js' (Core Global) para alertas y confirmaciones.
 */

import * as api from './apiService.js';
import * as templateBuilder from './uiComponents.js'; // Renombrado para claridad
import { ui } from '/static/home/js/core/ui.js';

export class EmpresasView {
    // --- Estado Interno (Privado) ---
    #gridContainers; // NodeList (Web y Móvil)
    #searchInputs;   // NodeList (Web y Móvil)
    #filterButtons;  // NodeList
    #newButtons;     // NodeList

    #empresas = [];          // Cache local de datos
    #filtroActual = 'todos'; // Estado del filtro activo
    #busquedaActual = '';    // Estado del input de búsqueda
    #searchTimeout = null;   // Para el debounce (espera al escribir)

    // --- Event Callbacks (Comunicación con main.js) ---
    onCardClick = (empresa) => {}; 
    onNewClick = () => {}; 

    /**
     * Inicializa la vista buscando los elementos en el DOM.
     * @param {HTMLElement} containerElement - Referencia al contenedor padre (opcional en este diseño multi-vista).
     */
    constructor(containerElement) {
        // 1. Buscamos TODOS los contenedores de grid (Web y Móvil)
        // Usamos la clase '.js-empresas-container' definida en el HTML
        this.#gridContainers = document.querySelectorAll('.js-empresas-container');
        
        // 2. Buscamos TODOS los inputs de búsqueda sincronizados
        this.#searchInputs = document.querySelectorAll('.js-buscador-empresas');
        
        // 3. Botones de filtro y creación
        this.#filterButtons = document.querySelectorAll('.btn-filter');
        this.#newButtons = document.querySelectorAll('#btn-registrar-empresa'); // QuerySelectorAll soporta múltiples IDs iguales (aunque no es ideal en HTML estándar, aquí es práctico)

        // 4. Iniciamos los escuchadores de eventos
        this.#initListeners();
    }

    /**
     * Configura todos los eventos del DOM (Inputs, Clics, Filtros).
     */
    #initListeners() {
        // A. Buscador con Sincronización y Debounce
        this.#searchInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const valor = e.target.value;
                
                // Sincronización Visual: Si escribo en móvil, que se vea en desktop (y viceversa)
                this.#searchInputs.forEach(otherInput => {
                    if (otherInput !== input) otherInput.value = valor;
                });
                
                // Debounce: Esperar 300ms antes de llamar a la API
                clearTimeout(this.#searchTimeout);
                this.#searchTimeout = setTimeout(() => {
                    this.#busquedaActual = valor.trim();
                    this.loadEmpresas();
                }, 300);
            });
        });

        // B. Filtros (Todos / Activos / Inactivos)
        this.#filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                const filterType = button.dataset.filter;
                
                // Actualizar estado visual de TODOS los botones de filtro
                this.#filterButtons.forEach(btn => {
                    if(btn.dataset.filter === filterType) btn.classList.add('active');
                    else btn.classList.remove('active');
                });
                
                this.#filtroActual = filterType;
                this.loadEmpresas();
            });
        });

        // C. Botón "Registrar Empresa"
        this.#newButtons.forEach(btn => {
            btn.addEventListener('click', () => this.onNewClick());
        });

        // D. Delegación de Eventos en el Grid (Para performance)
        // Escuchamos clics en el contenedor padre en lugar de cada tarjeta individual
        this.#gridContainers.forEach(container => {
            container.addEventListener('click', (e) => {
                this.#handleGridClick(e);
            });
        });
    }

    /**
     * Carga datos desde el servidor y actualiza la interfaz.
     * Este es el método principal público.
     */
    async loadEmpresas() {
        try {
            const data = await api.fetchEmpresas(this.#filtroActual, this.#busquedaActual);
            
            // Ordenamiento en cliente (Opcional, podría venir del backend)
            // Prioriza activas arriba
            this.#empresas = data.empresas.sort((a, b) => b.estado - a.estado);
            
            this.#render();
        } catch (error) {
            ui.showNotification(`Error al cargar empresas: ${error.message}`, 'error');
        }
    }

    /**
     * Pinta las tarjetas en el DOM.
     * Actualiza TODOS los contenedores (Móvil y Desktop) simultáneamente.
     */
    #render() {
        this.#gridContainers.forEach(container => {
            container.innerHTML = ''; // Limpiar contenido previo
            
            if (this.#empresas.length === 0) {
                container.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--color-texto-secundario);">
                        <p>No se encontraron empresas con los criterios actuales.</p>
                    </div>`;
                return;
            }
            
            // Generar HTML
            this.#empresas.forEach(empresa => {
                const cardHTML = templateBuilder.createEmpresaCard(empresa);
                container.insertAdjacentHTML('beforeend', cardHTML);
            });
        });
    }

    /**
     * Maneja la lógica al hacer clic dentro del Grid.
     * Discrimina si fue en el "Switch" o en la tarjeta.
     */
    #handleGridClick(e) {
        const card = e.target.closest('.empleado-card');
        if (!card) return; // Clic fuera de una tarjeta

        const empresaId = card.dataset.id;
        
        // CASO 1: Clic en el Toggle (Switch de estado)
        if (e.target.classList.contains('toggle-estado')) {
            e.preventDefault(); // Evitar cambio visual inmediato (esperar confirmación)
            
            const nuevoEstado = e.target.checked; // El estado al que el usuario QUIERE ir
            
            this.#handleUpdateEstado(empresaId, nuevoEstado); 
            return;
        }
        
        // CASO 2: Clic en la tarjeta (Abrir panel)
        // Verifica si el clic fue en un elemento marcado para abrir panel
        if (e.target.closest('[data-action="open-panel"]')) {
            const empresaData = this.#empresas.find(emp => emp.id == empresaId);
            if (empresaData) {
                this.onCardClick(empresaData); // Notificar al Director (main.js)
            }
        }
    }

    /**
     * Lógica de negocio para cambiar estado (Confirmaciones).
     */
    async #handleUpdateEstado(empresaId, nuevoEstado) {
        // Si se intenta DESACTIVAR, pedimos confirmación fuerte
        if (nuevoEstado === false) {
            const confirmado = await ui.confirm(
                '¿Desactivar Empresa?', 
                "Al desactivar la empresa, se desactivarán automáticamente todos sus empleados. ¿Desea continuar?", 
                'Sí, desactivar'
            );

            if (confirmado) {
                this.#performEstadoUpdate(empresaId, false);
            } else {
                // Si cancela, recargamos para asegurar que el switch visual vuelva a su lugar
                this.#render(); 
            }
        } else {
            // Si se intenta ACTIVAR, procedemos directamente
            this.#performEstadoUpdate(empresaId, true);
        }
    }

    /**
     * Ejecuta la petición a la API para cambiar estado.
     */
    async #performEstadoUpdate(empresaId, nuevoEstado) {
        try {
            // El adaptador ya valida éxito. Si pasa, es true.
            await api.updateEmpresaEstado(empresaId, nuevoEstado);
            
            // CAMBIO: Mensaje fijo en el UI, ya que api.js se traga el mensaje del backend
            const msg = nuevoEstado ? 'Empresa activada correctamente' : 'Empresa desactivada';
            ui.showNotification(msg, 'success');
            
            await this.loadEmpresas(); 
        } catch (error) {
            ui.showNotification(error.message, 'error');
            await this.loadEmpresas(); 
        }
    }
}
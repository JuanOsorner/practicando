/**
 * EmpresasView.js
 * Componente de clase que maneja la vista principal de la cuadrícula de empresas,
 * la búsqueda y los filtros.
 */
import * as api from './apiService.js';
import * as ui from './uiComponents.js';
import { mostrarNotificacion } from './utils.js';

export class EmpresasView {
    // Elementos del DOM
    #container;
    #gridContainer;
    #searchInput;
    #filterButtons;
    #newButton;

    // Estado interno
    #empresas = [];
    #filtroActual = 'todos';
    #busquedaActual = '';
    #searchTimeout = null;

    // Callbacks de comunicación (hacia main.js)
    onCardClick = (empresa) => {}; // Se llama al hacer clic en una tarjeta
    onNewClick = () => {};         // Se llama al hacer clic en "Registrar Empresa"

    constructor(containerElement) {
        this.#container = containerElement;
        
        // Encontrar elementos clave dentro de este componente
        this.#gridContainer = this.#container.querySelector('#empresas-container');
        this.#searchInput = this.#container.querySelector('#buscador-empresas');
        this.#filterButtons = this.#container.querySelectorAll('.filter-group .btn-filter');
        this.#newButton = this.#container.querySelector('#btn-registrar-empresa');
        
        this.#initListeners();
    }

    /** Configura los listeners para la búsqueda, filtros y clics */
    #initListeners() {
        // 1. Buscador (con debounce)
        this.#searchInput.addEventListener('input', () => {
            clearTimeout(this.#searchTimeout);
            this.#searchTimeout = setTimeout(() => {
                this.#busquedaActual = this.#searchInput.value.trim();
                this.loadEmpresas();
            }, 300);
        });

        // 2. Botones de Filtro
        this.#filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.#filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                this.#filtroActual = button.dataset.filter;
                this.loadEmpresas();
            });
        });

        // 3. Botón "Registrar Empresa"
        this.#newButton.addEventListener('click', () => {
            this.onNewClick(); // Notifica al "director"
        });

        // 4. Delegación de clics en la cuadrícula (para tarjetas y toggles)
        this.#gridContainer.addEventListener('click', (e) => {
            this.#handleGridClick(e);
        });
    }

    /** Carga las empresas desde la API y las renderiza */
    async loadEmpresas() {
        try {
            const data = await api.fetchEmpresas(this.#filtroActual, this.#busquedaActual);
            this.#empresas = data.empresas.sort((a, b) => b.estado - a.estado);
            this.#render();
        } catch (error) {
            mostrarNotificacion(error.message);
        }
    }

    /** Renderiza la cuadrícula con el estado actual */
    #render() {
        this.#gridContainer.innerHTML = '';
        if (this.#empresas.length === 0) {
            this.#gridContainer.innerHTML = "<p>No se encontraron empresas.</p>";
            return;
        }
        this.#empresas.forEach(empresa => {
            const cardHTML = ui.createEmpresaCard(empresa);
            this.#gridContainer.insertAdjacentHTML('beforeend', cardHTML);
        });
    }

    /** Maneja los clics dentro de la cuadrícula */
    #handleGridClick(e) {
        const card = e.target.closest('.empleado-card');
        if (!card) return;

        const empresaId = card.dataset.id;
        
        // 1. Clic en el toggle de estado
        if (e.target.classList.contains('toggle-estado')) {
            e.preventDefault(); // Previene que el toggle cambie antes de la confirmación
            const toggle = e.target;
            const nuevoEstado = toggle.checked;
            this.#handleUpdateEstado(empresaId, nuevoEstado, toggle);
            return;
        }
        
        // 2. Clic en la tarjeta para abrir el panel
        if (e.target.closest('[data-action="open-panel"]')) {
            const empresaData = this.#empresas.find(emp => emp.id == empresaId);
            if (empresaData) {
                this.onCardClick(empresaData); // Notifica al "director"
            }
        }
    }

    /** Maneja la lógica de actualizar estado (incluyendo la alerta) */
    #handleUpdateEstado(empresaId, nuevoEstado, toggleElement) {
        if (nuevoEstado === false) {
            // Requiere confirmación para desactivar
            Swal.fire({
                title: '¿Desactivar Empresa?',
                text: "Esta acción desactivará a TODOS los empleados de esta empresa.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sí, desactivar',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    this.#performEstadoUpdate(empresaId, false);
                } else {
                    toggleElement.checked = true; // Revierte el toggle
                }
            });
        } else {
            // Activar no requiere confirmación
            this.#performEstadoUpdate(empresaId, true);
        }
    }

    /** Llama a la API para cambiar el estado y recarga la vista */
    async #performEstadoUpdate(empresaId, nuevoEstado) {
        try {
            const response = await api.updateEmpresaEstado(empresaId, nuevoEstado);
            mostrarNotificacion(response.message, 'success');
            await this.loadEmpresas(); // Recarga la cuadrícula
        } catch (error) {
            mostrarNotificacion(error.message);
            await this.loadEmpresas(); // Recarga para revertir el estado visual
        }
    }
}
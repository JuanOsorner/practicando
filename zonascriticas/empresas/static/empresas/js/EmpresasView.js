/**
 * EmpresasView.js
 * Actualizado para soportar Multi-Vista (Web y Móvil simultáneos)
 */
import * as api from './apiService.js';
import * as ui from './uiComponents.js';
import { mostrarNotificacion } from './utils.js';

export class EmpresasView {
    // Elementos del DOM (Ahora serán arrays o NodeLists)
    #container;
    #gridContainers; // Plural: manejaremos varios contenedores
    #searchInputs;   // Plural: manejaremos varios inputs
    #filterButtons;
    #newButtons;     // Plural: botón registrar web y móvil

    // Estado interno
    #empresas = [];
    #filtroActual = 'todos';
    #busquedaActual = '';
    #searchTimeout = null;

    // Callbacks
    onCardClick = (empresa) => {}; 
    onNewClick = () => {}; 

    constructor(containerElement) {
        // containerElement aquí es irrelevante porque buscamos en todo el document
        // para encontrar ambas vistas (web y móvil)
        
        // 1. Buscamos TODOS los contenedores de grid (por clase)
        this.#gridContainers = document.querySelectorAll('.js-empresas-container');
        
        // 2. Buscamos TODOS los inputs de búsqueda (por clase)
        this.#searchInputs = document.querySelectorAll('.js-buscador-empresas');
        
        // 3. Botones de filtro (delegación global o búsqueda amplia)
        // Asumimos que los botones de filtro funcionan bien, pero idealmente deberían ser clases también.
        this.#filterButtons = document.querySelectorAll('.btn-filter');

        // 4. Botones de nuevo registro (puede haber uno en web y otro en móvil)
        this.#newButtons = document.querySelectorAll('#btn-registrar-empresa'); // Ojo: IDs duplicados en HTML es ilegal, deberías cambiarlo a clase, pero usaremos querySelectorAll para intentar capturarlos.
        
        this.#initListeners();
    }

    #initListeners() {
        // 1. Configurar TODOS los buscadores para que se sincronicen
        this.#searchInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const valor = e.target.value;
                // Sincronizar visualmente el otro input (si escribo en móvil, que aparezca en web)
                this.#searchInputs.forEach(i => i.value = valor);
                
                clearTimeout(this.#searchTimeout);
                this.#searchTimeout = setTimeout(() => {
                    this.#busquedaActual = valor.trim();
                    this.loadEmpresas();
                }, 300);
            });
        });

        // 2. Filtros (Esto se mantiene similar, asumiendo que compartes lógica)
        this.#filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Actualizar estilo en TODOS los botones del mismo tipo
                const filterType = button.dataset.filter;
                this.#filterButtons.forEach(btn => {
                    if(btn.dataset.filter === filterType) btn.classList.add('active');
                    else btn.classList.remove('active');
                });
                
                this.#filtroActual = filterType;
                this.loadEmpresas();
            });
        });

        // 3. Botones de "Nuevo"
        this.#newButtons.forEach(btn => {
            btn.addEventListener('click', () => this.onNewClick());
        });

        // 4. Delegación de clics en CADA contenedor
        this.#gridContainers.forEach(container => {
            container.addEventListener('click', (e) => {
                this.#handleGridClick(e);
            });
        });
    }

    async loadEmpresas() {
        try {
            const data = await api.fetchEmpresas(this.#filtroActual, this.#busquedaActual);
            this.#empresas = data.empresas.sort((a, b) => b.estado - a.estado);
            this.#render();
        } catch (error) {
            mostrarNotificacion(error.message);
        }
    }

    #render() {
        // Renderizamos el contenido en TODOS los contenedores disponibles (Web y Móvil)
        this.#gridContainers.forEach(container => {
            container.innerHTML = ''; // Limpiar
            
            if (this.#empresas.length === 0) {
                container.innerHTML = "<p>No se encontraron empresas.</p>";
                return;
            }
            
            this.#empresas.forEach(empresa => {
                const cardHTML = ui.createEmpresaCard(empresa);
                container.insertAdjacentHTML('beforeend', cardHTML);
            });
        });
    }

    #handleGridClick(e) {
        const card = e.target.closest('.empleado-card');
        if (!card) return;

        const empresaId = card.dataset.id;
        
        // Toggle estado
        if (e.target.classList.contains('toggle-estado')) {
            e.preventDefault(); 
            const toggle = e.target;
            const nuevoEstado = toggle.checked;
            this.#handleUpdateEstado(empresaId, nuevoEstado); // Ya no pasamos 'toggle' específico porque hay que actualizar ambos
            return;
        }
        
        // Abrir panel
        if (e.target.closest('[data-action="open-panel"]')) {
            const empresaData = this.#empresas.find(emp => emp.id == empresaId);
            if (empresaData) {
                this.onCardClick(empresaData);
            }
        }
    }

    #handleUpdateEstado(empresaId, nuevoEstado) {
        // Lógica de confirmación igual...
        if (nuevoEstado === false) {
            Swal.fire({
                title: '¿Desactivar Empresa?',
                text: "Se desactivarán los empleados.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    this.#performEstadoUpdate(empresaId, false);
                } else {
                    // Revertir visualmente en TODOS los grids
                    this.loadEmpresas(); 
                }
            });
        } else {
            this.#performEstadoUpdate(empresaId, true);
        }
    }

    async #performEstadoUpdate(empresaId, nuevoEstado) {
        try {
            const response = await api.updateEmpresaEstado(empresaId, nuevoEstado);
            mostrarNotificacion(response.message, 'success');
            await this.loadEmpresas(); 
        } catch (error) {
            mostrarNotificacion(error.message);
            await this.loadEmpresas(); 
        }
    }
}
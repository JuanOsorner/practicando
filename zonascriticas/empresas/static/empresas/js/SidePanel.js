/**
 * SidePanel.js
 * ---------------------------
 * Componente Controlador del Panel Lateral (Slide-over).
 * * * RESPONSABILIDADES:
 * 1. Renderizar formularios (Crear/Editar) dentro del panel.
 * 2. Gestionar widgets complejos (Syncfusion MultiSelect).
 * 3. Manejar la sub-lista de empleados dentro de una empresa.
 * 4. Enviar datos de formularios al API y manejar la respuesta visual.
 * * * ARQUITECTURA:
 * - Usa 'apiService.js' para comunicación con el backend.
 * - Usa 'ui.js' (Core Global) para feedback visual estandarizado.
 * - Usa 'uiComponents.js' (alias templateBuilder) para generar HTML puro.
 */

import * as api from './apiService.js';
import * as templateBuilder from './uiComponents.js'; // Renombrado para evitar conflicto con 'ui' global
import { ui } from '/static/home/js/core/ui.js';

export class SidePanel {
    // --- Elementos del DOM (Referencias cacheadas) ---
    #panelEl;
    #overlayEl;
    #titleEl;
    #formEl;
    #backBtnEl;

    // --- Estado Interno ---
    #recursos;          // Objeto con listas de { cargos, servicios } para los selects
    #currentCompany = null; // Datos de la empresa actualmente abierta (o null si es nueva)
    #empleados = [];    // Lista local de empleados de la empresa actual
    #isEditingEmployee = false; // Bandera para saber si el formulario visible es de empleado o empresa

    // --- Widgets de Terceros (Syncfusion) ---
    #serviciosWidget = null;
    #cargoWidget = null;

    // --- Callbacks (Comunicación hacia afuera) ---
    onCompanySaved = () => {}; // Se dispara cuando se crea/edita algo exitosamente

    /**
     * Constructor: Inicializa referencias y eventos base.
     * @param {HTMLElement} panelEl - El contenedor principal del panel.
     * @param {HTMLElement} overlayEl - El fondo oscuro.
     * @param {object} recursos - Datos precargados para los selects.
     */
    constructor(panelEl, overlayEl, recursos = { cargos: [], servicios: [] }) {
        this.#panelEl = panelEl;
        this.#overlayEl = overlayEl;
        this.#recursos = recursos;

        // Encontrar elementos internos críticos
        this.#titleEl = this.#panelEl.querySelector('#panel-title');
        this.#formEl = this.#panelEl.querySelector('#panel-form');
        this.#backBtnEl = this.#panelEl.querySelector('#panel-back-btn');

        // Configurar escuchadores de eventos una única vez
        this.#initListeners();
    }

    // =================================================
    // === API PÚBLICA (Métodos usados por main.js) ===
    // =================================================

    /**
     * Abre el panel visualizando los detalles de una empresa existente.
     * @param {object} companyData - Objeto con datos de la empresa.
     */
    async openForCompany(companyData) {
        this.#currentCompany = companyData;
        this.#isEditingEmployee = false;
        this.#titleEl.textContent = `Detalles de ${companyData.nombre_empresa}`;

        // 1. Renderizar el HTML base (Info + Formulario oculto)
        this.#formEl.innerHTML = templateBuilder.getPanelContentHTML(companyData);

        // 2. Inicializar el widget de servicios (en modo lectura/edición oculta)
        this.#initCompanyWidgets(companyData.servicios);

        // 3. Mostrar el panel animado
        this.show();

        // 4. Cargar la lista de empleados asíncronamente
        await this.#loadEmployees(companyData.id);
    }

    /**
     * Abre el panel limpio para registrar una nueva empresa.
     */
    openForNewCompany() {
        this.#currentCompany = null;
        this.#isEditingEmployee = false;
        this.#titleEl.textContent = 'Registrar Nueva Empresa';

        // 1. Renderizar HTML en modo "Nuevo"
        this.#formEl.innerHTML = templateBuilder.getPanelContentHTML(null);
        
        // 2. Inicializar widgets habilitados para edición
        this.#initCompanyWidgets([], true);

        // 3. Mostrar panel
        this.show();
    }

    /** Despliega el panel agregando la clase CSS */
    show() {
        document.body.classList.add('panel-is-open');
    }

    /** Cierra el panel, limpia el DOM y destruye widgets para liberar memoria */
    close() {
        document.body.classList.remove('panel-is-open');
        this.#formEl.innerHTML = ''; // Limpieza del DOM
        
        // Reset del estado interno
        this.#currentCompany = null;
        this.#empleados = [];
        this.#isEditingEmployee = false;
        
        // Destrucción de instancias de Syncfusion
        this.#destroyWidgets();
    }

    // =================================================
    // === MANEJO DE EVENTOS INTERNOS ===
    // =================================================

    #initListeners() {
        // Cerrar al dar clic fuera o en el botón volver
        this.#overlayEl.addEventListener('click', () => this.close());
        this.#backBtnEl.addEventListener('click', () => this.#handleBack());
        
        // Manejador central del Submit (evita recarga)
        this.#formEl.addEventListener('submit', (e) => this.#handleSubmit(e));

        // Delegación de eventos: Clics dinámicos dentro del formulario
        this.#formEl.addEventListener('click', (e) => this.#handleClickDelegation(e));
        
        // Delegación de eventos: Inputs dinámicos (Buscador, File Upload)
        this.#formEl.addEventListener('input', (e) => this.#handleInputDelegation(e));
    }

    /** Lógica inteligente del botón "Atrás" */
    #handleBack() {
        if (this.#isEditingEmployee) {
            // Si estoy editando empleado, "Atrás" significa volver a la Empresa
            this.openForCompany(this.#currentCompany);
        } else {
            // Si estoy en la empresa, "Atrás" significa cerrar
            this.close();
        }
    }

    /** Centralizador de clics (Router interno de acciones) */
    #handleClickDelegation(e) {
        // A. Toggle Estado Empleado (Switch)
        if (e.target.classList.contains('toggle-estado-empleado')) {
            const card = e.target.closest('.employee-card-compact');
            if (!card || e.target.disabled) return;
            
            const empleadoId = card.dataset.employeeId;
            const nuevoEstado = e.target.checked;
            this.#handleUpdateEstadoEmpleado(empleadoId, nuevoEstado, card);
            return;
        }

        // B. Filtros de la lista de Empleados
        const filterBtn = e.target.closest('#panel-empleados-section .btn-filter');
        if (filterBtn) {
            // Gestión de clases 'active'
            this.#formEl.querySelectorAll('#panel-empleados-section .btn-filter')
                .forEach(btn => btn.classList.remove('active'));
            filterBtn.classList.add('active');
            
            // Aplicar filtro
            this.#filterEmpleados();
            return;
        }
        
        // C. Botones de Acción (data-action)
        const actionTarget = e.target.closest('[data-action]');
        if (!actionTarget) return;

        const action = actionTarget.dataset.action;

        switch (action) {
            case 'edit-company':
                // Activa el modo edición visualmente
                this.#formEl.querySelector('.info-card').classList.add('is-editing');
                if (this.#serviciosWidget) this.#serviciosWidget.enabled = true;
                break;

            case 'cancel-edit-company':
                // Recarga el panel o cierra si era nuevo
                this.#currentCompany ? this.openForCompany(this.#currentCompany) : this.close();
                break;

            case 'register-employee':
                // Cambia la vista al formulario de empleado vacío
                this.#initEmployeeForm(null);
                break;

            case 'edit-employee':
                // Carga datos del empleado seleccionado y muestra formulario
                const card = e.target.closest('.employee-card-compact');
                const empId = card.dataset.employeeId;
                const empData = this.#empleados.find(e => e.id == empId);
                
                if (empData) {
                    this.#initEmployeeForm(empData);
                } else {
                    ui.showNotification('Error al cargar datos del empleado', 'error');
                }
                break;

            case 'cancel-edit-employee':
                // Vuelve a la vista de la empresa
                this.openForCompany(this.#currentCompany);
                break;

            case 'trigger-image-upload':
                // Proxy para el input file oculto
                this.#formEl.querySelector('#imagen_empleado').click();
                break;
        }
    }

    #handleInputDelegation(e) {
        // Buscador en tiempo real de empleados
        if (e.target.id === 'buscador-panel-empleados') {
            this.#filterEmpleados();
        }
        // Previsualización de imagen al seleccionar archivo
        if (e.target.id === 'imagen_empleado') {
            this.#handleImagePreview(e);
        }
    }

    async #handleSubmit(e) {
        e.preventDefault();
        
        if (this.#isEditingEmployee) {
            await this.#handleSaveEmployee();
        } else {
            // Asegurarse que el submit venga del botón de guardar empresa
            if (e.submitter && e.submitter.dataset.action === 'save-company') {
                await this.#handleSaveCompany();
            }
        }
    }

    // =================================================
    // === GESTIÓN DE WIDGETS Y FORMULARIOS ===
    // =================================================

    /** Renderiza e inicializa el formulario de Empleado */
    #initEmployeeForm(employeeData) {
        this.#isEditingEmployee = true;
        this.#titleEl.textContent = employeeData ? 'Editar Empleado' : 'Nuevo Empleado';
        
        // HTML
        this.#formEl.innerHTML = templateBuilder.getEmployeeFormHTML(employeeData, this.#recursos.cargos);
        
        // Limpieza de widget de empresa (no necesario aquí)
        if (this.#serviciosWidget) {
            this.#serviciosWidget.destroy();
            this.#serviciosWidget = null;
        }

        // Inicialización del MultiSelect para Cargo
        const cargoElem = this.#formEl.querySelector('#cargo-empleado-multiselect');
        const cargoInput = this.#formEl.querySelector('#cargo-empleado-hidden');
        
        if (this.#cargoWidget) this.#cargoWidget.destroy();

        this.#cargoWidget = new ej.dropdowns.MultiSelect({
            dataSource: this.#recursos.cargos, 
            fields: { value: 'id', text: 'text' },
            placeholder: 'Selecciona un cargo',
            mode: 'Box',
            maximumSelectionLength: 1,
            value: employeeData ? [employeeData.cargo] : [],
            allowCustomValue: true,
            // Sincronización con input oculto para el FormData
            change: (args) => {
                cargoInput.value = (args.value && args.value.length > 0) ? args.value[0] : '';
            }
        });
        this.#cargoWidget.appendTo(cargoElem);
    }

    /** Inicializa el widget de Servicios para Empresa */
    #initCompanyWidgets(selectedServices = [], isEditing = false) {
        const elem = this.#formEl.querySelector('#servicios-multiselect');
        if (!elem) return;

        // Limpieza de memoria
        this.#destroyWidgets();

        this.#serviciosWidget = new ej.dropdowns.MultiSelect({
            dataSource: this.#recursos.servicios,
            fields: { value: 'id', text: 'text' },
            placeholder: 'Selecciona servicios',
            mode: 'Box',
            value: selectedServices,
            enabled: isEditing, // Solo habilitado si estamos editando/creando
            allowCustomValue: true
        });
        this.#serviciosWidget.appendTo(elem);
    }

    /** Destruye widgets para evitar fugas de memoria en SPA */
    #destroyWidgets() {
        if (this.#serviciosWidget) {
            this.#serviciosWidget.destroy();
            this.#serviciosWidget = null;
        }
        if (this.#cargoWidget) {
            this.#cargoWidget.destroy();
            this.#cargoWidget = null;
        }
    }

    /** Previsualización de imagen local (FileReader) */
    #handleImagePreview(event) {
        const file = event.target.files[0];
        if (!file) return;

        const preview = this.#formEl.querySelector('#image-preview');
        const placeholder = this.#formEl.querySelector('#placeholder-text');
        
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.src = e.target.result;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    // =================================================
    // === LÓGICA DE DATOS (EMPLEADOS) ===
    // =================================================

    async #loadEmployees(empresaId) {
        const container = this.#formEl.querySelector('#panel-empleados-container');
        if (!container) return;
        
        container.innerHTML = '<div style="text-align:center; padding:20px;">Cargando empleados...</div>';
        
        try {
            const data = await api.fetchEmpleados(empresaId);
            // Ordenar: Activos primero
            this.#empleados = data.empleados.sort((a, b) => b.estado - a.estado);
            this.#renderEmpleados(this.#empleados);
        } catch (error) {
            container.innerHTML = `<p style="color: red; text-align:center;">${error.message}</p>`;
        }
    }

    #renderEmpleados(lista) {
        const container = this.#formEl.querySelector('#panel-empleados-container');
        if (!container) return;
        
        container.innerHTML = '';
        if (lista.length === 0) {
            container.innerHTML = "<p style='text-align:center; color: var(--color-texto-secundario); padding: 20px;'>No se encontraron empleados.</p>";
            return;
        }
        
        const isCompanyActive = this.#currentCompany ? this.#currentCompany.estado : true;
        
        lista.forEach(emp => {
            const cardHTML = templateBuilder.createEmpleadoCard(emp, isCompanyActive);
            container.insertAdjacentHTML('beforeend', cardHTML);
        });
    }

    /** Filtra la lista local de empleados (Buscador + Tabs Estado) */
    #filterEmpleados() {
        const searchVal = this.#formEl.querySelector('#buscador-panel-empleados')?.value.toLowerCase() || '';
        const filterVal = this.#formEl.querySelector('#panel-empleados-section .btn-filter.active')?.dataset.filter || 'todos';

        const filtrados = this.#empleados.filter(emp => {
            const matchEstado = (filterVal === 'todos') ||
                              (filterVal === 'activos' && emp.estado) ||
                              (filterVal === 'inactivos' && !emp.estado);
            
            const matchSearch = !searchVal || 
                              (emp.nombre_completo || '').toLowerCase().includes(searchVal) ||
                              (emp.numero_documento || '').includes(searchVal);
            
            return matchEstado && matchSearch;
        });

        this.#renderEmpleados(filtrados);
    }

    // =================================================
    // === OPERACIONES DE GUARDADO (API + UI) ===
    // =================================================

    async #handleSaveCompany() {
        const formData = new FormData(this.#formEl);
        
        // Procesar los valores del widget MultiSelect manualmente
        if (this.#serviciosWidget) {
            formData.delete('servicios_input_temp'); // Limpiar campo temporal
            const ids = this.#serviciosWidget.value || [];
            // Enviar cada ID como un valor separado para la lista
            ids.forEach(id => formData.append('servicios', id));
        }
        
        // Limpiar ID si está vacío (para que Django lo trate como creación)
        if (!formData.get('id')) formData.delete('id');

        // Feedback Visual Global
        ui.showLoading('Guardando Empresa...');

        try {
            const result = await api.saveEmpresa(formData);
            
            ui.hideLoading();
            ui.showNotification(result.message, 'success');
            
            // Recargar panel con los datos frescos y notificar a la vista principal
            this.openForCompany(result.empresa);
            this.onCompanySaved();

        } catch (error) {
            ui.hideLoading();
            ui.showNotification(error.message, 'error');
        }
    }

    async #handleSaveEmployee() {
        const formData = new FormData(this.#formEl);
        formData.delete('cargo_input_temp'); // Limpiar temporal

        // Procesar Cargo desde el Widget
        if (this.#cargoWidget && this.#cargoWidget.value && this.#cargoWidget.value.length > 0) {
            formData.set('cargo', this.#cargoWidget.value[0]);
        } else {
            if (!formData.has('cargo')) formData.set('cargo', '');
        }

        if (!formData.get('id')) formData.delete('id');
        
        // Vincular empleado a la empresa actual
        formData.append('id_empresa', this.#currentCompany.id);

        ui.showLoading('Guardando Empleado...');

        try {
            const result = await api.saveEmployee(formData);
            
            ui.hideLoading();
            ui.showNotification(result.message, 'success');
            
            // Volver a la vista de la empresa tras guardar
            this.openForCompany(this.#currentCompany);

        } catch (error) {
            ui.hideLoading();
            ui.showNotification(error.message, 'error');
        }
    }

    async #handleUpdateEstadoEmpleado(empId, nuevoEstado, card) {
        const toggle = card.querySelector('.toggle-estado-empleado');
        
        try {
            const response = await api.updateEmpleadoEstado(empId, nuevoEstado);
            
            ui.showNotification(response.message, 'success');
            
            // Actualizar modelo local para que el filtro funcione correctamente
            const emp = this.#empleados.find(e => e.id == empId);
            if (emp) emp.estado = nuevoEstado;
            
            // Refrescar vista (ej. si estoy en tab 'Activos' y lo desactivo, debe desaparecer)
            this.#filterEmpleados();

        } catch (error) {
            ui.showNotification(error.message, 'error');
            toggle.checked = !nuevoEstado; // Revertir visualmente el switch si falló
        }
    }
}
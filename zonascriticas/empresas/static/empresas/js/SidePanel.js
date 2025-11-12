/**
 * SidePanel.js
 * Componente de clase que encapsula toda la lógica del panel lateral.
 * Es responsable de su propio estado, renderizado y eventos.
 */
import * as api from './apiService.js';
import * as ui from './uiComponents.js';
// Importamos las utilidades de notificación refactorizadas
import { mostrarNotificacion, mostrarCarga, ocultarCarga } from './utils.js';

export class SidePanel {
    // Campos privados para el estado y elementos del DOM
    #panelEl;
    #overlayEl;
    #titleEl;
    #formEl;
    #backBtnEl;

    #recursos; // Almacén para { cargos, servicios }
    #currentCompany = null;
    #empleados = []; // La lista "master" de empleados para la empresa actual
    #isEditingEmployee = false;

    #serviciosWidget = null;
    #cargoWidget = null;

    // Callbacks para comunicarse con el "director" (main.js)
    onCompanySaved = () => {}; // Se llamará después de guardar una empresa/empleado

    /**
     * @param {HTMLElement} panelEl - El elemento principal del panel (<div id="side-panel">)
     * @param {HTMLElement} overlayEl - El elemento del overlay (<div id="panel-overlay">)
     * @param {object} recursos - { cargos: [], servicios: [] }
     */
    constructor(panelEl, overlayEl, recursos = { cargos: [], servicios: [] }) {
        this.#panelEl = panelEl;
        this.#overlayEl = overlayEl;
        this.#recursos = recursos;

        // Encontrar elementos internos
        this.#titleEl = this.#panelEl.querySelector('#panel-title');
        this.#formEl = this.#panelEl.querySelector('#panel-form');
        this.#backBtnEl = this.#panelEl.querySelector('#panel-back-btn');

        // Inicializar los listeners base UNA SOLA VEZ
        this.#initListeners();
    }

    // --- API Pública (Métodos llamados desde main.js) ---

    /**
     * Abre el panel para ver/editar una empresa existente.
     * @param {object} companyData - Los datos de la empresa.
     */
    async openForCompany(companyData) {
        this.#currentCompany = companyData;
        this.#isEditingEmployee = false;
        this.#titleEl.textContent = `Detalles de ${companyData.nombre_empresa}`;

        // 1. Renderizar el HTML del formulario de empresa
        this.#formEl.innerHTML = ui.getPanelContentHTML(companyData);

        // 2. Inicializar widgets
        this.#initCompanyWidgets(companyData.servicios);

        // 3. Mostrar el panel
        this.show();

        // 4. Cargar empleados
        await this.#loadEmployees(companyData.id);
    }

    /**
     * Abre el panel para registrar una nueva empresa.
     */
    openForNewCompany() {
        this.#currentCompany = null;
        this.#isEditingEmployee = false;
        this.#titleEl.textContent = 'Registrar Nueva Empresa';

        // 1. Renderizar el HTML (modo "isNew")
        this.#formEl.innerHTML = ui.getPanelContentHTML(null);

        // 2. Inicializar widgets (en modo edición)
        this.#initCompanyWidgets([], true);

        // 3. Mostrar el panel
        this.show();
    }

    /** Muestra el panel y el overlay */
    show() {
        document.body.classList.add('panel-is-open');
    }

    /** Cierra y limpia el panel */
    close() {
        document.body.classList.remove('panel-is-open');
        this.#formEl.innerHTML = ''; // Limpia el contenido
        
        // Resetea el estado interno
        this.#currentCompany = null;
        this.#empleados = [];
        this.#isEditingEmployee = false;
        
        // Destruye widgets para prevenir fugas de memoria
        this.#destroyWidgets();
    }

    // --- Manejadores de Eventos Internos ---

    /** Configura los listeners base del panel */
    #initListeners() {
        // Clic en el overlay para cerrar
        this.#overlayEl.addEventListener('click', () => this.close());

        // Clic en el botón "atrás"
        this.#backBtnEl.addEventListener('click', () => this.#handleBack());

        // Manejador central para el formulario (submit)
        this.#formEl.addEventListener('submit', (e) => this.#handleSubmit(e));

        // Delegación de eventos para clics DENTRO del formulario
        this.#formEl.addEventListener('click', (e) => this.#handleClickDelegation(e));

        // Delegación de eventos para inputs DENTRO del formulario
        this.#formEl.addEventListener('input', (e) => this.#handleInputDelegation(e));
    }

    /** Maneja el clic en el botón "Atrás" */
    #handleBack() {
        if (this.#isEditingEmployee) {
            // Si estaba editando un empleado, vuelve al panel de la empresa
            this.openForCompany(this.#currentCompany);
        } else {
            // Si estaba en el panel de la empresa, cierra
            this.close();
        }
    }

    /** Maneja TODOS los clics dentro del formulario */
    #handleClickDelegation(e) {
        // 1. Manejar clics en el toggle de estado del empleado
        if (e.target.classList.contains('toggle-estado-empleado')) {
            const card = e.target.closest('.employee-card-compact');
            if (e.target.disabled || !card) return;
            
            const empleadoId = card.dataset.employeeId;
            const nuevoEstado = e.target.checked;
            this.#handleUpdateEstadoEmpleado(empleadoId, nuevoEstado, card);
            return;
        }

        // 2. Manejar clics en botones de filtro de empleados
        const filterBtn = e.target.closest('#panel-empleados-section .btn-filter');
        if (filterBtn) {
            this.#formEl.querySelectorAll('#panel-empleados-section .btn-filter')
                .forEach(btn => btn.classList.remove('active'));
            filterBtn.classList.add('active');
            this.#filterEmpleados();
            return;
        }
        
        // 3. Manejar clics en botones de acción (data-action)
        const actionTarget = e.target.closest('[data-action]');
        if (!actionTarget) return;

        const action = actionTarget.dataset.action;

        switch (action) {
            case 'edit-company':
                this.#formEl.querySelector('.info-card').classList.add('is-editing');
                if (this.#serviciosWidget) this.#serviciosWidget.enabled = true;
                break;
            case 'cancel-edit-company':
                if (this.#currentCompany) {
                    this.openForCompany(this.#currentCompany); // Recarga el panel
                } else {
                    this.close(); // Estaba creando, así que cierra
                }
                break;
            case 'register-employee':
                this.#initEmployeeForm(null); // Abre el form de empleado en modo "nuevo"
                break;
            case 'edit-employee':
                const card = e.target.closest('.employee-card-compact');
                const empleadoId = card.dataset.employeeId;
                const employeeData = this.#empleados.find(emp => emp.id == empleadoId);
                if (employeeData) {
                    this.#initEmployeeForm(employeeData);
                } else {
                    mostrarNotificacion('No se pudieron cargar los datos del empleado.');
                }
                break;
            case 'cancel-edit-employee':
                this.openForCompany(this.#currentCompany); // Vuelve al panel de empresa
                break;
            case 'trigger-image-upload': // Mapeado del getEmployeeFormHTML
                this.#formEl.querySelector('#imagen_empleado').click();
                break;
        }
    }

    /** Maneja TODOS los inputs dentro del formulario */
    #handleInputDelegation(e) {
        // 1. Buscador de empleados en el panel
        if (e.target.id === 'buscador-panel-empleados') {
            this.#filterEmpleados();
            return;
        }
        // 2. Preview de imagen de empleado
        if (e.target.id === 'imagen_empleado') {
            this.#handleImagePreview(e);
            return;
        }
    }

    /** Maneja el submit central del formulario */
    async #handleSubmit(e) {
        e.preventDefault();
        
        if (this.#isEditingEmployee) {
            await this.#handleSaveEmployee();
        } else {
            // Solo guarda si el submitter fue el botón de guardar
            if (e.submitter && e.submitter.dataset.action === 'save-company') {
                await this.#handleSaveCompany();
            }
        }
    }
    
    // --- Lógica de Formularios y Widgets ---

    /** Inicializa el formulario de Empleado (Crear/Editar) */
    #initEmployeeForm(employeeData) {
        this.#isEditingEmployee = true;
        this.#titleEl.textContent = employeeData ? `Editar ${employeeData.first_name || 'Empleado'}` : 'Registrar Nuevo Empleado';
        
        // 1. Renderizar HTML
        this.#formEl.innerHTML = ui.getEmployeeFormHTML(employeeData, this.#recursos.cargos);
        
        // 2. Destruir widget de servicios (si existía)
        if (this.#serviciosWidget) {
            this.#serviciosWidget.destroy();
            this.#serviciosWidget = null;
        }

        // 3. Inicializar widget de cargo
        const cargoMultiselectElem = this.#formEl.querySelector('#cargo-empleado-multiselect');
        const cargoHiddenInput = this.#formEl.querySelector('#cargo-empleado-hidden');
        
        // abusamos de la biblioteca ej2
        this.#cargoWidget = new ej.dropdowns.MultiSelect({
            dataSource: this.#recursos.cargos, 
            fields: { value: 'id', text: 'text' },
            placeholder: 'Selecciona un cargo',
            mode: 'Box',
            maximumSelectionLength: 1,
            value: employeeData ? [employeeData.cargo] : [],
            allowCustomValue: true,
            // cuando se seleccione cargo el valor se guarda en el input oculto
            change: (args) => {
                cargoHiddenInput.value = (args.value && args.value.length > 0) ? args.value[0] : '';
            }
        });
        this.#cargoWidget.appendTo(cargoMultiselectElem);
    }

    /** Inicializa el widget de servicios para el form de Empresa */
    #initCompanyWidgets(selectedServices = [], isEditing = false) {
        const multiselectElement = this.#formEl.querySelector('#servicios-multiselect');
        if (!multiselectElement) return;

        // Destruir widget de cargo (si existía)
        if (this.#cargoWidget) {
            this.#cargoWidget.destroy();
            this.#cargoWidget = null;
        }

        // Multiselect es de la biblioteca de ej2 que estamos usando
        this.#serviciosWidget = new ej.dropdowns.MultiSelect({
            dataSource: this.#recursos.servicios, // Cargamos nuestros servicios
            fields: { value: 'id', text: 'text' }, // Como los vamos a organizar
            placeholder: 'Selecciona servicios', // Si no se selecciona nada entonces dejamos este texto
            mode: 'Box', // Muestra cada seleccion como una caja
            value: selectedServices, // Los servicios seleccionados (VARIOS EN ESTE CASO)
            enabled: isEditing, // Habilitado solo si isEditing es true
            allowCustomValue: true // Nos permite añadir nuevos servicios
        });
        this.#serviciosWidget.appendTo(multiselectElement);
    }

    /** Destruye todos los widgets activos para limpiar memoria */
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

    /** Muestra la vista previa de la imagen seleccionada */
    #handleImagePreview(event) {
        const file = event.target.files[0];
        if (!file) return;

        const imagePreview = this.#formEl.querySelector('#image-preview');
        const placeholderText = this.#formEl.querySelector('#placeholder-text');
        
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
            placeholderText.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    // --- Lógica de Carga y Renderizado de Empleados ---

    /** Busca y renderiza la lista de empleados para la empresa actual */
    async #loadEmployees(empresaId) {
        const container = this.#formEl.querySelector('#panel-empleados-container');
        if (!container) return;
        container.innerHTML = "<p>Cargando empleados...</p>";
        
        try {
            const data = await api.fetchEmpleados(empresaId);
            this.#empleados = data.empleados.sort((a, b) => b.estado - a.estado);
            this.#renderEmpleados(this.#empleados); // Renderiza la lista completa
        } catch (error) {
            container.innerHTML = `<p style="color: red;">${error.message}</p>`;
        }
    }

    /**
     * Renderiza la lista de empleados en el panel.
     * @param {Array} lista - La lista de empleados a renderizar.
     */
    #renderEmpleados(lista) {
        const container = this.#formEl.querySelector('#panel-empleados-container');
        if (!container) return;
        
        container.innerHTML = '';
        if (lista.length === 0) {
            container.innerHTML = "<p>No hay empleados para el filtro actual.</p>";
            return;
        }
        
        const isCompanyActive = this.#currentCompany ? this.#currentCompany.estado : true;
        lista.forEach(emp => {
            const cardHTML = ui.createEmpleadoCard(emp, isCompanyActive);
            container.insertAdjacentHTML('beforeend', cardHTML);
        });
    }

    /** Filtra y re-renderiza la lista de empleados en el panel */
    #filterEmpleados() {
        const panelSearch = this.#formEl.querySelector('#buscador-panel-empleados');
        const botonActivo = this.#formEl.querySelector('#panel-empleados-section .btn-filter.active');
        
        const terminoBusqueda = panelSearch ? panelSearch.value.toLowerCase() : '';
        const filtroActivo = botonActivo ? botonActivo.dataset.filter : 'todos';

        const empleadosFiltrados = this.#empleados.filter(emp => {
            let pasaEstado = (filtroActivo === 'todos') ||
                             (filtroActivo === 'activos' && emp.estado === true) ||
                             (filtroActivo === 'inactivos' && emp.estado === false);

            let pasaBusqueda = false;
            if (terminoBusqueda === '') {
                pasaBusqueda = true;
            } else {
                pasaBusqueda = (emp.first_name || '').toLowerCase().includes(terminoBusqueda) ||
                               (emp.email || '').toLowerCase().includes(terminoBusqueda) ||
                               (emp.numero_documento || '').toLowerCase().includes(terminoBusqueda);
            }
            return pasaEstado && pasaBusqueda;
        });

        this.#renderEmpleados(empleadosFiltrados);
    }

    // --- Lógica de Guardado y Actualización (API) ---

    async #handleSaveCompany() {
        const formData = new FormData(this.#formEl);
      
        if (this.#serviciosWidget) {
            formData.delete('servicios_input_temp');
            const servicioIDs = this.#serviciosWidget.value || [];
            servicioIDs.forEach(id => formData.append('servicios', id));
        }
        if (!formData.get('id')) {
            formData.delete('id');
        }
        
        // ¡Llamada limpia a utils.js!
        mostrarCarga('Guardando Empresa...'); 
        
        try {
            const result = await api.saveEmpresa(formData);
            
            // ¡Llamada limpia a utils.js!
            ocultarCarga();
            mostrarNotificacion(result.message, 'success');
            
            this.openForCompany(result.empresa); 
            this.onCompanySaved();
            
        } catch (error) {
            // ¡Llamada limpia a utils.js!
            ocultarCarga();
            mostrarNotificacion(error.message, 'error', 'Error al guardar empresa');
        }
    }

    async #handleSaveEmployee() {
        const formData = new FormData(this.#formEl);
        
        // Limpieza de FormData (Solución al error '...got []')
        formData.delete('cargo_input_temp');

        if (this.#cargoWidget && this.#cargoWidget.value && this.#cargoWidget.value.length > 0) {
            // Obtenemos el valor (ej: "1" o "Supervisor")
            const cargoValue = this.#cargoWidget.value[0];
            // Lo asignamos a la clave 'cargo' que el backend espera
            formData.set('cargo', cargoValue);
         } else {
            // Asegurarse de que 'cargo' exista, aunque esté vacío
            if (!formData.has('cargo')) {
                formData.set('cargo', '');
            }
        }

        if (!formData.get('id')) {
            formData.delete('id');
        }
        formData.append('id_empresa', this.#currentCompany.id);

        // ¡Llamada limpia a utils.js!
        mostrarCarga('Guardando Empleado...');

        try {
            const result = await api.saveEmployee(formData);

            // ¡Llamada limpia a utils.js!
            ocultarCarga();
            mostrarNotificacion(result.message, 'success');
            
            this.openForCompany(this.#currentCompany);

        } catch (error) {
            // ¡Llamada limpia a utils.js!
            ocultarCarga();
            mostrarNotificacion(error.message, 'error', 'Error al guardar empleado');
        }
    }

    async #handleUpdateEstadoEmpleado(empleadoId, nuevoEstado, cardElement) {
        const toggle = cardElement.querySelector('.toggle-estado-empleado');
        
        try {
            const response = await api.updateEmpleadoEstado(empleadoId, nuevoEstado);
            
            // ¡Llamada limpia a utils.js!
            mostrarNotificacion(response.message, 'success');
            
            const employeeData = this.#empleados.find(emp => emp.id == empleadoId);
            if (employeeData) employeeData.estado = nuevoEstado;
            
            this.#filterEmpleados();

        } catch (error) {
            // ¡Llamada limpia a utils.js!
            mostrarNotificacion(error.message, 'error');
            toggle.checked = !nuevoEstado;
        }
    }
}
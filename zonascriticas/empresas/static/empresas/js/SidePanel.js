/**
 * SidePanel.js
 * ---------------------------
 * Componente Controlador del Panel Lateral (Slide-over).
 * REFACTORIZADO: Integra core/image.js para compresión de fotos de empleados.
 */

import * as api from './apiService.js';
import * as templateBuilder from './uiComponents.js'; 
import { ui } from '/static/home/js/core/ui.js';
// 1. IMPORTAR EL CORE DE IMÁGENES
import { imageUtils } from '/static/home/js/core/image.js'; 

export class SidePanel {
    // --- Elementos del DOM (Referencias cacheadas) ---
    #panelEl;
    #overlayEl;
    #titleEl;
    #formEl;
    #backBtnEl;

    // --- Estado Interno ---
    #recursos;          // Objeto con listas de { cargos, servicios }
    #currentCompany = null; 
    #empleados = [];    
    #isEditingEmployee = false; 
    
    // Variable temporal para la imagen comprimida (Buffer)
    #tempImageBlob = null; 

    // --- Widgets de Terceros (Syncfusion) ---
    #serviciosWidget = null;
    #cargoWidget = null;

    // --- Callbacks ---
    onCompanySaved = () => {}; 

    constructor(panelEl, overlayEl, recursos = { cargos: [], servicios: [] }) {
        this.#panelEl = panelEl;
        this.#overlayEl = overlayEl;
        this.#recursos = recursos;

        this.#titleEl = this.#panelEl.querySelector('#panel-title');
        this.#formEl = this.#panelEl.querySelector('#panel-form');
        this.#backBtnEl = this.#panelEl.querySelector('#panel-back-btn');

        this.#initListeners();
    }

    // =================================================
    // === API PÚBLICA ===
    // =================================================

    async openForCompany(companyData) {
        this.#currentCompany = companyData;
        this.#isEditingEmployee = false;
        this.#titleEl.textContent = `Detalles de ${companyData.nombre_empresa}`;

        this.#formEl.innerHTML = templateBuilder.getPanelContentHTML(companyData);
        this.#initCompanyWidgets(companyData.servicios);
        this.show();

        await this.#loadEmployees(companyData.id);
    }

    openForNewCompany() {
        this.#currentCompany = null;
        this.#isEditingEmployee = false;
        this.#titleEl.textContent = 'Registrar Nueva Empresa';

        this.#formEl.innerHTML = templateBuilder.getPanelContentHTML(null);
        this.#initCompanyWidgets([], true);
        this.show();
    }

    show() {
        document.body.classList.add('panel-is-open');
    }

    close() {
        document.body.classList.remove('panel-is-open');
        this.#formEl.innerHTML = ''; 
        
        this.#currentCompany = null;
        this.#empleados = [];
        this.#isEditingEmployee = false;
        
        // LIMPIEZA: Borrar la imagen temporal de la memoria
        this.#tempImageBlob = null; 
        
        this.#destroyWidgets();
    }

    // =================================================
    // === MANEJO DE EVENTOS INTERNOS ===
    // =================================================

    #initListeners() {
        this.#overlayEl.addEventListener('click', () => this.close());
        this.#backBtnEl.addEventListener('click', () => this.#handleBack());
        
        this.#formEl.addEventListener('submit', (e) => this.#handleSubmit(e));
        this.#formEl.addEventListener('click', (e) => this.#handleClickDelegation(e));
        this.#formEl.addEventListener('input', (e) => this.#handleInputDelegation(e));
    }

    #handleBack() {
        if (this.#isEditingEmployee) {
            this.openForCompany(this.#currentCompany);
        } else {
            this.close();
        }
    }

    #handleClickDelegation(e) {
        // A. Toggle Estado Empleado
        if (e.target.classList.contains('toggle-estado-empleado')) {
            const card = e.target.closest('.employee-card-compact');
            if (!card || e.target.disabled) return;
            
            const empleadoId = card.dataset.employeeId;
            const nuevoEstado = e.target.checked;
            this.#handleUpdateEstadoEmpleado(empleadoId, nuevoEstado, card);
            return;
        }

        // B. Filtros
        const filterBtn = e.target.closest('#panel-empleados-section .btn-filter');
        if (filterBtn) {
            this.#formEl.querySelectorAll('#panel-empleados-section .btn-filter')
                .forEach(btn => btn.classList.remove('active'));
            filterBtn.classList.add('active');
            this.#filterEmpleados();
            return;
        }
        
        // C. Acciones
        const actionTarget = e.target.closest('[data-action]');
        if (!actionTarget) return;

        const action = actionTarget.dataset.action;

        switch (action) {
            case 'edit-company':
                this.#formEl.querySelector('.info-card').classList.add('is-editing');
                if (this.#serviciosWidget) this.#serviciosWidget.enabled = true;
                break;

            case 'cancel-edit-company':
                this.#currentCompany ? this.openForCompany(this.#currentCompany) : this.close();
                break;

            case 'register-employee':
                this.#initEmployeeForm(null);
                break;

            case 'edit-employee':
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
                this.openForCompany(this.#currentCompany);
                break;

            case 'trigger-image-upload':
                this.#formEl.querySelector('#imagen_empleado').click();
                break;
        }
    }

    #handleInputDelegation(e) {
        // Buscador
        if (e.target.id === 'buscador-panel-empleados') {
            this.#filterEmpleados();
        }
        // REFACTORIZADO: Input de Imagen (Async)
        if (e.target.id === 'imagen_empleado') {
            this.#handleImageInputAsync(e);
        }
    }

    async #handleSubmit(e) {
        e.preventDefault();
        
        if (this.#isEditingEmployee) {
            await this.#handleSaveEmployee();
        } else {
            if (e.submitter && e.submitter.dataset.action === 'save-company') {
                await this.#handleSaveCompany();
            }
        }
    }

    // =================================================
    // === GESTIÓN DE WIDGETS Y FORMULARIOS ===
    // =================================================

    #initEmployeeForm(employeeData) {
        this.#isEditingEmployee = true;
        // Limpiamos imagen temporal previa si existía
        this.#tempImageBlob = null;
        
        this.#titleEl.textContent = employeeData ? 'Editar Empleado' : 'Nuevo Empleado';
        
        this.#formEl.innerHTML = templateBuilder.getEmployeeFormHTML(employeeData, this.#recursos.cargos);
        
        if (this.#serviciosWidget) {
            this.#serviciosWidget.destroy();
            this.#serviciosWidget = null;
        }

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
            change: (args) => {
                cargoInput.value = (args.value && args.value.length > 0) ? args.value[0] : '';
            }
        });
        this.#cargoWidget.appendTo(cargoElem);
    }

    #initCompanyWidgets(selectedServices = [], isEditing = false) {
        const elem = this.#formEl.querySelector('#servicios-multiselect');
        if (!elem) return;

        this.#destroyWidgets();

        this.#serviciosWidget = new ej.dropdowns.MultiSelect({
            dataSource: this.#recursos.servicios,
            fields: { value: 'id', text: 'text' },
            placeholder: 'Selecciona servicios',
            mode: 'Box',
            value: selectedServices,
            enabled: isEditing,
            allowCustomValue: true
        });
        this.#serviciosWidget.appendTo(elem);
    }

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

    /**
     * REFACTORIZADO: Procesa la imagen seleccionada, la comprime y muestra preview.
     */
    async #handleImageInputAsync(event) {
        const file = event.target.files[0];
        if (!file) return;

        const preview = this.#formEl.querySelector('#image-preview');
        const placeholder = this.#formEl.querySelector('#placeholder-text');

        try {
            // Feedback visual
            preview.style.display = 'block';
            preview.style.opacity = 0.5;
            placeholder.style.display = 'none';

            // 1. Comprimir (800px es suficiente para avatars)
            this.#tempImageBlob = await imageUtils.compress(file, 800, 0.8);

            // 2. Generar Base64 para preview inmediato
            const base64Preview = await imageUtils.toBase64(this.#tempImageBlob);
            
            preview.src = base64Preview;
            preview.style.opacity = 1;

        } catch (error) {
            ui.showNotification("Error procesando imagen: " + error.message, 'error');
            this.#tempImageBlob = null;
            // Revertir UI
            preview.style.display = 'none';
            placeholder.style.display = 'block';
        }
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
        
        if (this.#serviciosWidget) {
            formData.delete('servicios_input_temp');
            const ids = this.#serviciosWidget.value || [];
            ids.forEach(id => formData.append('servicios', id));
        }
        
        if (!formData.get('id')) formData.delete('id');

        ui.showLoading('Guardando Empresa...');

        try {
            const result = await api.saveEmpresa(formData);
            ui.hideLoading();
            ui.showNotification(result.message, 'success');
            
            this.openForCompany(result.empresa);
            this.onCompanySaved();

        } catch (error) {
            ui.hideLoading();
            ui.showNotification(error.message, 'error');
        }
    }

    async #handleSaveEmployee() {
        const formData = new FormData(this.#formEl);
        formData.delete('cargo_input_temp');

        if (this.#cargoWidget && this.#cargoWidget.value && this.#cargoWidget.value.length > 0) {
            formData.set('cargo', this.#cargoWidget.value[0]);
        } else {
            if (!formData.has('cargo')) formData.set('cargo', '');
        }

        if (!formData.get('id')) formData.delete('id');
        formData.append('id_empresa', this.#currentCompany.id);

        // --- INYECCIÓN DE IMAGEN COMPRIMIDA ---
        // Si hay un blob en memoria, lo usamos en lugar de lo que diga el input file vacío
        if (this.#tempImageBlob) {
            formData.set('imagen_empleado', this.#tempImageBlob, 'empleado_optimizado.jpg');
        }

        ui.showLoading('Guardando Empleado...');

        try {
            const result = await api.saveEmployee(formData);
            
            ui.hideLoading();
            ui.showNotification(result.message, 'success');
            
            // Limpieza tras éxito
            this.#tempImageBlob = null;

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
            
            const emp = this.#empleados.find(e => e.id == empId);
            if (emp) emp.estado = nuevoEstado;
            
            this.#filterEmpleados();

        } catch (error) {
            ui.showNotification(error.message, 'error');
            toggle.checked = !nuevoEstado; 
        }
    }
}
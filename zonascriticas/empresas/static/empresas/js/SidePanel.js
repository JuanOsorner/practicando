/**
 * SidePanel.js (Empresas)
 * ---------------------------
 * Controlador del Panel de Empresas.
 * REFACTORIZADO: Ahora usa la arquitectura GlobalPanel.
 */

import * as api from './apiService.js';
import * as templateBuilder from './uiComponents.js'; 
import { ui } from '/static/home/js/core/ui.js';
import { imageUtils } from '/static/home/js/core/image.js'; 
// IMPORTAMOS EL GESTOR GLOBAL
import { GlobalPanel } from '/static/home/js/core/panel.js';

export class SidePanel {
    
    // Referencias dinámicas (se obtienen al abrir el panel)
    #formEl = null;
    
    // Estado
    #recursos;          
    #currentCompany = null; 
    #empleados = [];    
    #isEditingEmployee = false; 
    #tempImageBlob = null; 

    // Widgets
    #serviciosWidget = null;
    #cargoWidget = null;

    // Callbacks
    onCompanySaved = () => {}; 

    /**
     * Constructor simplificado. Ya no busca elementos del DOM porque
     * el panel no existe hasta que lo abrimos.
     */
    constructor(ignoredPanelEl, ignoredOverlayEl, recursos = { cargos: [], servicios: [] }) {
        // Nota: Mantenemos los 3 argumentos para no romper main.js, 
        // pero ignoramos los dos primeros (panelEl, overlayEl) ya que usamos GlobalPanel.
        this.#recursos = recursos;
    }

    // =================================================
    // === API PÚBLICA ===
    // =================================================

    async openForCompany(companyData) {
        this.#currentCompany = companyData;
        this.#isEditingEmployee = false;

        // 1. Generar HTML
        const htmlContent = templateBuilder.getPanelContentHTML(companyData);

        // 2. Abrir Panel Global
        this.#renderPanel(`Detalles de ${companyData.nombre_empresa}`, htmlContent);

        // 3. Inicializar lógica específica
        this.#initCompanyWidgets(companyData.servicios);
        await this.#loadEmployees(companyData.id);
    }

    openForNewCompany() {
        this.#currentCompany = null;
        this.#isEditingEmployee = false;

        const htmlContent = templateBuilder.getPanelContentHTML(null);
        
        this.#renderPanel('Registrar Nueva Empresa', htmlContent);
        this.#initCompanyWidgets([], true);
    }

    /**
     * Método helper para orquestar la apertura y setup
     */
    #renderPanel(title, html) {
        // A. Abrir el panel global
        GlobalPanel.open({
            title: title,
            contentHTML: `<div class="panel-body-wrapper"><form id="panel-form" novalidate>${html}</form></div>`,
            onClose: () => this.#cleanup() // Callback de limpieza al cerrar
        });

        // B. Capturar referencias al DOM recién creado
        // GlobalPanel inyecta el contenido, ahora lo buscamos dentro.
        const container = GlobalPanel.getBodyElement();
        this.#formEl = container.querySelector('#panel-form');

        // C. Reconectar eventos (Porque el HTML es nuevo)
        this.#initListeners();
    }

    close() {
        GlobalPanel.close();
        // La limpieza (cleanup) se llamará automáticamente vía el callback onClose
    }

    #cleanup() {
        this.#currentCompany = null;
        this.#empleados = [];
        this.#isEditingEmployee = false;
        this.#tempImageBlob = null; 
        this.#formEl = null;
        this.#destroyWidgets();
    }

    // =================================================
    // === MANEJO DE EVENTOS ===
    // =================================================

    #initListeners() {
        if (!this.#formEl) return;

        // Delegación de eventos dentro del formulario
        this.#formEl.addEventListener('submit', (e) => this.#handleSubmit(e));
        this.#formEl.addEventListener('click', (e) => this.#handleClickDelegation(e));
        this.#formEl.addEventListener('input', (e) => this.#handleInputDelegation(e));
    }

    /**
     * Maneja el botón "Atrás" o "Cancelar" dentro del flujo
     * (No el botón X del header, ese lo maneja GlobalPanel)
     */
    #handleBack() {
        if (this.#isEditingEmployee) {
            this.openForCompany(this.#currentCompany);
        } else {
            this.close();
        }
    }

    #handleClickDelegation(e) {
        // ... (Esta lógica es idéntica a la anterior, solo copiamos) ...
        
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
                if (empData) this.#initEmployeeForm(empData);
                else ui.showNotification('Error al cargar datos del empleado', 'error');
                break;

            case 'cancel-edit-employee':
                // IMPORTANTE: Aquí llamamos a openForCompany, lo que regenerará el HTML
                this.openForCompany(this.#currentCompany);
                break;

            case 'trigger-image-upload':
                this.#formEl.querySelector('#imagen_empleado').click();
                break;
        }
    }

    // ... (handleInputDelegation y handleSubmit se mantienen IGUAL) ...
    #handleInputDelegation(e) {
        if (e.target.id === 'buscador-panel-empleados') this.#filterEmpleados();
        if (e.target.id === 'imagen_empleado') this.#handleImageInputAsync(e);
    }

    async #handleSubmit(e) {
        e.preventDefault();
        if (this.#isEditingEmployee) await this.#handleSaveEmployee();
        else if (e.submitter && e.submitter.dataset.action === 'save-company') await this.#handleSaveCompany();
    }

    // =================================================
    // === GESTIÓN DE WIDGETS Y FORMULARIOS ===
    // =================================================

    #initEmployeeForm(employeeData) {
        this.#isEditingEmployee = true;
        this.#tempImageBlob = null;
        
        // Actualizamos el título GLOBAL
        GlobalPanel.setTitle(employeeData ? 'Editar Empleado' : 'Nuevo Empleado');
        
        this.#formEl.innerHTML = templateBuilder.getEmployeeFormHTML(employeeData, this.#recursos.cargos);
        
        if (this.#serviciosWidget) { this.#serviciosWidget.destroy(); this.#serviciosWidget = null; }

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
        if (this.#serviciosWidget) { this.#serviciosWidget.destroy(); this.#serviciosWidget = null; }
        if (this.#cargoWidget) { this.#cargoWidget.destroy(); this.#cargoWidget = null; }
    }

    // ... (handleImageInputAsync, loadEmployees, renderEmployees, filterEmployees, handleSave... SIGUEN IGUAL) ...
    // ... (Solo copia el contenido de tu versión anterior para estos métodos, no han cambiado la lógica interna) ...
    
    async #handleImageInputAsync(event) {
        const file = event.target.files[0];
        if (!file) return;
        const preview = this.#formEl.querySelector('#image-preview');
        const placeholder = this.#formEl.querySelector('#placeholder-text');
        try {
            preview.style.display = 'block'; preview.style.opacity = 0.5; placeholder.style.display = 'none';
            this.#tempImageBlob = await imageUtils.compress(file, 800, 0.8);
            const base64Preview = await imageUtils.toBase64(this.#tempImageBlob);
            preview.src = base64Preview; preview.style.opacity = 1;
        } catch (error) {
            ui.showNotification("Error: " + error.message, 'error');
            this.#tempImageBlob = null; preview.style.display = 'none'; placeholder.style.display = 'block';
        }
    }

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
            container.innerHTML = "<p style='text-align:center; color: #6c757d; padding: 20px;'>No se encontraron empleados.</p>";
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
            const matchEstado = (filterVal === 'todos') || (filterVal === 'activos' && emp.estado) || (filterVal === 'inactivos' && !emp.estado);
            const matchSearch = !searchVal || (emp.nombre_completo || '').toLowerCase().includes(searchVal) || (emp.numero_documento || '').includes(searchVal);
            return matchEstado && matchSearch;
        });
        this.#renderEmpleados(filtrados);
    }

    async #handleSaveCompany() {
        const formData = new FormData(this.#formEl);
        if (this.#serviciosWidget) {
            formData.delete('servicios_input_temp');
            (this.#serviciosWidget.value || []).forEach(id => formData.append('servicios', id));
        }
        if (!formData.get('id')) formData.delete('id');
        ui.showLoading('Guardando Empresa...');
        try {
            const result = await api.saveEmpresa(formData);
            ui.hideLoading(); ui.showNotification(result.message, 'success');
            this.openForCompany(result.empresa);
            this.onCompanySaved();
        } catch (error) {
            ui.hideLoading(); ui.showNotification(error.message, 'error');
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
        if (this.#tempImageBlob) {
            formData.set('imagen_empleado', this.#tempImageBlob, 'empleado_optimizado.jpg');
        }
        ui.showLoading('Guardando Empleado...');
        try {
            const result = await api.saveEmployee(formData);
            ui.hideLoading(); ui.showNotification(result.message, 'success');
            this.#tempImageBlob = null;
            this.openForCompany(this.#currentCompany);
        } catch (error) {
            ui.hideLoading(); ui.showNotification(error.message, 'error');
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
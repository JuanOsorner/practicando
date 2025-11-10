/**
 * main.js
 * Punto de entrada. Importa módulos y añade event listeners.
 */
import * as api from './apiService.js';
import * as ui from './uiComponents.js';

document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTOS DEL DOM ---
    const empresasContainer = document.getElementById('empresas-container');
    const buscadorInput = document.getElementById('buscador-empresas');
    const filterButtons = document.querySelectorAll('#vista-lista .filter-group .btn-filter');
    const btnRegistrarEmpresa = document.getElementById('btn-registrar-empresa');
    
    // Elementos del Panel Lateral
    const panel = document.getElementById('side-panel');
    const panelOverlay = document.getElementById('panel-overlay');
    const panelTitle = document.getElementById('panel-title');
    const panelForm = document.getElementById('panel-form');
    const panelBackBtn = document.getElementById('panel-back-btn');

    // --- ESTADO LOCAL ---
    let todasLasEmpresas = [];
    let empleadosDeEmpresaActual = []; // Lista "master" de empleados
    let serviciosDisponibles = [];
    let cargosDisponibles = [];
    let currentCompanyData = null; // Empresa seleccionada
    let serviciosMultiSelectInstance = null; // Instancia del widget
    let cargoEmpleadoMultiSelectInstance = null; // Instancia para el form de empleado
    let isEditingEmployee = false; // Flag para saber qué formulario estamos enviando

    // --- FUNCIONES DE RENDERIZADO ---
    
    function renderizarEmpresas(lista) {
        empresasContainer.innerHTML = '';
        if (lista.length === 0) {
            empresasContainer.innerHTML = "<p>No se encontraron empresas.</p>";
            return;
        }
        lista.forEach(empresa => {
            const cardHTML = ui.createEmpresaCard(empresa);
            empresasContainer.insertAdjacentHTML('beforeend', cardHTML);
        });
    }
    
    // Módulo 7: Acepta el estado de la empresa para deshabilitar interruptores
    function renderizarEmpleadosEnPanel(lista, isCompanyActive) {
        const container = document.getElementById('panel-empleados-container');
        if (!container) return;
        
        container.innerHTML = '';
        if (lista.length === 0) {
            container.innerHTML = "<p>No hay empleados para el filtro actual.</p>";
            return;
        }
        lista.forEach(emp => {
            // Pasa el estado de la empresa al componente UI
            const cardHTML = ui.createEmpleadoCard(emp, isCompanyActive);
            container.insertAdjacentHTML('beforeend', cardHTML);
        });
    }

    // --- LÓGICA DEL PANEL ---

    function openPanelForCompany(data, startInEditMode = false) {
        currentCompanyData = data; // Guardamos la empresa actual
        isEditingEmployee = false; // Estamos en el panel de Empresa
        panelTitle.textContent = data ? `Detalles de ${data.nombre_empresa}` : 'Registrar Nueva Empresa';
        
        panelForm.innerHTML = ui.getPanelContentHTML(data);
        
        const multiselectElement = panelForm.querySelector('#servicios-multiselect');
        if (multiselectElement) {
            
            const valoresServicios = (data && data.servicios) ? data.servicios : [];
            
            serviciosMultiSelectInstance = new ej.dropdowns.MultiSelect({
                dataSource: serviciosDisponibles,
                fields: { value: 'id', text: 'text' },
                placeholder: 'Selecciona servicios',
                mode: 'Box',
                value: valoresServicios,
            });
            serviciosMultiSelectInstance.appendTo(multiselectElement);
            
            if (!startInEditMode && data) {
                serviciosMultiSelectInstance.enabled = false;
            }
        }

        // --- INICIO MÓDULO 7 (Filtros y Buscador del Panel) ---
        const panelSearch = panelForm.querySelector('#buscador-panel-empleados');
        const panelFilters = panelForm.querySelectorAll('#panel-empleados-section .filter-group .btn-filter');

        if (panelSearch) {
            panelSearch.addEventListener('input', () => {
                filtrarEmpleadosEnPanel();
            });
        }
        if (panelFilters.length > 0) {
            panelFilters.forEach(button => {
                button.addEventListener('click', () => {
                    panelFilters.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    filtrarEmpleadosEnPanel();
                });
            });
        }
        // --- FIN MÓDULO 7 ---

        // Si la empresa existe y no estamos en 'startInEditMode', cargamos empleados
        if (data && !startInEditMode) {
            fetchAndRenderEmployeesInPanel(data.id);
        }
        
        if (startInEditMode) {
             panelForm.querySelector('.info-card').classList.add('is-editing');
             if(serviciosMultiSelectInstance) serviciosMultiSelectInstance.enabled = true;
        }

        document.body.classList.add('panel-is-open');
    }

    function closePanel() {
        document.body.classList.remove('panel-is-open');
        panelForm.innerHTML = ''; // Limpia el formulario
        currentCompanyData = null;
        isEditingEmployee = false;
        
        if (serviciosMultiSelectInstance) {
            serviciosMultiSelectInstance.destroy();
            serviciosMultiSelectInstance = null;
        }
        if (cargoEmpleadoMultiSelectInstance) {
            cargoEmpleadoMultiSelectInstance.destroy();
            cargoEmpleadoMultiSelectInstance = null;
        }
    }

    function openPanelForEmployee(data) {
        isEditingEmployee = true; 
        
        // Módulo 6: Poblar 'data' para Edición
        const employeeData = data ? empleadosDeEmpresaActual.find(emp => emp.id == data.id) : null;

        panelTitle.textContent = employeeData ? `Editar ${employeeData.first_name || 'Empleado'}` : 'Registrar Nuevo Empleado';

        panelForm.innerHTML = ui.getEmployeeFormHTML(employeeData, cargosDisponibles);

        const cargoMultiselectElem = panelForm.querySelector('#cargo-empleado-multiselect');
        const cargoHiddenInput = panelForm.querySelector('#cargo-empleado-hidden');
        
        cargoEmpleadoMultiSelectInstance = new ej.dropdowns.MultiSelect({
            dataSource: cargosDisponibles,
            fields: { value: 'id', text: 'text' },
            placeholder: 'Selecciona un cargo',
            mode: 'Box',
            maximumSelectionLength: 1, 
            value: employeeData ? [employeeData.cargo] : [], // Módulo 6
            change: (args) => {
                if(args.value && args.value.length > 0) {
                    cargoHiddenInput.value = args.value[0];
                } else {
                    cargoHiddenInput.value = '';
                }
            }
        });
        cargoEmpleadoMultiSelectInstance.appendTo(cargoMultiselectElem);

        panelForm.querySelector('#trigger-image-upload').addEventListener('click', () => {
            panelForm.querySelector('#imagen_empleado').click();
        });
        panelForm.querySelector('#imagen_empleado').addEventListener('change', handleImagePreview);
    }

    async function handleImagePreview(event) {
        const file = event.target.files[0];
        if (!file) return;

        const imagePreview = panelForm.querySelector('#image-preview');
        const placeholderText = panelForm.querySelector('#placeholder-text');
        
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
            placeholderText.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }


    // --- FUNCIONES DE LÓGICA (FETCH) ---

    async function cargarEmpresas() {
        const filtroActivo = document.querySelector('#vista-lista .filter-group .btn-filter.active').dataset.filter;
        const terminoBusqueda = buscadorInput.value.trim();
        
        try {
            const data = await api.fetchEmpresas(filtroActivo, terminoBusqueda);
            todasLasEmpresas = data.empresas;
            todasLasEmpresas.sort((a, b) => b.estado - a.estado);
            renderizarEmpresas(todasLasEmpresas);
        } catch (error) {
            mostrarNotificacion(error.message);
        }
    }
    
    async function cargarRecursos() {
        try {
            const data = await api.fetchRecursos();
            serviciosDisponibles = data.servicios;
            cargosDisponibles = data.cargos;
        } catch (error) {
            mostrarNotificacion(error.message);
        }
    }

    async function fetchAndRenderEmployeesInPanel(empresaId) {
        const container = document.getElementById('panel-empleados-container');
        if (!container) return;
        container.innerHTML = "<p>Cargando empleados...</p>";
        
        try {
            const data = await api.fetchEmpleados(empresaId);
            empleadosDeEmpresaActual = data.empleados; // Guardamos en la lista master
            empleadosDeEmpresaActual.sort((a, b) => b.estado - a.estado);
            
            // Módulo 7: Renderiza la lista completa (los filtros se aplicarán después)
            // Pasamos el estado de la empresa para deshabilitar toggles
            renderizarEmpleadosEnPanel(empleadosDeEmpresaActual, currentCompanyData.estado);

        } catch (error) {
            container.innerHTML = `<p style="color: red;">${error.message}</p>`;
        }
    }

    // --- INICIO MÓDULO 7 (Nueva Función de Filtrado) ---
    function filtrarEmpleadosEnPanel() {
        if (!panelForm || !currentCompanyData) return; 

        // 1. Obtener valores de los filtros
        const panelSearch = panelForm.querySelector('#buscador-panel-empleados');
        const botonActivo = panelForm.querySelector('#panel-empleados-section .filter-group .btn-filter.active');
        
        const terminoBusqueda = panelSearch ? panelSearch.value.toLowerCase() : '';
        const filtroActivo = botonActivo ? botonActivo.dataset.filter : 'todos';

        // 2. Aplicar filtros a la lista 'master'
        const empleadosFiltrados = empleadosDeEmpresaActual.filter(emp => {
            
            // Filtro de Estado
            let pasaEstado = false;
            if (filtroActivo === 'todos') {
                pasaEstado = true;
            } else if (filtroActivo === 'activos') {
                pasaEstado = emp.estado === true;
            } else if (filtroActivo === 'inactivos') {
                pasaEstado = emp.estado === false;
            }

            // Filtro de Búsqueda
            let pasaBusqueda = false;
            if (terminoBusqueda === '') {
                pasaBusqueda = true;
            } else {
                const nombre = (emp.first_name || '').toLowerCase();
                const email = (emp.email || '').toLowerCase();
                const documento = (emp.numero_documento || '').toLowerCase();
                pasaBusqueda = nombre.includes(terminoBusqueda) ||
                               email.includes(terminoBusqueda) ||
                               documento.includes(terminoBusqueda);
            }

            return pasaEstado && pasaBusqueda;
        });

        // 3. Re-renderizar la lista con los empleados filtrados
        renderizarEmpleadosEnPanel(empleadosFiltrados, currentCompanyData.estado);
    }
    // --- FIN MÓDULO 7 ---


    // --- MANEJADORES de EVENTOS ---
    
    function setupEventListeners() {
        // Buscador principal
        let searchTimeout;
        buscadorInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(cargarEmpresas, 300); // Debounce
        });

        // Filtros principales
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                cargarEmpresas();
            });
        });
        
        // Clics en la cuadrícula de empresas
        empresasContainer.addEventListener('click', e => {
            const card = e.target.closest('.empleado-card');
            if (!card) return;
            
            const empresaId = card.dataset.id;
            
            // Clic en el toggle de estado
            if (e.target.classList.contains('toggle-estado')) {
                // --- INICIO MÓDULO 3 (Alerta Cascada) ---
                const toggle = e.target;
                const nuevoEstado = toggle.checked;

                e.preventDefault(); 
                
                if (nuevoEstado === false) {
                    Swal.fire({
                        title: '¿Desactivar Empresa?',
                        text: "Esta acción desactivará a TODOS los empleados de esta empresa. Deberá reactivarlos manualmente si vuelve a activar la empresa.",
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#d33',
                        cancelButtonColor: '#3085d6',
                        confirmButtonText: 'Sí, desactivar',
                        cancelButtonText: 'Cancelar'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            handleUpdateEstadoEmpresa(empresaId, false);
                        } else {
                            toggle.checked = true;
                        }
                    });
                } else {
                    handleUpdateEstadoEmpresa(empresaId, true);
                }
                // --- FIN MÓDULO 3 ---
                return;
            }
            
            // Clic en la tarjeta para abrir el panel
            if (e.target.closest('[data-action="open-panel"]')) {
                const empresaData = todasLasEmpresas.find(emp => emp.id == empresaId);
                openPanelForCompany(empresaData, false); // Abre en modo VISTA
            }
        });

        // Botón "Registrar Empresa" (principal)
        btnRegistrarEmpresa.addEventListener('click', () => {
            openPanelForCompany(null, true); // Abre en modo CREAR
        });

        // Botones del Panel (Cerrar / Overlay)
        panelBackBtn.addEventListener('click', () => {
            if (isEditingEmployee) {
                openPanelForCompany(currentCompanyData);
            } else {
                closePanel();
            }
        });
        panelOverlay.addEventListener('click', closePanel);
        
        // Manejador de clics DENTRO del panel
        panelForm.addEventListener('click', e => {

            // --- INICIO MÓDULO 4 (Interruptor Empleado) ---
            // Nota: El Módulo 7 deshabilita este clic si la empresa está inactiva.
            if (e.target.classList.contains('toggle-estado-empleado')) {
                const toggle = e.target;
                const nuevoEstado = toggle.checked;
                const card = toggle.closest('.employee-card-compact');
                const empleadoId = card.dataset.employeeId;
                
                handleUpdateEstadoEmpleado(empleadoId, nuevoEstado, card);
                return; 
            }
            // --- FIN MÓDULO 4 ---

            const actionTarget = e.target.closest('[data-action]');
            if (!actionTarget) return;

            const action = actionTarget.dataset.action;

            switch (action) {
                case 'cancel-edit-company':
                    if (currentCompanyData) {
                        openPanelForCompany(currentCompanyData);
                    } else {
                        closePanel();
                    }
                    break;
                case 'edit-company':
                    panelForm.querySelector('.info-card').classList.add('is-editing');
                    if (serviciosMultiSelectInstance) {
                        serviciosMultiSelectInstance.enabled = true;
                    }
                    break;
                case 'register-employee':
                    openPanelForEmployee(null); 
                    break;
                case 'cancel-edit-employee':
                    openPanelForCompany(currentCompanyData);
                    break;
                
                // --- INICIO MÓDULO 6 (Botón Editar Empleado) ---
                case 'edit-employee':
                    const card = e.target.closest('.employee-card-compact');
                    const empleadoId = card.dataset.employeeId;
                    const employeeData = empleadosDeEmpresaActual.find(emp => emp.id == empleadoId);
                    
                    if (employeeData) {
                        openPanelForEmployee(employeeData);
                    } else {
                        mostrarNotificacion('No se pudieron cargar los datos del empleado.');
                    }
                    break;
                // --- FIN MÓDULO 6 ---
            }
        });
        
        // *** MANEJADOR DE SUBMIT DEL FORMULARIO DEL PANEL ***
        panelForm.addEventListener('submit', e => {
            e.preventDefault(); 
            
            if (isEditingEmployee) {
                handleSaveEmployee();
            } else {
                const action = e.submitter ? e.submitter.dataset.action : 'save-company';
                if (action === 'save-company') {
                    handleSaveCompany();
                }
            }
        });
    }
    
    // --- LÓGICA DE ACCIONES ---

    async function handleUpdateEstadoEmpresa(empresaId, nuevoEstado) {
        try {
            const response = await api.updateEmpresaEstado(empresaId, nuevoEstado);
            mostrarNotificacion(response.message, 'success'); 
            
            await cargarEmpresas(); 
            
            if (currentCompanyData && currentCompanyData.id == empresaId) {
                // Actualizamos los datos locales antes de reabrir
                const empresaData = todasLasEmpresas.find(emp => emp.id == empresaId);
                // Volvemos a cargar la empresa (para refrescar los empleados si se desactivaron)
                openPanelForCompany(empresaData, false);
            }
        } catch (error) {
            mostrarNotificacion(error.message);
            cargarEmpresas(); 
        }
    }

    async function handleUpdateEstadoEmpleado(empleadoId, nuevoEstado, cardElement) {
        const toggle = cardElement.querySelector('.toggle-estado-empleado');
        
        try {
            const response = await api.updateEmpleadoEstado(empleadoId, nuevoEstado);
            mostrarNotificacion(response.message, 'success');
            
            if (nuevoEstado) {
                cardElement.classList.remove('inactivo');
            } else {
                cardElement.classList.add('inactivo');
            }
            
            // Actualizamos el estado local
            const employeeData = empleadosDeEmpresaActual.find(emp => emp.id == empleadoId);
            if (employeeData) {
                employeeData.estado = nuevoEstado;
            }
            
            // Módulo 7: Re-aplicamos los filtros después de cambiar el estado
            filtrarEmpleadosEnPanel();

        } catch (error) {
            mostrarNotificacion(error.message);
            toggle.checked = !nuevoEstado; 
        }
    }

    async function handleSaveCompany() {
        const formData = new FormData(panelForm);
        const isUpdating = !!formData.get('id'); 
        
        if (serviciosMultiSelectInstance) {
            const servicioIDs = serviciosMultiSelectInstance.value || [];
            servicioIDs.forEach(id => {
                formData.append('servicios', id);
            });
        }
        
        try {
            const result = await api.saveEmpresa(formData); 
            
            mostrarNotificacion(result.message, 'success');
            
            if (isUpdating) {
                openPanelForCompany(result.empresa); 
            } else {
                closePanel();
            }
            
            await cargarEmpresas(); 
            
        } catch (error) {
            mostrarNotificacion(error.message);
        }
    }
    
    async function handleSaveEmployee() {
        const formData = new FormData(panelForm);
        
        formData.append('id_empresa', currentCompanyData.id);

        Swal.fire({ title: 'Guardando...', text: 'Por favor espera.', didOpen: () => Swal.showLoading() });

        try {
            const result = await api.saveEmployee(formData);
            
            Swal.close();
            mostrarNotificacion(result.message, 'success');
            
            // Volvemos al panel de la empresa (que recargará la lista de empleados)
            openPanelForCompany(currentCompanyData);
            
        } catch (error) {
            Swal.fire('Error al guardar', error.message, 'error');
        }
    }

    // --- INICIALIZACIÓN ---
    function init() {
        setupEventListeners();
        cargarEmpresas();
        cargarRecursos(); 
    }
    
    init();

});

// --- Funciones de Utilidad (Notificaciones) ---
function mostrarNotificacion(mensaje, tipo = 'error') {
    if (tipo === 'success') {
        Swal.fire('Éxito', mensaje, 'success');
    } else {
        Swal.fire('Error', mensaje, 'error');
    }
}
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
    let empleadosDeEmpresaActual = [];
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
    
    function renderizarEmpleadosEnPanel(empleados) {
        const container = document.getElementById('panel-empleados-container');
        if (!container) return;
        
        container.innerHTML = '';
        if (empleados.length === 0) {
            container.innerHTML = "<p>No hay empleados registrados.</p>";
            return;
        }
        empleados.forEach(emp => {
            const cardHTML = ui.createEmpleadoCard(emp);
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
            
            // Si estamos en modo 'solo vista' (no editando), deshabilitamos el control
            if (!startInEditMode && data) {
                serviciosMultiSelectInstance.enabled = false;
            }
        }

        // Si la empresa existe y no estamos en 'startInEditMode', cargamos empleados
        if (data && !startInEditMode) {
            fetchAndRenderEmployeesInPanel(data.id);
        }
        
        // Si se fuerza el modo edición (ej. al crear)
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
        
        // Destruye instancias de widgets para liberar memoria
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
        isEditingEmployee = true; // Estamos en el panel de Empleado
        panelTitle.textContent = data ? `Editar ${data.first_name || 'Empleado'}` : 'Registrar Nuevo Empleado';

        // 1. Inyectar el HTML del formulario de empleado
        panelForm.innerHTML = ui.getEmployeeFormHTML(data, cargosDisponibles);

        // 2. Inicializar el MultiSelect de Cargos
        const cargoMultiselectElem = panelForm.querySelector('#cargo-empleado-multiselect');
        const cargoHiddenInput = panelForm.querySelector('#cargo-empleado-hidden');
        
        cargoEmpleadoMultiSelectInstance = new ej.dropdowns.MultiSelect({
            dataSource: cargosDisponibles,
            fields: { value: 'id', text: 'text' },
            placeholder: 'Selecciona un cargo',
            mode: 'Box',
            maximumSelectionLength: 1, // Solo permitimos un cargo
            value: data ? [data.cargo] : [],
            change: (args) => {
                // Actualizamos el input hidden que sí se envía con el form
                if(args.value && args.value.length > 0) {
                    cargoHiddenInput.value = args.value[0];
                } else {
                    cargoHiddenInput.value = '';
                }
            }
        });
        cargoEmpleadoMultiSelectInstance.appendTo(cargoMultiselectElem);

        // 3. Conectar listeners para la vista previa de imagen
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

        // (Aquí puedes añadir la lógica de compresión de imagen si lo deseas)
        // ... (código de imageCompression) ...
        
        // Lógica simple de vista previa:
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
            empleadosDeEmpresaActual = data.empleados;
            empleadosDeEmpresaActual.sort((a, b) => b.estado - a.estado);
            renderizarEmpleadosEnPanel(empleadosDeEmpresaActual);
        } catch (error) {
            container.innerHTML = `<p style="color: red;">${error.message}</p>`;
        }
    }

    // --- MANEJADORES DE EVENTOS ---
    
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
                const nuevoEstado = e.target.checked;
                handleUpdateEstadoEmpresa(empresaId, nuevoEstado);
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
            // Navegación inteligente
            if (isEditingEmployee) {
                // Si estábamos editando un empleado, volvemos al panel de la empresa
                openPanelForCompany(currentCompanyData);
            } else {
                // Si estábamos en el panel de empresa, cerramos
                closePanel();
            }
        });
        panelOverlay.addEventListener('click', closePanel);
        
        // Manejador de clics DENTRO del panel
        panelForm.addEventListener('click', e => {
            const actionTarget = e.target.closest('[data-action]');
            if (!actionTarget) return;

            const action = actionTarget.dataset.action;

            switch (action) {
                case 'cancel-edit-company':
                    if (currentCompanyData) {
                        openPanelForCompany(currentCompanyData); // Vuelve a modo vista
                    } else {
                        closePanel(); // Cierra si era 'nueva'
                    }
                    break;
                case 'edit-company':
                    panelForm.querySelector('.info-card').classList.add('is-editing');
                    if (serviciosMultiSelectInstance) {
                        serviciosMultiSelectInstance.enabled = true;
                    }
                    break;
                case 'register-employee':
                    openPanelForEmployee(null); // Abre el formulario de nuevo empleado
                    break;
                case 'cancel-edit-employee':
                    // Volvemos al panel de la empresa
                    openPanelForCompany(currentCompanyData);
                    break;
                
                // (Aquí faltaría 'edit-employee' para la tarjeta de empleado)
            }
        });
        
        // *** MANEJADOR DE SUBMIT DEL FORMULARIO DEL PANEL ***
        panelForm.addEventListener('submit', e => {
            e.preventDefault(); 
            
            // Determinamos qué formulario estamos enviando
            if (isEditingEmployee) {
                handleSaveEmployee();
            } else {
                // Chequeamos el 'submitter' por si acaso, pero 'isEditingEmployee' es la clave
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
            await api.updateEmpresaEstado(empresaId, nuevoEstado);
            mostrarNotificacion('Estado actualizado', 'success');
            await cargarEmpresas(); // Recarga y reordena
        } catch (error) {
            mostrarNotificacion(error.message);
            cargarEmpresas(); // Revertir visualmente
        }
    }

    async function handleSaveCompany() {
        const formData = new FormData(panelForm);
        const isUpdating = !!formData.get('id'); // ¿Estamos actualizando?
        
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
                // Si actualizamos, volvemos al modo vista con los nuevos datos
                openPanelForCompany(result.empresa); 
            } else {
                // Si creamos, cerramos el panel
                closePanel();
            }
            
            // Refrescamos la cuadrícula principal en ambos casos
            await cargarEmpresas(); 
            
        } catch (error) {
            mostrarNotificacion(error.message);
        }
    }
    
    async function handleSaveEmployee() {
        const formData = new FormData(panelForm);
        
        // Añadimos el ID de la empresa al FormData
        formData.append('id_empresa', currentCompanyData.id);

        // (Validaciones de formulario irían aquí)
        
        Swal.fire({ title: 'Guardando...', text: 'Por favor espera.', didOpen: () => Swal.showLoading() });

        try {
            const result = await api.saveEmployee(formData);
            
            Swal.close();
            mostrarNotificacion(result.message, 'success');
            
            // Volvemos al panel de la empresa (que recargará la lista de empleados)
            openPanelForCompany(currentCompanyData);
            
        } catch (error) {
            mostrarNotificacion(error.message);
        }
    }

    // --- INICIALIZACIÓN ---
    function init() {
        setupEventListeners();
        cargarEmpresas();
        cargarRecursos(); // Carga cargos y servicios en segundo plano
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
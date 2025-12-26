/*
 * home.js
 * Funcionalidad principal para la plantilla base del home.
 * Maneja: Sidebar, Logout, Interacciones UI.
 */

document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    initLogout();
    initGlobalPanel();
});

/**
 * Inicializa la funcionalidad del sidebar (colapsar/expandir)
 */
function initSidebar() {
    const sidebar = document.querySelector(".sidebar");
    const sidebarBtn = document.querySelector(".bx-menu");
    
    if (sidebarBtn && sidebar) {
        sidebarBtn.addEventListener("click", () => {
            sidebar.classList.toggle("close");
        });
    }

    // Gestionar sub-menús si es necesario (para móviles o click)
    const arrows = document.querySelectorAll(".arrow");
    arrows.forEach(arrow => {
        arrow.addEventListener("click", (e) => {
            const arrowParent = e.target.parentElement.parentElement; // seleccionamos el li padre
            arrowParent.classList.toggle("showMenu");
        });
    });
}

/**
 * Inicializa la funcionalidad de Logout con SweetAlert2
 */
function initLogout() {
    const logoutBtn = document.querySelector('.js-logout-button');
    const body = document.querySelector('body');
    const logoutUrl = body.getAttribute('data-logout-url');

    if (logoutBtn && logoutUrl) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            Swal.fire({
                title: '¿Estás seguro?',
                text: "Cerrarás tu sesión actual.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, cerrar sesión',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = logoutUrl;
                }
            });
        });
    }
}

/**
 * Inicializa el panel global overlay (si se usa dinámicamente)
 */
function initGlobalPanel() {
    const closeBtn = document.getElementById('global-panel-close-btn');
    const overlay = document.getElementById('global-panel-overlay');
    const sidePanel = document.getElementById('global-side-panel');

    function closePanel() {
        if (sidePanel) sidePanel.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closePanel);
    }

    if (overlay) {
        overlay.addEventListener('click', closePanel);
    }
}

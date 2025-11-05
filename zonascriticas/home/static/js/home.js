// home/static/home/js/home.js

document.addEventListener('DOMContentLoaded', function() {
    
    // 1. Lógica del Sidebar (basada en la clase del body)
    const body = document.body;
    if (body.classList.contains('role-admin')) {
        const sidebar = document.querySelector(".sidebar");
        const menuBtn = document.querySelector(".home-content .bx-menu");
        
        if (sidebar && menuBtn) {
            menuBtn.addEventListener("click", () => {
                sidebar.classList.toggle("close");
            });
        }
    }

    // 2. Lógica de Logout (universal)
    
    // Leemos la URL que Django 'inyectó' en el body
    const logoutUrl = body.dataset.logoutUrl;

    // Buscamos TODOS los botones que tengan la clase 'js-logout-button'
    const logoutButtons = document.querySelectorAll('.js-logout-button');

    function smartLogout() {
        if (logoutUrl) {
            window.location.href = logoutUrl;
        } else {
            console.error('Logout URL no encontrada.');
            window.location.href = '/'; // Fallback a la raíz
        }
    }

    // Asignamos el evento a cada botón
    logoutButtons.forEach(button => {
        // Usamos 'click' en lugar de 'onclick'
        button.addEventListener('click', smartLogout);
    });
});
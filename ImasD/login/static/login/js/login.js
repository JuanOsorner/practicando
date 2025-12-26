// Esperamos a que el DOM (documento) cargue completamente
document.addEventListener('DOMContentLoaded', function() {
    
    // Usamos querySelector para seleccionar el formulario con la clase 'forregistro'
    const form = document.querySelector('.forregistro');

    // aplicamos al fomrulario el evento submit
    form.addEventListener('submit', function(e) {
        // Cuando se ejecute el evento evitamos que se recargue la pagina
        e.preventDefault();
        
        // Empaquetamos los datos de la pagina en un objeto FormData
        const formData = new FormData(form);

        // Enviamos nuestra peticion a Django
        fetch(form.action, { // Usamos la URL del atributo 'action' del HTML
            method: form.method, // Usamos el atributo POST del HTML para el servidor
            body: formData, // Enviamos los datos del formulario
            headers: {
                'X-Requested-With': 'XMLHttpRequest' // Buena práctica en Django para que el servidor sepa que es una peticion AJAX
            }
        }) // Si todo funciona correctamente
        .then(response => response.json()) // Convertimos la respuesta del servidor a JSON
        .then(data => { // Pasmamos todo a la variable data
            // Usamos los datos que nos llegan del servidor
            if (data.success) {
                // CASO DE ÉXITO
                Swal.fire({
                    title: '¡Bienvenido!',
                    text: data.message,
                    icon: 'success',
                    timer: 2000, // Se cierra solo en 2 segundos
                    showConfirmButton: false
                }).then(() => {
                    // Redireccionamos a la URL que nos mandó el back
                    window.location.href = data.url; 
                });

            } else {
                // CASO DE ERROR
                Swal.fire({
                    title: 'Error de acceso',
                    text: data.message, // El mensaje que viene desde Python
                    icon: 'error',
                    confirmButtonText: 'Intentar de nuevo'
                });
            }
        })
        // Si algo sale mal informamos al usuario
        .catch(error => {
            // Esto es para ver el error solo en desarrollo o en mantenimiento
            // NOTA: Dejar comentado para producción
            console.error('Error:', error);
            Swal.fire({
                title: 'Error del servidor',
                text: 'Comunicarse con el administrador para una solucion inmediata',
                icon: 'warning'
            });
        });
    });
});
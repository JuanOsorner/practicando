document.addEventListener('DOMContentLoaded', async () => {
    
    const loginform = document.querySelector('.forregistro');

    async function login(url, cuerpo) {
        try {
            const respuesta = await fetch(url, {
                method: 'POST',
                body: cuerpo
            });
            const data = await respuesta.json();
            if (!respuesta.ok) {
                throw new Error(data.mensaje || 'Error desconocido del servidor');
            }
            return data;
        } catch (error) {
            console.log("Error en el servidor", error);
            throw error;
        }
    }

    if (loginform) {
        loginform.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = loginform.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Ingresando...';
            const formData = new FormData(loginform);

            try {
                const datos = await login(loginform.action, formData);

                if (datos.status === true) {

                    Swal.fire({
                        title: '¡Éxito!',
                        text: datos.mensaje,
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    }).then(() => {
                        window.location.href = '/perfil/';
                    });
                }

            } catch (error) {
                Swal.fire({
                    title: 'Error de inicio de sesión',
                    text: error.message,
                    icon: 'error',
                    confirmButtonText: 'Entendido'
                });
                submitButton.disabled = false;
                submitButton.textContent = 'Ingresar';
            }
        });
    }
});
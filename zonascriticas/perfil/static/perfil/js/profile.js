document.addEventListener('DOMContentLoaded', () => {

    // --- Función Genérica para manejar el guardado de datos ---
    async function handleProfileSubmit(e) {
        e.preventDefault();
        
        // 'this' es el formulario que disparó el evento (desktop o mobile)
        const form = this; 
        const submitButton = form.querySelector('button[type="submit"]');
        
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

        const formData = new FormData(form);
        
        try {
            const response = await fetch('/perfil/api/update/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': formData.get('csrfmiddlewaretoken')
                }
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.mensaje || 'Error del servidor');

            Swal.fire({
                title: '¡Éxito!',
                text: data.mensaje,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });

        } catch (error) {
            Swal.fire({ title: 'Error', text: error.message, icon: 'error' });
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios';
        }
    }

    // --- Función Genérica para manejar la subida de imagen ---
    async function handleImageUpload(e) {
        
        // Identifica qué formulario e imagen están relacionados con el input que cambió
        const input = e.target; // El <input type="file">
        const formId = (input.id === 'profileImageInput') ? 'uploadForm' : 'uploadFormMobile';
        const imageId = (input.id === 'profileImageInput') ? 'profileImage' : 'profileImageMobile';
        
        const form = document.getElementById(formId);
        const imageElement = document.getElementById(imageId);

        if (!form || !imageElement) return;

        const formData = new FormData(form);
        imageElement.style.opacity = '0.5'; 
        
        try {
            const response = await fetch('/perfil/api/update-image/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': formData.get('csrfmiddlewaretoken')
                }
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.mensaje || 'Error al subir la imagen');

            // Actualiza la imagen que se cambió (desktop o mobile)
            imageElement.src = data.new_image_url; 
            
            // Actualiza TODAS las imágenes de perfil en la página (sidebar, header, etc.)
            document.getElementById('sidebar-profile-img')?.setAttribute('src', data.new_image_url);
            document.getElementById('mobile-profile-img')?.setAttribute('src', data.new_image_url);
            document.getElementById('profileImage')?.setAttribute('src', data.new_image_url);
            document.getElementById('profileImageMobile')?.setAttribute('src', data.new_image_url);


        } catch (error) {
            Swal.fire({ title: 'Error de Imagen', text: error.message, icon: 'error' });
        } finally {
            imageElement.style.opacity = '1';
            input.value = ''; // Limpia el input
        }
    }

    // --- 1. Asignar Eventos al Formulario de DATOS (Desktop) ---
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileSubmit);
    }

    // --- 2. Asignar Eventos al Formulario de DATOS (Mobile) ---
    const profileFormMobile = document.getElementById('profileFormMobile');
    if (profileFormMobile) {
        profileFormMobile.addEventListener('submit', handleProfileSubmit);
    }

    // --- 3. Asignar Eventos al Input de IMAGEN (Desktop) ---
    const imageInput = document.getElementById('profileImageInput');
    if (imageInput) {
        imageInput.addEventListener('change', handleImageUpload);
    }

    // --- 4. Asignar Eventos al Input de IMAGEN (Mobile) ---
    const imageInputMobile = document.getElementById('profileImageInputMobile');
    if (imageInputMobile) {
        imageInputMobile.addEventListener('change', handleImageUpload);
    }
});
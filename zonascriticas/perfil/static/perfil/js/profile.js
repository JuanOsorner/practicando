/**
 * profile.js
 * Gestiona la actualización de datos y foto de perfil.
 * REFACTORIZADO: Usa core/image.js para comprimir imágenes antes de subir.
 */

import { imageUtils } from '/static/home/js/core/image.js';

document.addEventListener('DOMContentLoaded', () => {

    // --- Función Genérica para manejar el guardado de DATOS (Texto) ---
    async function handleProfileSubmit(e) {
        e.preventDefault();
        
        // 'this' es el formulario que disparó el evento (desktop o mobile)
        const form = this; 
        const submitButton = form.querySelector('button[type="submit"]');
        
        // Estado de carga visual
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
            // Restaurar botón
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios';
        }
    }

    // --- Función Genérica para manejar la subida de IMAGEN (Con Compresión) ---
    async function handleImageUpload(e) {
        
        const input = e.target; // El <input type="file">
        const file = input.files[0]; // El archivo original seleccionado

        if (!file) return; // Si el usuario cancela la selección, no hacemos nada

        // Identifica qué formulario e imagen están relacionados
        const formId = (input.id === 'profileImageInput') ? 'uploadForm' : 'uploadFormMobile';
        const imageId = (input.id === 'profileImageInput') ? 'profileImage' : 'profileImageMobile';
        
        const form = document.getElementById(formId);
        const imageElement = document.getElementById(imageId);

        if (!form || !imageElement) return;

        // Feedback visual de carga (opacidad)
        imageElement.style.opacity = '0.5'; 
        
        try {
            // 1. OPTIMIZACIÓN: Comprimir imagen antes de subir
            // Usamos 800px de ancho y calidad 0.8 (Jpg), suficiente para perfil.
            const compressedBlob = await imageUtils.compress(file, 800, 0.8);

            // 2. Preparamos el FormData manualmente
            const formData = new FormData(form);
            
            // 3. Reemplazamos el archivo original gigante por el comprimido
            // 'img' es el nombre del campo en tu modelo Usuario
            formData.set('img', compressedBlob, "perfil_optimizado.jpg");

            const response = await fetch('/perfil/api/update-image/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': formData.get('csrfmiddlewaretoken')
                }
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.mensaje || 'Error al subir la imagen');

            // 4. Actualizar la interfaz con la nueva URL retornada por el servidor
            
            // Imagen principal
            imageElement.src = data.new_image_url; 
            
            // Actualiza TODAS las instancias de la foto de perfil en la página
            // (Sidebar, Header, versión móvil, etc.)
            const idsToUpdate = ['sidebar-profile-img', 'mobile-profile-img', 'profileImage', 'profileImageMobile'];
            
            idsToUpdate.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.setAttribute('src', data.new_image_url);
            });

        } catch (error) {
            Swal.fire({ title: 'Error de Imagen', text: error.message, icon: 'error' });
        } finally {
            // Restaurar estado visual
            imageElement.style.opacity = '1';
            input.value = ''; // Limpia el input para permitir subir la misma foto de nuevo si se desea
        }
    }

    // --- ASIGNACIÓN DE EVENTOS ---

    // 1. Formularios de Datos (Texto)
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileSubmit);
    }

    const profileFormMobile = document.getElementById('profileFormMobile');
    if (profileFormMobile) {
        profileFormMobile.addEventListener('submit', handleProfileSubmit);
    }

    // 2. Inputs de Imagen (File Change)
    const imageInput = document.getElementById('profileImageInput');
    if (imageInput) {
        imageInput.addEventListener('change', handleImageUpload);
    }

    const imageInputMobile = document.getElementById('profileImageInputMobile');
    if (imageInputMobile) {
        imageInputMobile.addEventListener('change', handleImageUpload);
    }
});
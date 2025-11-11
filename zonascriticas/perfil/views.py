# zonascriticas/perfil/views.py

from django.shortcuts import render
from django.http import HttpRequest, HttpResponse, JsonResponse
# from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from django.templatetags.static import static
from login.decorators import login_custom_required

@login_custom_required
def perfil_view(request: HttpRequest) -> HttpResponse:
    """
    Muestra la página de perfil del usuario.
    """
    
    # 1. Define la ruta estática de tu imagen por defecto
    imagen_url_por_defecto = static('zonascriticas/img/default.png')

    # 2. Comprueba si el usuario tiene una imagen en la BD
    if request.user.img:
        # Si la tiene, usa la URL de medios (ej. /media/usuarios/foto.jpg)
        imagen_a_mostrar = request.user.img.url
    else:
        # Si no la tiene (es NULL), usa la imagen por defecto
        imagen_a_mostrar = imagen_url_por_defecto
        
    context = {
        'user': request.user,
        'imagen_src': imagen_a_mostrar 
    }
    
    return render(request, 'perfil.html', context)

# ---
# --- ¡LAS FUNCIONES QUE TE FALTAN PARA GUARDAR! ---
# ---

@require_POST  # Solo permite peticiones POST
@login_custom_required
def update_profile_api(request: HttpRequest) -> JsonResponse:
    """
    API para actualizar los datos del formulario de perfil.
    Recibe el fetch desde profile.js
    """
    user = request.user
    try:
        # 1. Recoge los datos del POST
        user.first_name = request.POST.get('nombre', '').strip()
        user.tipo_documento = request.POST.get('tipo_documento')
        user.numero_documento = request.POST.get('documento', '').strip()
        
        # 2. Guarda el usuario EN LA BASE DE DATOS
        user.save(update_fields=['first_name', 'tipo_documento', 'numero_documento'])
        
        # 3. Responde con éxito
        return JsonResponse({
            'status': True,
            'mensaje': 'Perfil actualizado correctamente.'
        })
    except Exception as e:
        # 4. Maneja errores (ej. documento duplicado)
        return JsonResponse({'status': False, 'mensaje': str(e)}, status=400)


@require_POST  # Solo permite peticiones POST
@login_custom_required
def update_image_api(request: HttpRequest) -> JsonResponse:
    """
    API para actualizar la imagen de perfil.
    Recibe el fetch desde profile.js
    """
    user = request.user
    try:
        # 1. Recoge la imagen del formulario
        image_file = request.FILES.get('profileImage')
        if not image_file:
            return JsonResponse({'status': False, 'mensaje': 'No se proporcionó ninguna imagen.'}, status=400)

        # 2. Asigna y guarda
        user.img = image_file
        user.save(update_fields=['img'])
        
        # 3. Responde con la nueva URL de la imagen
        return JsonResponse({
            'status': True,
            'mensaje': 'Imagen actualizada.',
            'new_image_url': user.img.url  # Envía la nueva URL al frontend
        })
    except Exception as e:
        return JsonResponse({'status': False, 'mensaje': str(e)}, status=400)
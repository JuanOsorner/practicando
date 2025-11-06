# zonascriticas\perfil\views.py

from django.shortcuts import render
from django.http import HttpRequest, HttpResponse
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST

@login_required(login_url='/')
def perfil_view(request: HttpRequest) -> HttpResponse:
    """
    Muestra la página de perfil del usuario.
    """
    
    imagen_url = 'img/imagenes_admin/default.png'
    
    if request.user.img:
        imagen_url = request.user.img.url
        
    context = {
        'user': request.user,
        'imagen_src': imagen_url 
    }
    
    return render(request, 'perfil.html', context)

@require_POST  # Solo permite peticiones POST
@login_required
def update_profile_api(request: HttpRequest) -> JsonResponse:
    """
    API para actualizar los datos del formulario de perfil.
    """
    user = request.user
    try:
        # 1. Recoge los datos del POST
        user.first_name = request.POST.get('nombre', '').strip()
        user.last_name = request.POST.get('apellido', '').strip()
        user.tipo_documento = request.POST.get('tipo_documento')
        user.numero_documento = request.POST.get('documento', '').strip()
        
        # 2. Guarda el usuario
        user.save(update_fields=['first_name', 'last_name', 'tipo_documento', 'numero_documento'])
        
        # 3. Responde con éxito
        return JsonResponse({
            'status': True,
            'mensaje': 'Perfil actualizado correctamente.'
        })
    except Exception as e:
        # 4. Maneja errores (ej. documento duplicado)
        return JsonResponse({'status': False, 'mensaje': str(e)}, status=400)


@require_POST  # Solo permite peticiones POST
@login_required
def update_image_api(request: HttpRequest) -> JsonResponse:
    """
    API para actualizar la imagen de perfil.
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
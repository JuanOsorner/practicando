# login/views.py

from django.http import JsonResponse, HttpRequest, HttpResponse
from django.shortcuts import render, redirect 
from django.contrib.auth import login, logout # Importaciones clave para la sesión
from django.views.decorators.http import require_POST
from .models import Usuario

def mostrar_login(request: HttpRequest) -> HttpResponse:
    """
    Renderiza la plantilla HTML del login (la vista GET).
    """
    return render(request, 'login.html')

def logout_view(request):
    """
    Cierra la sesión del usuario y lo redirige a la página de login.
    """
    logout(request) # Cierra la sesión de Django
    return redirect('login') # Redirige a la URL con nombre 'login'

@require_POST # Solo permite peticiones POST
def login_api(request: HttpRequest) -> JsonResponse:
    """
    Maneja el envío del formulario de login.
    Valida al usuario e inicia una Sesión de Django (SSR).
    """
    documento = request.POST.get('documento', '').strip()
    
    if not documento:
        return JsonResponse({'status': False, 'mensaje': 'Documento no proporcionado.'}, status=400)

    try:
        # Busca al usuario por su número de documento
        user = Usuario.objects.get(numero_documento=documento)
    
    except Usuario.DoesNotExist:
        return JsonResponse({
            'status': False, 
            'error_code': 'USER_NOT_FOUND', 
            'mensaje': 'El documento no se encuentra registrado.'
        }, status=404)

    # --- Validaciones de Negocio ---

    if not user.is_active:
        return JsonResponse({
            'status': False, 
            'mensaje': 'Usuario inactivo. Por favor contacte al administrador.'
        }, status=403)
    
    """
    POR EL MOMENTO LO DEJAMOS ASÍ MIENTRAS MANEJAMOS EL INGRESO POR MICROSOFT

    if user.tipo == 'Administrador':
        return JsonResponse({
            'status': False, 
            'mensaje': 'Los administradores solo pueden ingresar con correo corporativo.'
        }, status=403)
    """

    # --- Lógica de Éxito ---
    
    # 1. ¡CAMBIO CRÍTICO!
    #    Inicia la sesión de Django para el usuario.
    #    Esto crea la cookie de sesión segura (HttpOnly).
    login(request, user)

    # 2. (Lógica de token manual eliminada, ya no es necesaria)

    # 3. Devuelve una respuesta simple de éxito.
    response_data = {
        'status': True,
        'mensaje': 'Inicio de sesión exitoso.',
    }
    return JsonResponse(response_data)
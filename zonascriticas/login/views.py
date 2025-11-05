# login/views.py

import secrets
from django.http import JsonResponse, HttpRequest, HttpResponse
from django.shortcuts import render
from django.views.decorators.http import require_POST
from .models import Usuario
from django.utils import timezone
from datetime import timedelta

def mostrar_login(request: HttpRequest) -> HttpResponse:
    """
    Vista que renderiza la plantilla HTML (la que tu urls.py ya usa).
    """
    return render(request, 'login.html')


@require_POST
def login_api(request: HttpRequest) -> JsonResponse:
    """
    Versión corregida que envía el token en el JSON,
    coincidiendo con tu login.js (método localStorage).
    """
    documento = request.POST.get('documento', '').strip()
    
    if not documento:
        # Devuelve 'status' y 'mensaje' como espera el JS
        return JsonResponse({'status': False, 'mensaje': 'Documento no proporcionado.'}, status=400)

    try:
        user = Usuario.objects.get(numero_documento=documento)
    
    except Usuario.DoesNotExist:
        return JsonResponse({
            'status': False, 
            'error_code': 'USER_NOT_FOUND', 
            'mensaje': 'El documento no se encuentra registrado.'
        }, status=404)

    if not user.is_active:
        return JsonResponse({
            'status': False, 
            'mensaje': 'Usuario inactivo. Por favor contacte al administrador.'
        }, status=403)

    if user.tipo == 'Administrador':
        return JsonResponse({
            'status': False, 
            'mensaje': 'Los administradores solo pueden ingresar con correo corporativo.'
        }, status=403)

    # --- Lógica de Éxito ---
    auth_token = secrets.token_hex(32)

    token_expiration_time = timezone.now() + timedelta(days=1)

    user.token = auth_token
    user.otp_expiracion = token_expiration_time
    user.save(update_fields=['token', 'otp_expiracion'])

    # ¡CORRECCIÓN!
    # Creamos el JSON que tu login.js espera.
    response_data = {
        'status': True,
        'mensaje': 'Inicio de sesión exitoso.',
        'datos': {
            'token': auth_token 
        }
    }
    # Ya no necesitamos set_cookie, el JS maneja el token.
    return JsonResponse(response_data)
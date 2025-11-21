# zonascriticas/login/views.py

from django.http import JsonResponse, HttpRequest, HttpResponse
from django.shortcuts import render, redirect 
# from django.contrib.auth import login, logout
from django.views.decorators.http import require_POST
from .models import Usuario
from .utils import SecurityJail

from django.views.decorators.csrf import csrf_protect # Importante para proteger el POST

def mostrar_login(request: HttpRequest) -> HttpResponse:
    """Mostramos el login"""
    return render(request, 'login.html')

def logout_view(request):
    """
    Cierra la sesión del usuario (Versión manual).
    """
    try:
        request.session.flush()
    except Exception:
        pass
    return redirect('login') 

@require_POST
@csrf_protect
def login_api(request: HttpRequest) -> JsonResponse:
    
    # --- 1. FASE DE SEGURIDAD: Verificar IP antes de leer datos ---
    puede_pasar, mensaje_error = SecurityJail.verificar_acceso(request)
    if not puede_pasar:
        # Retornamos 429 Too Many Requests
        return JsonResponse({'status': False, 'mensaje': mensaje_error}, status=429)
    
    # --- 2. Lógica Normal ---
    documento = request.POST.get('documento', '').strip()
    
    if not documento:
        return JsonResponse({'status': False, 'mensaje': 'Documento no proporcionado.'}, status=400)

    try:
        user = Usuario.objects.get(numero_documento=documento)
    
    except Usuario.DoesNotExist:
        # --- 3. REGISTRAR EL FALLO (Aumentar contador de la IP) ---
        SecurityJail.registrar_fallo(request)
        # Retornamos 404 (o 401 para ser más oscuros)
        return JsonResponse({'status': False, 'mensaje': 'El documento no se encuentra registrado.'}, status=404)

    if not user.is_active: 
        # ¿Contamos usuario inactivo como ataque? 
        # Generalmente NO, es un error de RRHH, no de un hacker. No llamamos a registrar_fallo.
        return JsonResponse({'status': False, 'mensaje': 'Usuario inactivo.'}, status=403)

    # --- 4. ÉXITO: Limpieza de Sesión ---
    if request.session.get('id_usuario_logueado'):
        request.session.flush()
    
    if not request.session.session_key:
        request.session.create()
    else:
        request.session.cycle_key()

    request.session['id_usuario_logueado'] = user.id
    request.session.set_expiry(86400) 

    return JsonResponse({'status': True, 'mensaje': 'Inicio de sesión exitoso.'})
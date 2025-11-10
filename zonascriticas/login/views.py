# zonascriticas/login/views.py

from django.http import JsonResponse, HttpRequest, HttpResponse
from django.shortcuts import render, redirect 
# from django.contrib.auth import login, logout
from django.views.decorators.http import require_POST
from .models import Usuario

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
def login_api(request: HttpRequest) -> JsonResponse:
    """
    Maneja el login (Versión manual).
    """
    documento = request.POST.get('documento', '').strip()
    
    if not documento:
        return JsonResponse({'status': False, 'mensaje': 'Documento no proporcionado.'}, status=400)

    try:
        user = Usuario.objects.get(numero_documento=documento)
    
    except Usuario.DoesNotExist:
        return JsonResponse({'status': False, 'mensaje': 'El documento no se encuentra registrado.'}, status=404)

    if not user.is_active: 
        return JsonResponse({'status': False, 'mensaje': 'Usuario inactivo. Por favor contacte al administrador.'}, status=403)

    # Guardamos el ID del usuario en la sesión manualmente.
    request.session['id_usuario_logueado'] = user.id
    request.session.set_expiry(86400) # 1 día

    return JsonResponse({'status': True, 'mensaje': 'Inicio de sesión exitoso.'})
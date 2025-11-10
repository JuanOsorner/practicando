# home/views.py

# --- 1. Importaciones Necesarias ---
from django.shortcuts import render, redirect # ¡Necesitamos redirect!
from django.http import HttpRequest, HttpResponse
# from django.contrib.auth.decorators import login_required 
from login.models import Usuario 
# Añadimos nuestro decorador
from login.decorators import login_custom_required

# --- 2. Vista Principal (Ahora es un REDIRECTOR) ---

# home/views.py
@login_custom_required
def home_view(request: HttpRequest) -> HttpResponse:
    """
    Esta vista SÍ es un 'aiguilleur' (redirector).
    Su ÚNICO trabajo es redirigir según el rol.
    """
    user = request.user 

    if user.tipo == 'Usuario':
        # Redirige a la URL nombrada 'responsabilidad'
        return redirect('responsabilidad') 
    else:
        # Redirige a la URL nombrada 'perfil'
        return redirect('perfil')
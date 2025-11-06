# home/views.py

# --- 1. Importaciones Necesarias ---
from django.shortcuts import render, redirect # ¡Necesitamos redirect!
from django.http import HttpRequest, HttpResponse
from django.contrib.auth.decorators import login_required 
from login.models import Usuario 

# --- 2. Vista Principal (Ahora es un REDIRECTOR) ---

# home/views.py
@login_required(login_url='/')
def home_view(request: HttpRequest) -> HttpResponse:
    """
    Esta vista SÍ es un 'aiguilleur' (redirector).
    Su ÚNICO trabajo es redirigir según el rol.
    """
    user = request.user 

    if user.tipo == 'Usuario':
        # Redirige a la URL nombrada 'responsabilidad'
        return redirect('perfil') 
    else:
        # Redirige a la URL nombrada 'perfil'
        return redirect('perfil')
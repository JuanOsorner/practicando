# home/views.py

# --- 1. Importaciones Necesarias ---
from django.shortcuts import render, redirect # ¡Necesitamos redirect!
from django.http import HttpRequest, HttpResponse
from django.contrib.auth.decorators import login_required 
from login.models import Usuario 

# --- 2. Vista Principal (Ahora es un REDIRECTOR) ---

@login_required(login_url='/')
def home_view(request: HttpRequest) -> HttpResponse:
    """
    Esta vista ya no renderiza HTML.
    Actúa como un 'aiguilleur' que redirige al usuario
    a su página de inicio correcta después del login.
    """
    
    user = request.user 
    
    # Decide a dónde enviar al usuario
    if user.tipo == 'Usuario':
        # TODO: Implementar la lógica de 'obtenerIdRegistroIngresoActivo'
        # ...
        
        # Redirige a la URL nombrada 'responsabilidad'
        return redirect('perfil')
    else:
        # Redirige a la URL nombrada 'perfil'
        return redirect('responsabilidad')


# --- 3. Vistas "Hijo" (Ahora renderizan el contenido) ---
#    Estas vistas ahora son las responsables de
#    renderizar las plantillas "hijo".

@login_required(login_url='/')
def perfil_view(request: HttpRequest) -> HttpResponse:
    """
    Muestra la página de perfil del usuario.
    """
    # Pasamos el 'context' necesario para que el 'home.html' (padre)
    # pueda renderizar el sidebar, etc.
    imagen_url = '/static/images/default.png'
    if request.user.img:
        imagen_url = request.user.img.url
        
    context = {
        'user': request.user,
        'imagen_src': imagen_url 
    }
    return render(request, 'perfil/perfil.html', context)
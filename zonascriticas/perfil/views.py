from django.shortcuts import render
from django.http import HttpRequest, HttpResponse
from django.contrib.auth.decorators import login_required 
from login.models import Usuario 
# Create your views here.

def _cargar_datos_usuario(request: HttpRequest) -> HttpResponse:
    """
    Este metodo devuelve todos los datos al profile del usuario
    """
    

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
    return render(request, 'perfil.html', context)


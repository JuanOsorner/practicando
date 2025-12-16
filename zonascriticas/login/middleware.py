"""
zonascriticas/login/middleware.py

Descripción: 

Este archivo es nuestro middleware personalizado que evita que usemos logica
duplicada en diferentes archivos. 

Ejemplo: Sin el middleware nos tocaria para validar la autenticacion del usuario en
cada archivo hacer en cada vista

    user_id = request.session.get("id_usuario_logueado")
    if user_id:
        user = Usuario.objects.get(pk=user_id)
    else:
        user = None

responsabilidades: 

-Este middleware inyecta request.user de forma perezosa, usando 
la sesión como fuente de verdad, sin golpear la base de datos en cada request.
"""
from django.utils.functional import SimpleLazyObject
from .models import Usuario

def get_user_from_session(request):
    """
    Función auxiliar que realiza la consulta REAL a la base de datos.
    Solo se ejecuta cuando se accede a request.user por primera vez.
    Esto evita realizar mil consultas a la base de datos

    args: request

    return: Usuario o None

    execption: Usuario.DoesNotExist
    """
    user_id = request.session.get('id_usuario_logueado')
    
    if not user_id:
        return None

    try:
        user = Usuario.objects.get(pk=user_id)
        return user
    except Usuario.DoesNotExist:
        # Si el ID está en sesión pero el usuario fue borrado de la BD
        request.session.flush() 
        return None

class CustomAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        
        # SimpleLazyObject ejecuta una vez la funcion de una vista 
        request.user = SimpleLazyObject(lambda: get_user_from_session(request))
        
        response = self.get_response(request)
        return response
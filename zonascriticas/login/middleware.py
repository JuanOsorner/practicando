# zonascriticas/login/middleware.py
from django.utils.functional import SimpleLazyObject
from .models import Usuario

# Esta funcion nos evita que se hagan muchas peticiones a la base de datos por cada vista
def get_user_from_session(request):
    """
    Función auxiliar que realiza la consulta REAL a la base de datos.
    Solo se ejecuta cuando se accede a request.user por primera vez.
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
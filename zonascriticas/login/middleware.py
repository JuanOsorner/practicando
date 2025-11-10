# zonascriticas/login/middleware.py (Archivo Nuevo)
from .models import Usuario

class CustomAuthMiddleware:
    """
    Middleware personalizado para cargar el usuario desde nuestra
    clave de sesión manual ('id_usuario_logueado') a 'request.user'.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user_id = request.session.get('id_usuario_logueado')
        
        if user_id:
            try:
                user = Usuario.objects.get(pk=user_id)
                request.user = user
            except Usuario.DoesNotExist:
                request.session.flush()
                request.user = None
        else:
            request.user = None

        response = self.get_response(request)
        return response
# zonascriticas/registro_herramientas/decorators.py

from functools import wraps
from django.http import JsonResponse
from descargo_responsabilidad.models import RegistroIngreso

def requiere_ingreso_pendiente_api(view_func):
    """
    Decorador para APIs JSON.
    1. Verifica que el usuario tenga un ingreso en estado PENDIENTE_HERRAMIENTAS.
    2. Si no existe, retorna 403 Forbidden.
    3. Si existe, lo inyecta como segundo argumento a la vista: view_func(request, ingreso, ...)
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        # Lógica repetitiva centralizada
        ingreso_pendiente = RegistroIngreso.objects.filter(
            visitante=request.user,
            estado=RegistroIngreso.EstadoOpciones.PENDIENTE_HERRAMIENTAS
        ).first()

        if not ingreso_pendiente:
            return JsonResponse({
                'status': False, 
                'mensaje': 'No hay un ingreso activo pendiente de herramientas.'
            }, status=403)

        # Inyectamos 'ingreso_pendiente' en los argumentos
        return view_func(request, ingreso_pendiente, *args, **kwargs)

    return _wrapped_view
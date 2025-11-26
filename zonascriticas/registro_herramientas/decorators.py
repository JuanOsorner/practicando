from functools import wraps
from descargo_responsabilidad.models import RegistroIngreso
from home.utils import api_response

def requiere_ingreso_pendiente_api(view_func):
    """
    Decorador para APIs JSON.
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        ingreso_pendiente = RegistroIngreso.objects.filter(
            visitante=request.user,
            estado=RegistroIngreso.EstadoOpciones.PENDIENTE_HERRAMIENTAS
        ).first()

        if not ingreso_pendiente:
            # Estandarización: success=False
            return api_response(
                success=False, 
                message='No hay un ingreso activo pendiente de herramientas.', 
                status_code=403
            )

        return view_func(request, ingreso_pendiente, *args, **kwargs)

    return _wrapped_view
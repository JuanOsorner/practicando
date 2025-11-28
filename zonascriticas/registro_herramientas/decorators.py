from functools import wraps
from descargo_responsabilidad.models import RegistroIngreso
from home.utils import api_response
from django.db.models import Q

def requiere_ingreso_activo_o_pendiente(view_func):
    """
    Decorador V2: Permite el acceso si el ingreso está PENDIENTE_HERRAMIENTAS 
    O si ya está EN_ZONA (para gestión dinámica desde Actividades).
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        # Buscamos un ingreso que sea del usuario y NO esté finalizado
        ingreso = RegistroIngreso.objects.filter(
            visitante=request.user
        ).filter(
            Q(estado=RegistroIngreso.EstadoOpciones.PENDIENTE_HERRAMIENTAS) | 
            Q(estado=RegistroIngreso.EstadoOpciones.EN_ZONA)
        ).first()

        if not ingreso:
            return api_response(
                success=False, 
                message='No hay un ingreso activo para gestionar herramientas.', 
                status_code=403
            )

        # Inyectamos el objeto 'ingreso' en la vista
        return view_func(request, ingreso, *args, **kwargs)

    return _wrapped_view

# Alias por compatibilidad (opcional, pero mejor refactorizar las vistas)
requiere_ingreso_pendiente_api = requiere_ingreso_activo_o_pendiente
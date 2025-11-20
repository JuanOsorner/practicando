from functools import wraps
from django.shortcuts import redirect
from .models import RegistroIngreso

def no_tener_zona_activa(view_func):
    """
    GUARDIÁN DE ENTRADA:
    Evita que un usuario que YA está dentro de una zona intente
    volver a entrar a otra (o a la misma).
    Si ya está ocupado, lo patea al dashboard central.
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        # Consultamos si existe algún registro abierto (En Zona)
        tiene_ingreso = RegistroIngreso.objects.filter(
            visitante=request.user,
            estado=RegistroIngreso.EstadoOpciones.EN_ZONA
        ).exists()

        if tiene_ingreso:
            # ¡ALTO! Ya estás adentro. Vete al dashboard.
            return redirect('dashboard')

        # Pase usted, está libre.
        return view_func(request, *args, **kwargs)
    return _wrapped_view

def requiere_zona_activa(view_func):
    """
    GUARDIÁN DE ACTIVIDAD:
    Evita que un usuario intente registrar herramientas o salidas
    si NO ha entrado a ninguna zona legalmente.
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        tiene_ingreso = RegistroIngreso.objects.filter(
            visitante=request.user,
            estado=RegistroIngreso.EstadoOpciones.EN_ZONA
        ).exists()

        if not tiene_ingreso:
            # ¡ALTO! No has entrado. Vete al dashboard (que te mandará al escáner).
            return redirect('dashboard')

        return view_func(request, *args, **kwargs)
    return _wrapped_view
# zonascriticas/login/decorators.py (Archivo Nuevo)
from django.shortcuts import redirect

def login_custom_required(view_func):
    """
    Decorador personalizado que reemplaza a @login_required.
    """
    def _wrapped_view(request, *args, **kwargs):
        # Nuestro middleware pone None si el usuario no está logueado
        # (o si no tiene 'is_authenticated = True', pero el nuestro siempre lo tiene)
        if request.user is None or not request.user.is_authenticated:
            return redirect('login')
        
        return view_func(request, *args, **kwargs)
    
    return _wrapped_view
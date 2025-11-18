# zonascriticas/login/decorators.py
from functools import wraps
from django.shortcuts import redirect
from django.conf import settings # Opcional, si quisieras configurar la URL de login globalmente
from django.urls import reverse # Reverse nos devuele la ruta de una url.py

def login_custom_required(view_func):
    """
    Decorador que asegura que el usuario esté autenticado.
    Si no lo está, redirige al login guardando la página a la que quería ir.
    """
    @wraps(view_func) # 1. Buena práctica: Preserva el nombre y docstring de la vista original
    def _wrapped_view(request, *args, **kwargs):
        
        # El metodo getattr nos devuelve false si no recibe los dos primeros paremetros
        is_authenticated = getattr(request.user, 'is_authenticated', False)

        if not is_authenticated:

            # reverse('login') buscará en urls.py el name='login'
            # y devolverá la ruta real, en nuestro caso toma de la url el ''
            base_url = reverse('login') 
            
            # Resultado: "/?next=/empresas/" (Ruta absoluta, empieza con /)
            return redirect(f"{base_url}?next={request.path}") # Cuando colocque bien el documento envialo a donde queria ir
        
        return view_func(request, *args, **kwargs)
    
    return _wrapped_view
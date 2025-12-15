"""
zonascriticas/login/decorators.py

Descripción: 

Este archivo es el encargado de proteger las vistas de quien no se ha
logueado correctamente a la plataforma. 

Responsabilidades:

- Valida que un usuario este autenticado
- Si el usuario no esta autenticado lo redirige al url del login
- De lo contrario retornamos la vista

Escrito por: Juan Esteban Osorno Duque 😎
"""
from functools import wraps
from django.shortcuts import redirect
from django.conf import settings # Opcional, si quisieras configurar la URL de login globalmente
from django.urls import reverse # Reverse nos devuele la ruta de una url.py

def login_custom_required(view_func):
    """
    Decorador que asegura que el usuario esté autenticado.
    Si no lo está, redirige al login guardando la página a la que quería ir.

    args: recibe una vista (una función)

    returns: retorna la envoltura logica que a su vez retorna la vista si todo sale correctamente
    """
    @wraps(view_func) # 1. Tomamos el request para validar si esta autenticado
    def _wrapped_view(request, *args, **kwargs):
        
        # 2. usamos el metodo getattr valida si el objeto suelta es autenticado, sino false
        is_authenticated = getattr(request.user, 'is_authenticated', False)

        # 3. Si el usuario no esta autenticado
        if not is_authenticated:

            # reverse('login') buscará en urls.py el name='login'
            # y devolverá la ruta real, en nuestro caso toma de la url el ''
            base_url = reverse('login') 
            
            # 4. Resultado: "/?next=/empresas/" (Ruta absoluta, empieza con /)
            return redirect(f"{base_url}?next={request.path}") # Cuando colocque bien el documento envialo a donde queria ir
        # 5. Si todo sale bien retornamos la vista con los parametros
        return view_func(request, *args, **kwargs)
    
    return _wrapped_view
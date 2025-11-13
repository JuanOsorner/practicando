from django.shortcuts import render
from django.contrib.auth.decorators import login_required
# El decorador personalizado
from login.decorators import login_custom_required

# Vamos a proteger esta vista si el usuario no se ha logueado
@login_custom_required
def responsabilidad_view(request):
    """
    Vista principal del descargo.
    Detecta el User-Agent para determinar si es un dispositivo móvil.
    """
    user_agent = request.META.get('HTTP_USER_AGENT', '').lower()
    
    # Palabras clave comunes en user agents de móviles
    mobile_agents = ['mobile', 'android', 'iphone', 'ipad', 'webos', 'ipod', 'blackberry', 'windows phone']
    
    # esto es una secuencia booleana
    is_mobile = any(agent in user_agent for agent in mobile_agents)

    if is_mobile:
        # Si es móvil, mostramos el formulario
        # Pasamos datos del usuario para rellenar el HTML dinámicamente
        context = {
            'usuario': request.user,
            # Puedes agregar más contexto aquí si necesitas datos de la empresa, etc.
        }
        return render(request, 'descargo_responsabilidad/mobile_form.html', context)
    else:
        # Si es escritorio, mostramos la advertencia
        return render(request, 'descargo_responsabilidad/desktop_warning.html')

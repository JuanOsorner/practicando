from functools import wraps
from django.shortcuts import redirect
from home.utils import CronometroJornada, api_response

def requiere_tiempo_activo(view_func):
    """
    Decorador de Seguridad.
    1. Calcula si al usuario le queda tiempo.
    2. Si NO le queda:
       - CIERRA EL INGRESO EN BD (Rompe el bucle de redirección).
       - AJAX: Retorna 403 JSON.
       - HTML: Redirige a la salida.
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        # Validamos tiempo
        if CronometroJornada.esta_vencido(request.user):
            
            # 🚨 ACCIÓN CORRECTIVA: ROMPER EL BUCLE 🚨
            # Importamos aquí dentro para evitar errores de carga circular
            from actividades.services import ActividadesService
            
            # Forzamos el cierre en base de datos.
            # Ahora el usuario pasa de 'EN_ZONA' a 'FINALIZADO'.
            ActividadesService.forzar_salida_por_tiempo(request.user)
            
            # Detectamos si es API (AJAX/Fetch)
            es_ajax = request.headers.get('x-requested-with') == 'XMLHttpRequest' or \
                      'application/json' in request.headers.get('Content-Type', '')

            if es_ajax:
                return api_response(
                    success=False, 
                    message="TIEMPO_AGOTADO", 
                    status_code=403,
                    data={'redirect_url': '/responsabilidad/'} 
                )
            else:
                # Al redirigir ahora, @no_tener_zona_activa dejará pasar al usuario
                # porque su estado en BD ya es FINALIZADO.
                return redirect('responsabilidad') 

        return view_func(request, *args, **kwargs)

    return _wrapped_view
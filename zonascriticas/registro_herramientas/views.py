"""
Esta capa es la que se encarga de la logica HTTP de nuestro servidor
"""

from django.shortcuts import render, redirect
from django.http import JsonResponse, HttpRequest, HttpResponse
from django.views.decorators.http import require_GET, require_POST
from login.decorators import login_custom_required
from descargo_responsabilidad.models import RegistroIngreso
from .services import HerramientasService

# --- VISTA HTML PRINCIPAL ---

@login_custom_required
def registro_herramientas_view(request: HttpRequest) -> HttpResponse:
    """
    Renderiza la SPA (Single Page Application) para registrar herramientas.
    """
    user = request.user
    
    # 1. Buscamos el ingreso PENDIENTE
    ingreso_pendiente = RegistroIngreso.objects.filter(
        visitante=user,
        estado=RegistroIngreso.EstadoOpciones.PENDIENTE_HERRAMIENTAS
    ).first()

    # Seguridad: Si no tiene un ingreso pendiente, no debería estar aquí.
    if not ingreso_pendiente:
        return redirect('dashboard')

    context = {
        'usuario': user,
        'ingreso_id': ingreso_pendiente.id
    }
    # Renderizamos el template (que crearemos luego)
    return render(request, 'registro_herramientas.html', context)


# --- API ENDPOINTS (JSON) ---

@login_custom_required
@require_GET
def api_obtener_inventario(request: HttpRequest) -> JsonResponse:
    """API para llenar los selects/listas del frontend."""
    try:
        data = HerramientasService.obtener_inventario_usuario(request.user)
        return JsonResponse({'status': True, 'data': data})
    except Exception as e:
        return JsonResponse({'status': False, 'mensaje': str(e)}, status=500)

@login_custom_required
@require_POST
def api_crear_inventario(request: HttpRequest) -> JsonResponse:
    """API para agregar un nuevo ítem al catálogo del usuario."""
    try:
        # request.POST trae los datos de texto, request.FILES trae la foto opcional
        nuevo_item = HerramientasService.crear_item_inventario(
            request.user, 
            request.POST, 
            request.FILES.get('foto_referencia')
        )
        return JsonResponse({
            'status': True, 
            'mensaje': 'Ítem agregado al inventario.',
            'item': {'id': nuevo_item.id, 'nombre': nuevo_item.nombre}
        })
    except Exception as e:
        return JsonResponse({'status': False, 'mensaje': str(e)}, status=400)

@login_custom_required
@require_POST
def api_registrar_ingreso_herramienta(request: HttpRequest) -> JsonResponse:
    """API para registrar la entrada física (con foto evidencia)."""
    try:
        # Buscamos el ingreso activo del usuario
        ingreso_pendiente = RegistroIngreso.objects.filter(
            visitante=request.user,
            estado=RegistroIngreso.EstadoOpciones.PENDIENTE_HERRAMIENTAS
        ).first()

        if not ingreso_pendiente:
            return JsonResponse({'status': False, 'mensaje': 'No hay ingreso activo pendiente.'}, status=403)

        registro = HerramientasService.registrar_ingreso_herramienta(
            ingreso_pendiente,
            request.POST,
            request.FILES.get('foto_evidencia')
        )
        
        return JsonResponse({'status': True, 'mensaje': 'Herramienta registrada correctamente.'})
    except Exception as e:
        return JsonResponse({'status': False, 'mensaje': str(e)}, status=400)

@login_custom_required
@require_POST
def api_finalizar_registro(request: HttpRequest) -> JsonResponse:
    """API para cerrar el proceso y pasar a 'En Zona'."""
    try:
        ingreso_pendiente = RegistroIngreso.objects.filter(
            visitante=request.user,
            estado=RegistroIngreso.EstadoOpciones.PENDIENTE_HERRAMIENTAS
        ).first()

        if not ingreso_pendiente:
            return JsonResponse({'status': False, 'mensaje': 'No hay ingreso para finalizar.'}, status=400)

        HerramientasService.finalizar_proceso_registro(ingreso_pendiente)
        
        return JsonResponse({'status': True, 'mensaje': 'Registro finalizado. ¡Bienvenido!'})
    except Exception as e:
        return JsonResponse({'status': False, 'mensaje': str(e)}, status=500)
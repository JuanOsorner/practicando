# zonascriticas/descargo_responsabilidad/views.py

from django.shortcuts import render
from django.http import JsonResponse, HttpRequest, HttpResponse
from django.views.decorators.http import require_GET, require_POST
from django.core.exceptions import ValidationError
from login.decorators import login_custom_required
from login.models import Usuario
import json

# Importamos los servicios de negocio
from .services import UsuarioService, ZonaService, DescargoService


# --- VISTA HTML (Existente) ---
@login_custom_required
def responsabilidad_view(request: HttpRequest) -> HttpResponse:
    """
    Vista principal del descargo (Renderiza HTML).
    Detecta el User-Agent para determinar si es un dispositivo móvil.
    """
    user_agent = request.META.get('HTTP_USER_AGENT', '').lower()
    
    mobile_agents = ['mobile', 'android', 'iphone', 'ipad', 'webos', 'ipod', 'blackberry', 'windows phone']
    
    is_mobile = any(agent in user_agent for agent in mobile_agents)

    if is_mobile:
        context = {
            'usuario': request.user,
        }
        return render(request, 'mobile_form.html', context)
    else:
        return render(request, 'desktop_warning.html')


# --- API Endpoint 1 (NUEVO) ---
@login_custom_required
@require_GET
def buscar_usuario_api(request: HttpRequest) -> JsonResponse:
    """
    API (JSON) para buscar un responsable por su número de documento.
    """
    documento = request.GET.get('documento')
    
    try:
        # Delega la lógica de negocio al servicio
        datos_usuario = UsuarioService.buscar_responsable_por_documento(documento)
        return JsonResponse(datos_usuario, status=200)
    
    except (Usuario.DoesNotExist, ValueError, ValidationError) as e:
        # Capturamos errores de negocio (No encontrado, Inactivo, etc.)
        return JsonResponse({'error': str(e)}, status=404)
    except Exception as e:
        # Errores inesperados
        return JsonResponse({'error': 'Error interno del servidor'}, status=500)


# --- API Endpoint 2 (NUEVO) ---
@login_custom_required
@require_GET
def buscar_zona_api(request: HttpRequest) -> JsonResponse:
    """
    API (JSON) para validar un código QR de zona.
    """
    codigo = request.GET.get('codigo')
    if not codigo:
        return JsonResponse({'error': 'Código no proporcionado'}, status=400)

    try:
        # Delega la lógica de negocio al servicio
        info_zona = ZonaService.obtener_info_zona(codigo)
        return JsonResponse(info_zona, status=200)
    except ValueError as e: # El service lanza ValueError si no encuentra
        return JsonResponse({'error': str(e)}, status=404)


# --- API Endpoint 3 (NUEVO) ---
@login_custom_required
@require_POST
def procesar_ingreso_api(request: HttpRequest) -> JsonResponse:
    """
    API (JSON) para recibir el formulario de descargo firmado.
    """
    try:
        # El frontend debe enviar Content-Type: application/json
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Datos JSON mal formados'}, status=400)

    try:
        # Delega la orquestación completa al servicio
        # request.user es el visitante (logueado)
        DescargoService.procesar_ingreso(data, request.user)
        return JsonResponse({'mensaje': 'Ingreso registrado exitosamente'}, status=201)
    
    except (ValueError, ValidationError) as e:
        # Captura errores de negocio (ej: "No puedes ser tu propio responsable")
        return JsonResponse({'error': str(e)}, status=400)
    except Exception as e:
        # Captura errores de generación de PDF, envío de correo, etc.
        return JsonResponse({'error': f'Error interno: {str(e)}'}, status=500)
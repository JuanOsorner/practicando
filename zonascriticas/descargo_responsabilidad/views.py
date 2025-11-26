# zonascriticas/descargo_responsabilidad/views.py

from django.shortcuts import render
from django.http import HttpRequest, HttpResponse
from django.views.decorators.http import require_GET, require_POST
from django.core.exceptions import ValidationError
from login.decorators import login_custom_required
from login.models import Usuario
import json

# --- IMPORTACIÓN DEL NÚCLEO  ---
from home.utils import api_response

# Importamos los servicios de negocio
from .services import UsuarioService, ZonaService, DescargoService

# Importamos nuestro decorador local
from .decorators import no_tener_zona_activa

# --- VISTA HTML ---
@login_custom_required
@no_tener_zona_activa
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


# --- API Endpoint 1: Buscar Usuario ---
@login_custom_required
@require_GET
def buscar_usuario_api(request: HttpRequest) -> HttpResponse:
    """
    API para buscar un responsable por su número de documento.
    """
    documento = request.GET.get('documento')
    
    try:
        # Delega la lógica de negocio al servicio
        datos_usuario = UsuarioService.buscar_responsable_por_documento(documento)
        
        # RETORNO ESTANDARIZADO:
        # El helper coloca 'datos_usuario' dentro de la clave 'payload'
        return api_response(data=datos_usuario)
    
    except (Usuario.DoesNotExist, ValueError, ValidationError) as e:
        # Capturamos errores de negocio
        return api_response(success=False, message=str(e), status_code=404)
        
    except Exception as e:
        # Errores inesperados
        return api_response(success=False, message='Error interno del servidor', status_code=500)


# --- API Endpoint 2: Buscar Zona (QR) ---
@login_custom_required
@require_GET
def buscar_zona_api(request: HttpRequest) -> HttpResponse:
    """
    API para validar un código QR de zona.
    """
    codigo = request.GET.get('codigo')
    
    if not codigo:
        return api_response(success=False, message='Código no proporcionado', status_code=400)

    try:
        # Delega la lógica de negocio al servicio
        info_zona = ZonaService.obtener_info_zona(codigo)
        return api_response(data=info_zona)
        
    except ValueError as e: 
        # El service lanza ValueError si no encuentra la zona o está inactiva
        return api_response(success=False, message=str(e), status_code=404)


# --- API Endpoint 3: Procesar Ingreso ---
@login_custom_required
@require_POST
def procesar_ingreso_api(request: HttpRequest) -> HttpResponse:
    """
    API para recibir el formulario de descargo firmado.
    """
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return api_response(success=False, message='Datos JSON mal formados', status_code=400)

    try:
        # Delega la orquestación completa al servicio
        DescargoService.procesar_ingreso(data, request.user)
        
        return api_response(
            message='Ingreso registrado exitosamente', 
            status_code=201
        )
    
    except (ValueError, ValidationError) as e:
        # Captura errores de negocio (ej: firmas faltantes, usuario inválido)
        return api_response(success=False, message=str(e), status_code=400)
        
    except Exception as e:
        # Captura errores de infraestructura (PDF, Email, DB)
        return api_response(success=False, message=f'Error interno: {str(e)}', status_code=500)
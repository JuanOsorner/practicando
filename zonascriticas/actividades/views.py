# zonascriticas/actividades/views.py

from django.shortcuts import render, redirect
from django.http import HttpRequest, HttpResponse
from django.views.decorators.http import require_GET, require_POST
from django.core.exceptions import ValidationError

# Imports de Auth y Core
from login.decorators import login_custom_required
from home.utils import api_response, CronometroJornada
from home.decorators import requiere_tiempo_activo

# Servicios y Modelos
from .services import ActividadesService

# ======================================================
# === VISTA HTML PRINCIPAL (TABLERO) ===
# ======================================================

@login_custom_required
@requiere_tiempo_activo  # <--- SEGURIDAD: Si no hay tiempo, redirige a 'responsabilidad'
def actividades_view(request: HttpRequest) -> HttpResponse:
    user = request.user
    
    # 1. Obtener ingreso activo usando la utilidad centralizada
    # El decorador ya garantizó que el tiempo es > 0, pero validamos que exista el ingreso.
    ingreso_activo = CronometroJornada.get_ingreso_activo(user)

    if not ingreso_activo:
        # Si el usuario está logueado pero no tiene ingreso en zona, va al dashboard
        return redirect('dashboard')

    # 2. Calcular tiempo restante
    # Usamos la lógica central de home/utils.py
    segundos = CronometroJornada.calcular_segundos_restantes(ingreso_activo)
    
    # 3. Preparar Contexto
    context = {
        'usuario': user,
        'ingreso_id': ingreso_activo.id,
        'modalidad': ingreso_activo.modalidad,
        # 'max' asegura que no enviemos tiempos negativos al frontend visual
        'segundos_restantes': max(0, segundos),
        'nombre_zona': ingreso_activo.ubicacion.nombre, 
    }
    
    return render(request, 'actividades.html', context)


# ======================================================
# === API ENDPOINTS (CONTROLADORES JSON) ===
# ======================================================

@login_custom_required
@require_GET
@requiere_tiempo_activo # <--- SEGURIDAD: Retorna 403 TIEMPO_AGOTADO si vence
def listar_actividades_api(request: HttpRequest) -> HttpResponse:
    """
    Devuelve la lista de actividades del ingreso actual.
    """
    try:
        actividades = ActividadesService.listar_actividades(request.user)
        
        # Serialización manual para control total del formato JSON
        data = []
        for act in actividades:
            data.append({
                'id': act.id,
                'titulo': act.titulo,
                'estado': act.estado, # EN_PROCESO / FINALIZADA
                'hora_inicio': act.hora_inicio.strftime('%H:%M'),
                'hora_fin': act.hora_fin.strftime('%H:%M') if act.hora_fin else None,
                'obs_inicial': act.observacion_inicial,
                'obs_final': act.observacion_final,
                'foto_inicial': act.foto_inicial.url if act.foto_inicial else None,
                'foto_final': act.foto_final.url if act.foto_final else None,
            })
            
        return api_response(data={'actividades': data})
        
    except Exception as e:
        return api_response(success=False, message=str(e), status_code=500)


@login_custom_required
@require_POST
@requiere_tiempo_activo # <--- SEGURIDAD: Impide crear nuevas tareas si venció el tiempo
def iniciar_actividad_api(request: HttpRequest) -> HttpResponse:
    """
    Crea una nueva actividad (Card Roja).
    """
    try:
        nueva_actividad = ActividadesService.iniciar_actividad(
            request.user,
            request.POST,
            request.FILES.get('foto_inicial')
        )
        
        return api_response(
            message='Actividad iniciada.', 
            data={'id': nueva_actividad.id}, 
            status_code=201
        )
        
    except ValidationError as e:
        return api_response(success=False, message=e.message, status_code=400)
    except Exception as e:
        return api_response(success=False, message=str(e), status_code=500)


@login_custom_required
@require_POST
@requiere_tiempo_activo # <--- SEGURIDAD: Impide finalizar tareas si venció el tiempo
def finalizar_actividad_api(request: HttpRequest, actividad_id: int) -> HttpResponse:
    """
    Cierra una actividad existente (Pasa a Verde).
    """
    try:
        ActividadesService.finalizar_actividad(
            request.user,
            actividad_id,
            request.POST,
            request.FILES.get('foto_final')
        )
        
        return api_response(message='Actividad finalizada correctamente.')
        
    except ValidationError as e:
        return api_response(success=False, message=e.message, status_code=400)
    except Exception as e:
        return api_response(success=False, message=str(e), status_code=500)

@login_custom_required
@require_POST
def salida_zona_api(request: HttpRequest) -> HttpResponse:
    """
    Registra la salida voluntaria de la zona.
    """
    try:
        ActividadesService.cerrar_ingreso_zona(request.user)
        return api_response(message='Jornada finalizada correctamente.')
        
    except ValidationError as e:
        return api_response(success=False, message=e.message, status_code=400)
    except Exception as e:
        return api_response(success=False, message=str(e), status_code=500)
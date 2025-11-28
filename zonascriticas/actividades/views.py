# zonascriticas/actividades/views.py

from django.shortcuts import render, redirect
from django.http import HttpRequest, HttpResponse
from django.views.decorators.http import require_GET, require_POST
from django.core.exceptions import ValidationError
from login.decorators import login_custom_required
from home.utils import api_response
from descargo_responsabilidad.models import RegistroIngreso

# Importamos el cerebro de la app (Donde movimos la lógica)
from .services import ActividadesService

# --- VISTA HTML PRINCIPAL ---
@login_custom_required
def actividades_view(request: HttpRequest) -> HttpResponse:
    user = request.user
    
    ingreso_activo = RegistroIngreso.objects.select_related('ubicacion').filter(
        visitante=user,
        estado=RegistroIngreso.EstadoOpciones.EN_ZONA
    ).first()

    if not ingreso_activo:
        return redirect('dashboard')

    # Usamos la V2 del cálculo pasando el objeto ingreso
    segundos_restantes = ActividadesService.calcular_tiempo_restante(user, ingreso_activo)

    context = {
        'usuario': user,
        'ingreso_id': ingreso_activo.id,
        'modalidad': ingreso_activo.modalidad,
        'segundos_restantes': segundos_restantes,
        # INYECCIÓN DEL NOMBRE DE ZONA
        'nombre_zona': ingreso_activo.ubicacion.nombre, 
    }
    return render(request, 'actividades.html', context)


# --- API ENDPOINTS (CONTROLADORES JSON) ---

@login_custom_required
@require_GET
def listar_actividades_api(request: HttpRequest) -> HttpResponse:
    """
    Devuelve la lista de actividades del ingreso actual.
    """
    try:
        actividades = ActividadesService.listar_actividades(request.user)
        
        # Serializamos manualmente para controlar el formato exacto que espera el JS
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
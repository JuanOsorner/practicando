# zonascriticas/actividades/views.py

from django.shortcuts import render, redirect
from django.http import HttpRequest, HttpResponse
from django.views.decorators.http import require_GET, require_POST
from django.core.exceptions import ValidationError
from login.decorators import login_custom_required
from home.utils import api_response
from descargo_responsabilidad.models import RegistroIngreso
from datetime import datetime, date, timedelta
from django.utils import timezone

# Importamos el cerebro de la app
from .services import ActividadesService

# --- VISTA HTML PRINCIPAL ---
@login_custom_required
@login_custom_required
def actividades_view(request: HttpRequest) -> HttpResponse:
    user = request.user
    
    # 1. Validar Ingreso Activo
    ingreso_activo = RegistroIngreso.objects.filter(
        visitante=user,
        estado=RegistroIngreso.EstadoOpciones.EN_ZONA
    ).first()

    if not ingreso_activo:
        return redirect('dashboard')

    # 2. CÁLCULO DE TIEMPO RESTANTE (CRÍTICO)
    segundos_restantes = 0
    
    if user.tiempo_limite_jornada:
        # Obtenemos la hora actual con zona horaria (aware) si usas USE_TZ=True
        ahora = timezone.localtime(timezone.now())
        
        # Construimos la fecha-hora límite combinando HOY con la HORA del usuario
        limite_hoy = datetime.combine(ahora.date(), user.tiempo_limite_jornada)
        
        # Hacemos el limite "aware" (con zona horaria) para poder restar
        if timezone.is_naive(limite_hoy):
            limite_hoy = timezone.make_aware(limite_hoy)
            
        # Calculamos diferencia
        diferencia = limite_hoy - ahora
        segundos_restantes = int(diferencia.total_seconds())
        
        # Si ya son las 18:01, la diferencia es negativa. Forzamos 0.
        if segundos_restantes < 0:
            segundos_restantes = 0
    else:
        # Si el usuario NO tiene hora límite, definimos 8 horas (28800 seg) por defecto
        # o un valor muy alto para que no moleste.
        segundos_restantes = 28800 

    context = {
        'usuario': user,
        'ingreso_id': ingreso_activo.id,
        'modalidad': ingreso_activo.modalidad,
        # Pasamos el dato al template
        'segundos_restantes': segundos_restantes, 
    }
    return render(request, 'actividades.html', context)


# --- API ENDPOINTS ---

@login_custom_required
@require_GET
def listar_actividades_api(request: HttpRequest) -> HttpResponse:
    """
    Devuelve la lista de actividades del ingreso actual.
    """
    try:
        actividades = ActividadesService.listar_actividades(request.user)
        
        # Serializamos manualmente para controlar el formato exacto
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
# zonascriticas/registros/views.py

import json
from django.shortcuts import render
from django.http import HttpRequest, HttpResponse
from django.views.decorators.http import require_GET, require_POST

# Decoradores y Utils
from login.decorators import login_custom_required
from home.utils import api_response

# Servicio
from .services import RegistrosService
from descargo_responsabilidad.models import RegistroIngreso

# Importamo el static
from django.templatetags.static import static

@login_custom_required
def registros_view(request: HttpRequest) -> HttpResponse:
    """Renderiza el contenedor HTML para el Grid."""
    imagen_url_por_defecto = static('home\img\default.png') 
    imagen_a_mostrar = request.user.img.url if request.user.img else imagen_url_por_defecto
    if request.user.tipo != 'Administrador':
        return render(request, 'home/403.html', status=403)
    return render(request, 'registros.html', {'imagen_src': imagen_a_mostrar})


@login_custom_required
@require_GET
def listar_visitantes_api(request: HttpRequest) -> HttpResponse:
    """
    NUEVA API: Devuelve lista de PERSONAS (Visitantes), no de eventos.
    """
    try:
        visitantes_qs = RegistrosService.listar_visitantes_con_estado()
        
        data = []
        for v in visitantes_qs:
            # Determinamos el estado visual
            estado_visual = 'En Zona' if v.tiene_ingreso_activo else 'Fuera'
            
            data.append({
                'visitante_id': v.id,
                'visitante_nombre': v.get_full_name(),
                'visitante_doc': v.numero_documento,
                'visitante_img': v.img.url if v.img else None,
                'empresa': v.empresa.nombre_empresa if v.empresa else 'Particular',
                'ultima_visita': v.ultima_visita.strftime('%d/%m/%Y %I:%M %p') if v.ultima_visita else 'N/A',
                'estado_actual': estado_visual
            })

        return api_response(data=data)

    except Exception as e:
        return api_response(success=False, message=str(e), status_code=500)


@login_custom_required
@require_GET
def historial_usuario_api(request: HttpRequest, usuario_id: int) -> HttpResponse:
    """
    API PANEL LATERAL: Devuelve el timeline de ingresos de un usuario.
    """
    try:
        registros = RegistrosService.obtener_historial_usuario(usuario_id)
        
        data = []
        for r in registros:
            # Calculamos duración
            duracion = "En curso"
            if r.fecha_hora_salida:
                diff = r.fecha_hora_salida - r.fecha_hora_ingreso
                total_minutos = int(diff.total_seconds() / 60)
                horas = total_minutos // 60
                mins = total_minutos % 60
                duracion = f"{horas}h {mins}m"

            data.append({
                'id': r.id,
                'ubicacion': r.ubicacion.nombre,
                'fecha_ingreso': r.fecha_hora_ingreso.strftime('%d/%m/%Y'),
                'hora_ingreso': r.fecha_hora_ingreso.strftime('%I:%M %p'),
                'hora_salida': r.fecha_hora_salida.strftime('%I:%M %p') if r.fecha_hora_salida else None,
                'duracion': duracion,
                'estado': r.estado,
                'responsable': r.responsable.get_full_name(),
                # Links a documentos
                'url_descargo': r.pdf_descargo.archivo.url if r.pdf_descargo else None,
                'url_salida': r.pdf_reporte_salida.archivo.url if r.pdf_reporte_salida else None,
            })
            
        return api_response(data=data)

    except Exception as e:
        return api_response(success=False, message=str(e), status_code=500)


@login_custom_required
@require_POST
def reactivar_jornada_api(request: HttpRequest) -> HttpResponse:
    """
    API ACCIÓN: Reactiva jornada y actualiza fecha a NOW.
    """
    try:
        payload = json.loads(request.body)
        ingreso_id = payload.get('ingreso_id')
        nueva_hora = payload.get('nueva_hora') # HH:MM

        if not ingreso_id or not nueva_hora:
            return api_response(success=False, message="Faltan datos", status_code=400)

        RegistrosService.reactivar_ingreso_actualizando_tiempo(ingreso_id, nueva_hora)

        return api_response(message=f"Jornada reactivada. Hora de inicio actualizada a ahora.")

    except RegistroIngreso.DoesNotExist:
        return api_response(success=False, message="Ingreso no encontrado", status_code=404)
    except Exception as e:
        return api_response(success=False, message=str(e), status_code=500)
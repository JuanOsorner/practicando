import json
from django.shortcuts import render, redirect
from django.http import HttpRequest, HttpResponse
from django.views.decorators.http import require_GET, require_POST
from login.decorators import login_custom_required
from descargo_responsabilidad.models import RegistroIngreso
from .services import HerramientasService
from .decorators import requiere_ingreso_pendiente_api

# --- IMPORTACIÓN DEL NÚCLEO ---
from home.utils import api_response

# --- VISTA HTML PRINCIPAL (Sin cambios) ---
@login_custom_required
def registro_herramientas_view(request: HttpRequest) -> HttpResponse:
    user = request.user
    ingreso_pendiente = RegistroIngreso.objects.filter(
        visitante=user,
        estado=RegistroIngreso.EstadoOpciones.PENDIENTE_HERRAMIENTAS
    ).first()

    if not ingreso_pendiente:
        return redirect('dashboard')

    context = {
        'usuario': user,
        'ingreso_id': ingreso_pendiente.id
    }
    return render(request, 'registro_herramientas.html', context)


# --- API ENDPOINTS REFACTORIZADOS ---

@login_custom_required
@require_GET
@requiere_ingreso_pendiente_api
def api_obtener_inventario(request: HttpRequest, ingreso) -> HttpResponse:
    try:
        data = HerramientasService.obtener_inventario_usuario(request.user, ingreso.id)
        # Estandarización: data -> payload
        return api_response(data=data)
    except Exception as e:
        return api_response(success=False, message=str(e), status_code=500)

@login_custom_required
@require_POST
def api_crear_inventario(request: HttpRequest) -> HttpResponse:
    try:
        nuevo_item = HerramientasService.crear_item_inventario(
            request.user, 
            request.POST, 
            request.FILES.get('foto_referencia')
        )
        
        item_data = {
            'id': nuevo_item.id,
            'nombre': nuevo_item.nombre,
            'marca': nuevo_item.marca_serial,
            'categoria': nuevo_item.categoria,
            'foto': nuevo_item.foto_referencia.url if nuevo_item.foto_referencia else None,
            'ingresado': False
        }

        # Devolvemos el objeto creado dentro del payload
        return api_response(data={'item': item_data}, message='Ítem agregado al inventario.')
        
    except Exception as e:
        return api_response(success=False, message=str(e), status_code=400)

@login_custom_required
@require_POST
@requiere_ingreso_pendiente_api
def api_registrar_ingreso_herramienta(request: HttpRequest, ingreso) -> HttpResponse:
    try:
        HerramientasService.registrar_ingreso_herramienta(
            ingreso,
            request.POST,
            request.FILES.get('foto_evidencia')
        )
        return api_response(message='Herramienta registrada correctamente.')
    except Exception as e:
        return api_response(success=False, message=str(e), status_code=400)

@login_custom_required
@require_POST
@requiere_ingreso_pendiente_api
def api_finalizar_registro(request: HttpRequest, ingreso) -> HttpResponse:
    try:
        HerramientasService.finalizar_proceso_registro(ingreso)
        return api_response(message='Registro finalizado. ¡Bienvenido!')
    except Exception as e:
        return api_response(success=False, message=str(e), status_code=500)

@login_custom_required
@require_POST
def api_actualizar_inventario(request: HttpRequest, item_id: int) -> HttpResponse:
    try:
        item = HerramientasService.actualizar_item_inventario(
            request.user,
            item_id,
            request.POST,
            request.FILES.get('foto_referencia')
        )
        # Retornamos el item actualizado para refrescar UI si fuera necesario
        return api_response(message='Ítem actualizado.')
    except Exception as e:
        return api_response(success=False, message=str(e), status_code=400)

@login_custom_required
@require_POST
def api_eliminar_inventario(request: HttpRequest, item_id: int) -> HttpResponse:
    try:
        HerramientasService.eliminar_item_inventario(request.user, item_id)
        return api_response(message='Ítem eliminado.')
    except Exception as e:
        return api_response(success=False, message=str(e), status_code=400)

@login_custom_required     
@require_POST
@requiere_ingreso_pendiente_api
def api_remover_del_carrito(request: HttpRequest, ingreso) -> HttpResponse:
    try:
        id_inventario = request.POST.get('id_inventario')
        eliminado = HerramientasService.remover_item_del_carrito(ingreso, id_inventario)

        msg = 'Elemento retirado.' if eliminado else 'El elemento ya no estaba en la lista.'
        return api_response(message=msg)
    except Exception as e:
        return api_response(success=False, message=str(e), status_code=400)

@login_custom_required
@require_POST
@requiere_ingreso_pendiente_api
def api_agregar_carrito(request: HttpRequest, ingreso) -> HttpResponse:
    try:
        id_inventario = request.POST.get('id_inventario')
        if not id_inventario:
            return api_response(success=False, message='Falta ID.', status_code=400)

        registro = HerramientasService.agregar_item_al_carrito(ingreso, id_inventario)
        
        item_inv = registro.herramienta_inventario
        foto_url = item_inv.foto_referencia.url if item_inv.foto_referencia else None
        
        item_data = {
            'id': item_inv.id,
            'nombre': item_inv.nombre,
            'marca': item_inv.marca_serial,
            'categoria': item_inv.categoria,
            'foto': foto_url,
            'ingresado': True,
            'observaciones': registro.observaciones
        }

        return api_response(data={'item': item_data}, message='Añadido correctamente.')
    except Exception as e:
        return api_response(success=False, message=str(e), status_code=400)

@login_custom_required
@require_POST
@requiere_ingreso_pendiente_api
def api_gestion_masiva(request: HttpRequest, ingreso) -> HttpResponse:
    try:
        data = json.loads(request.body)
        lista_ids = data.get('ids', [])
        accion = data.get('accion', 'AGREGAR')

        if not lista_ids:
            return api_response(success=False, message='Sin selección.', status_code=400)

        resultado = HerramientasService.gestion_masiva_carrito(ingreso, lista_ids, accion)

        return api_response(
            data={'resumen': resultado}, 
            message=f"Procesados: {resultado['exitos']}."
        )
    except json.JSONDecodeError:
        return api_response(success=False, message='JSON inválido', status_code=400)
    except Exception as e:
        return api_response(success=False, message=str(e), status_code=500)
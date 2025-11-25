import json
from django.shortcuts import render, redirect
from django.http import JsonResponse, HttpRequest, HttpResponse
from django.views.decorators.http import require_GET, require_POST
from login.decorators import login_custom_required
from descargo_responsabilidad.models import RegistroIngreso
from .services import HerramientasService

# Importamos nuestro nuevo decorador local
from .decorators import requiere_ingreso_pendiente_api

# --- VISTA HTML PRINCIPAL (Sin cambios mayores, usa redirección) ---
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


# --- API ENDPOINTS (FACTORIZADOS) ---

@login_custom_required
@require_GET
@requiere_ingreso_pendiente_api # <--- El decorador hace la magia
def api_obtener_inventario(request: HttpRequest, ingreso) -> JsonResponse:
    # Nota: Recibimos 'ingreso' automáticamente gracias al decorador
    try:
        data = HerramientasService.obtener_inventario_usuario(request.user, ingreso.id)
        return JsonResponse({'status': True, 'data': data})
    except Exception as e:
        return JsonResponse({'status': False, 'mensaje': str(e)}, status=500)

@login_custom_required
@require_POST
# api_crear_inventario NO usa el decorador porque crear un ítem en catálogo 
# es independiente de si estás ingresando hoy o no.
def api_crear_inventario(request: HttpRequest) -> JsonResponse:
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

        return JsonResponse({
            'status': True, 
            'mensaje': 'Ítem agregado al inventario.',
            'item': item_data
        })
    except Exception as e:
        return JsonResponse({'status': False, 'mensaje': str(e)}, status=400)

@login_custom_required
@require_POST
@requiere_ingreso_pendiente_api
def api_registrar_ingreso_herramienta(request: HttpRequest, ingreso) -> JsonResponse:
    """Registra foto evidencia."""
    try:
        registro = HerramientasService.registrar_ingreso_herramienta(
            ingreso, # Usamos el objeto inyectado
            request.POST,
            request.FILES.get('foto_evidencia')
        )
        return JsonResponse({'status': True, 'mensaje': 'Herramienta registrada correctamente.'})
    except Exception as e:
        return JsonResponse({'status': False, 'mensaje': str(e)}, status=400)

@login_custom_required
@require_POST
@requiere_ingreso_pendiente_api
def api_finalizar_registro(request: HttpRequest, ingreso) -> JsonResponse:
    try:
        HerramientasService.finalizar_proceso_registro(ingreso)
        return JsonResponse({'status': True, 'mensaje': 'Registro finalizado. ¡Bienvenido!'})
    except Exception as e:
        return JsonResponse({'status': False, 'mensaje': str(e)}, status=500)

# Las APIs de Actualizar/Eliminar INVENTARIO (Catálogo) no requieren ingreso activo estricto
@login_custom_required
@require_POST
def api_actualizar_inventario(request: HttpRequest, item_id: int) -> JsonResponse:
    try:
        HerramientasService.actualizar_item_inventario(
            request.user,
            item_id,
            request.POST,
            request.FILES.get('foto_referencia')
        )
        return JsonResponse({'status': True, 'mensaje': 'Ítem actualizado.'})
    except Exception as e:
        return JsonResponse({'status': False, 'mensaje': str(e)}, status=400)

@login_custom_required
@require_POST
def api_eliminar_inventario(request: HttpRequest, item_id: int) -> JsonResponse:
    try:
        HerramientasService.eliminar_item_inventario(request.user, item_id)
        return JsonResponse({'status': True, 'mensaje': 'Ítem eliminado.'})
    except Exception as e:
        return JsonResponse({'status': False, 'mensaje': str(e)}, status=400)

@login_custom_required     
@require_POST
@requiere_ingreso_pendiente_api
def api_remover_del_carrito(request: HttpRequest, ingreso) -> JsonResponse:
    try:
        id_inventario = request.POST.get('id_inventario')
        eliminado = HerramientasService.remover_item_del_carrito(ingreso, id_inventario)

        if eliminado:
            return JsonResponse({'status': True, 'mensaje': 'Elemento retirado.'})
        else:
            return JsonResponse({'status': True, 'mensaje': 'El elemento ya no estaba en la lista.'})
    except Exception as e:
        return JsonResponse({'status': False, 'mensaje': str(e)}, status=400)

@login_custom_required
@require_POST
@requiere_ingreso_pendiente_api
def api_agregar_carrito(request: HttpRequest, ingreso) -> JsonResponse:
    try:
        id_inventario = request.POST.get('id_inventario')
        if not id_inventario:
            return JsonResponse({'status': False, 'mensaje': 'Falta ID.'}, status=400)

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

        return JsonResponse({
            'status': True, 
            'mensaje': 'Añadido correctamente.',
            'item': item_data
        })
    except Exception as e:
        return JsonResponse({'status': False, 'mensaje': str(e)}, status=400) 

@login_custom_required
@require_POST
@requiere_ingreso_pendiente_api
def api_gestion_masiva(request: HttpRequest, ingreso) -> JsonResponse:
    try:
        data = json.loads(request.body)
        lista_ids = data.get('ids', [])
        accion = data.get('accion', 'AGREGAR')

        if not lista_ids:
            return JsonResponse({'status': False, 'mensaje': 'Sin selección.'}, status=400)

        resultado = HerramientasService.gestion_masiva_carrito(ingreso, lista_ids, accion)

        return JsonResponse({
            'status': True, 
            'mensaje': f"Procesados: {resultado['exitos']}.",
            'resumen': resultado
        })
    except json.JSONDecodeError:
        return JsonResponse({'status': False, 'mensaje': 'JSON inválido'}, status=400)
    except Exception as e:
        return JsonResponse({'status': False, 'mensaje': str(e)}, status=500)
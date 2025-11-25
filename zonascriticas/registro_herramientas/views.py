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
    try:
        # Buscamos el ingreso pendiente para saber el contexto
        ingreso_pendiente = RegistroIngreso.objects.filter(
            visitante=request.user,
            estado=RegistroIngreso.EstadoOpciones.PENDIENTE_HERRAMIENTAS
        ).first()
        
        ingreso_id = ingreso_pendiente.id if ingreso_pendiente else None

        data = HerramientasService.obtener_inventario_usuario(request.user, ingreso_id)
        return JsonResponse({'status': True, 'data': data})
    except Exception as e:
        return JsonResponse({'status': False, 'mensaje': str(e)}, status=500)

@login_custom_required
@require_POST
def api_crear_inventario(request: HttpRequest) -> JsonResponse:
    """API para agregar un nuevo ítem al catálogo del usuario."""
    try:
        nuevo_item = HerramientasService.crear_item_inventario(
            request.user, 
            request.POST, 
            request.FILES.get('foto_referencia')
        )
        
        # FIX: Devolvemos la estructura COMPLETA que espera el frontend
        item_data = {
            'id': nuevo_item.id,
            'nombre': nuevo_item.nombre,
            'marca': nuevo_item.marca_serial,
            'categoria': nuevo_item.categoria,
            'foto': nuevo_item.foto_referencia.url if nuevo_item.foto_referencia else None,
            'ingresado': False # Acaba de nacer, no está ingresado
        }

        return JsonResponse({
            'status': True, 
            'mensaje': 'Ítem agregado al inventario.',
            'item': item_data # Enviamos el objeto completo
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
        return JsonResponse({'status': True, 'mensaje': 'Ítem actualizado correctamente.'})
    except Exception as e:
        return JsonResponse({'status': False, 'mensaje': str(e)}, status=400)

@login_custom_required
@require_POST
def api_eliminar_inventario(request: HttpRequest, item_id: int) -> JsonResponse:
    try:
        HerramientasService.eliminar_item_inventario(request.user, item_id)
        return JsonResponse({'status': True, 'mensaje': 'Ítem eliminado del inventario.'})
    except Exception as e:
        return JsonResponse({'status': False, 'mensaje': str(e)}, status=400)

@login_custom_required     
@require_POST
def api_remover_del_carrito(request: HttpRequest) -> JsonResponse:
    """
    API factorizada para remover un ítem del ingreso actual.
    """
    try:
        # 1. Contexto
        ingreso_pendiente = RegistroIngreso.objects.filter(
            visitante=request.user,
            estado=RegistroIngreso.EstadoOpciones.PENDIENTE_HERRAMIENTAS
        ).first()

        if not ingreso_pendiente:
            return JsonResponse({'status': False, 'mensaje': 'No hay ingreso activo.'}, status=403)

        # 2. Datos
        id_inventario = request.POST.get('id_inventario')
        
        # 3. Acción (Delegada al Servicio)
        eliminado = HerramientasService.remover_item_del_carrito(ingreso_pendiente, id_inventario)

        # 4. Respuesta
        if eliminado:
            return JsonResponse({'status': True, 'mensaje': 'Elemento retirado.'})
        else:
            # Si ya no estaba, retornamos éxito igual para que el frontend se actualice tranquilo
            return JsonResponse({'status': True, 'mensaje': 'El elemento ya no estaba en la lista.'})

    except Exception as e:
        # Imprimir error real en consola para debugging
        print(f"🔴 ERROR REMOVER CARRITO: {str(e)}") 
        return JsonResponse({'status': False, 'mensaje': str(e)}, status=400)

@login_custom_required
@require_POST
def api_agregar_carrito(request: HttpRequest) -> JsonResponse:
    """
    API para la selección rápida de herramientas desde el panel lateral.
    
    Funcionalidad:
    1. Verifica que el usuario tenga un ingreso activo (Pendiente Herramientas).
    2. Llama al servicio 'agregar_item_al_carrito' (que ahora es idempotente).
    3. Retorna el OBJETO COMPLETO del ítem para que el Frontend pueda 
       pintar la tarjeta inmediatamente sin mostrar 'undefined'.
    """
    try:
        # 1. Buscamos el contexto: El ingreso activo del usuario
        ingreso_pendiente = RegistroIngreso.objects.filter(
            visitante=request.user,
            estado=RegistroIngreso.EstadoOpciones.PENDIENTE_HERRAMIENTAS
        ).first()

        # Seguridad: Si no hay ingreso activo, rechazar.
        if not ingreso_pendiente:
            return JsonResponse({
                'status': False, 
                'mensaje': 'No se encontró un ingreso activo para asociar la herramienta.'
            }, status=403)

        # 2. Obtenemos el ID enviado por el Frontend
        id_inventario = request.POST.get('id_inventario')
        if not id_inventario:
            return JsonResponse({'status': False, 'mensaje': 'Falta el ID del ítem.'}, status=400)

        # 3. Llamamos al Servicio (Lógica de Negocio)
        # Este método ya maneja internamente si el ítem existe o si hay que reactivarlo.
        registro = HerramientasService.agregar_item_al_carrito(ingreso_pendiente, id_inventario)
        
        # 4. PREPARACIÓN DE DATOS PARA EL FRONTEND (SOLUCIÓN CARD UNDEFINED)
        # El JS necesita todos estos campos para pintar la tarjeta bonita.
        item_inv = registro.herramienta_inventario
        
        # Determinamos la URL de la foto de forma segura
        foto_url = None
        if item_inv.foto_referencia:
            foto_url = item_inv.foto_referencia.url
        
        # Estructura JSON idéntica a la que usa 'api_obtener_inventario'
        item_data_frontend = {
            'id': item_inv.id,
            'nombre': item_inv.nombre,
            'marca': item_inv.marca_serial,     # Mapeamos marca_serial a 'marca'
            'categoria': item_inv.categoria,
            'foto': foto_url,
            'ingresado': True,                  # Flag para que salga el check verde
            'observaciones': registro.observaciones
        }

        # 5. Respuesta Exitosa
        return JsonResponse({
            'status': True, 
            'mensaje': 'Añadido correctamente.',
            'item': item_data_frontend  # <--- CRÍTICO: Enviamos el objeto completo
        })

    except Exception as e:
        # Debugging: Imprimimos el error en la terminal del servidor para verlo claro
        """
        ESTO LO DEBEMOS PASAR A TESTS.PY
        print(f"🔴 ERROR CRÍTICO EN API CARRITO: {str(e)}")
        import traceback
        traceback.print_exc()
        """
        
        return JsonResponse({
            'status': False, 
            'mensaje': f"Error al procesar: {str(e)}"
        }, status=400)  
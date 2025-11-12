# zonascriticas/empresas/views.py
from django.shortcuts import render
from login.decorators import login_custom_required
from django.templatetags.static import static

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.db.models import Q
from django.core.exceptions import ValidationError # ¡Importante!
import json

from .models import Empresa, Cargo, Servicio
from login.models import Usuario

# --- ¡IMPORTAMOS NUESTRO SERVICIO! ---
from . import services 

@login_custom_required
def empresas_view(request):
    """
    Renderiza la plantilla principal de la app 'empresas'.
    (Esta era la función que faltaba y causaba el error)
    """
    imagen_url_por_defecto = static('home/img/logoJoli.png') 

    if request.user.img:
        imagen_a_mostrar = request.user.img.url
    else:
        imagen_a_mostrar = imagen_url_por_defecto
        
    context = {
        'imagen_src': imagen_a_mostrar 
    }
    return render(request, 'empresas.html', context)

@require_http_methods(["GET"])
def empresa_list(request):
    """
    API: Devuelve una lista de todas las empresas.
    Filtra por estado y búsqueda.
    """
    try:
        filtro = request.GET.get('filtro', 'todos')
        busqueda = request.GET.get('busqueda', '')

        empresas = Empresa.objects.prefetch_related('servicios').all()

        if filtro == 'activos':
            empresas = empresas.filter(estado=True)
        elif filtro == 'inactivos':
            empresas = empresas.filter(estado=False)

        if busqueda:
            empresas = empresas.filter(
                Q(nombre_empresa__icontains=busqueda) | 
                Q(nit__icontains=busqueda)
            )

        data = []
        for empresa in empresas:
            servicios = list(empresa.servicios.values_list('nombre_servicio', flat=True))
            data.append({
                'id': empresa.id,
                'nombre_empresa': empresa.nombre_empresa,
                'nit': empresa.nit,
                'direccion': empresa.direccion,
                'contacto': empresa.contacto,
                'estado': empresa.estado,
                'servicios_nombres': ", ".join(servicios),
                # Módulo 5 (Editar): Necesitamos los IDs de servicios
                'servicios': list(empresa.servicios.values_list('id', flat=True)) 
            })

        return JsonResponse({'empresas': data})

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@require_http_methods(["GET"])
def empleado_list(request, empresa_id):
    """
    API: Devuelve los empleados de UNA empresa específica.
    """
    try:
        empleados = Usuario.objects.filter(empresa_id=empresa_id).select_related('cargo')
        
        data = []
        for emp in empleados:
            data.append({
                'id': emp.id,
                'first_name': emp.first_name, 
                'email': emp.email,
                'numero_documento': emp.numero_documento,
                'tipo_documento': emp.tipo_documento,
                'img': emp.img.url if emp.img else None,
                'estado': emp.is_active,
                'cargo': emp.cargo_id, 
                'cargo_nombre': emp.cargo.nombre if emp.cargo else 'Sin cargo',
                'tipo': emp.tipo,
                'tiempo_limite_jornada': emp.tiempo_limite_jornada,
                'nombre_completo': emp.get_full_name(),
                'username': emp.username,
            })
        
        return JsonResponse({'empleados': data})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@require_http_methods(["GET"])
def recursos_list(request):
    """
    API: Devuelve listas de Cargos y Servicios para los Selects.
    """
    try:
        cargos = list(Cargo.objects.values('id', 'nombre'))
        servicios = list(Servicio.objects.values('id', 'nombre_servicio'))
        
        cargos_fmt = [{'id': c['id'], 'text': c['nombre']} for c in cargos]
        servicios_fmt = [{'id': s['id'], 'text': s['nombre_servicio']} for s in servicios]

        return JsonResponse({'cargos': cargos_fmt, 'servicios': servicios_fmt})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@require_http_methods(["POST"])
def update_empleado_estado(request, empleado_id):
    """
    API: Actualiza el estado (activo/inactivo) de un empleado.
    (Esta lógica es simple y no requiere un servicio)
    """
    try:
        data = json.loads(request.body)
        empleado = Usuario.objects.get(pk=empleado_id)
        empleado.is_active = bool(data.get('estado'))
        empleado.save()
        return JsonResponse({'success': True, 'message': 'Estado actualizado'})
    except Usuario.DoesNotExist:
        return JsonResponse({'error': 'Empleado no encontrado'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@require_http_methods(["POST"])
def update_empresa_estado(request, empresa_id):
    """
    API: Actualiza el estado. La lógica está en 'services.py'.
    """
    try:
        data = json.loads(request.body)
        nuevo_estado = bool(data.get('estado'))
        
        empresa = Empresa.objects.get(pk=empresa_id)
        
        # --- LLAMADA AL SERVICIO ---
        mensaje = services.actualizar_estado_empresa(empresa, nuevo_estado) 
        # ---------------------------
        
        return JsonResponse({'success': True, 'message': mensaje})

    except Empresa.DoesNotExist:
        return JsonResponse({'error': 'Empresa no encontrada'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@require_http_methods(["POST"])
def empresa_create(request):
    """
    API: Crea una nueva empresa usando la capa de servicio.
    """
    try:
        data = request.POST.copy()

        nueva_empresa = services.crear_empresa(data)

        # Serialización (aún manual, pero la lógica de creación está en el servicio)
        servicios = list(nueva_empresa.servicios.values_list('nombre_servicio', flat=True))
        empresa_data = {
            'id': nueva_empresa.id,
            'nombre_empresa': nueva_empresa.nombre_empresa,
            'nit': nueva_empresa.nit,
            'direccion': nueva_empresa.direccion,
            'contacto': nueva_empresa.contacto,
            'estado': nueva_empresa.estado,
            'servicios_nombres': ", ".join(servicios),
            'servicios': list(nueva_empresa.servicios.values_list('id', flat=True))
        }

        return JsonResponse({
            'success': True, 
            'message': 'Empresa registrada exitosamente',
            'empresa': empresa_data
        }, status=201)

    except ValidationError as e:
        return JsonResponse({'error': e.message}, status=400) # Error de negocio
    except Exception as e:
        # Manejo de errores (ej. NIT duplicado de la BD)
        if 'UNIQUE constraint failed' in str(e):
            return JsonResponse({'error': 'Ya existe una empresa con ese NIT.'}, status=400)
        return JsonResponse({'error': str(e)}, status=500) # Error del servidor

@require_http_methods(["POST"])
def empresa_update(request, empresa_id):
    """
    API: Actualiza una empresa usando la capa de servicio.
    """
    try:
        empresa = Empresa.objects.get(pk=empresa_id)

        data = request.POST.copy()
        
        empresa_actualizada = services.actualizar_empresa(empresa, data)

        servicios = list(empresa_actualizada.servicios.values_list('nombre_servicio', flat=True))
        empresa_data = {
            'id': empresa_actualizada.id,
            'nombre_empresa': empresa_actualizada.nombre_empresa,
            'nit': empresa_actualizada.nit,
            'direccion': empresa_actualizada.direccion,
            'contacto': empresa_actualizada.contacto,
            'estado': empresa_actualizada.estado,
            'servicios_nombres': ", ".join(servicios),
            'servicios': list(empresa_actualizada.servicios.values_list('id', flat=True)) 
        }
        
        return JsonResponse({
            'success': True, 
            'message': 'Empresa actualizada exitosamente',
            'empresa': empresa_data
        })
        
    except Empresa.DoesNotExist:
        return JsonResponse({'error': 'Empresa no encontrada'}, status=404)
    except ValidationError as e:
        return JsonResponse({'error': e.message}, status=400)
    except Exception as e:
        if 'UNIQUE constraint failed' in str(e):
            return JsonResponse({'error': 'Ya existe una empresa con ese NIT.'}, status=400)
        return JsonResponse({'error': str(e)}, status=500)

@require_http_methods(["POST"])
def empleado_create(request):
    """
    API: Crea un nuevo Empleado usando la capa de servicio.
    """
    try:
        data = request.POST.copy()
        imagen_file = request.FILES.get('imagen_empleado')
        
        services.crear_empleado(data, imagen_file)

        return JsonResponse({
            'success': True, 
            'message': 'Empleado registrado exitosamente'
        }, status=201)
        
    except (Empresa.DoesNotExist, Cargo.DoesNotExist):
        return JsonResponse({'error': 'La empresa o el cargo no existen.'}, status=404)
    except ValidationError as e:
        return JsonResponse({'error': e.message}, status=400) # Errores de duplicidad
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@require_http_methods(["POST"])
def empleado_update(request, empleado_id):
    """
    API: Actualiza un empleado usando la capa de servicio.
    """
    try:
        empleado = Usuario.objects.get(pk=empleado_id)
        data = request.POST.copy()
        imagen_file = request.FILES.get('imagen_empleado')

        services.actualizar_empleado(empleado, data, imagen_file)

        return JsonResponse({
            'success': True, 
            'message': 'Empleado actualizado exitosamente'
        })

    except Usuario.DoesNotExist:
        return JsonResponse({'error': 'Empleado no encontrado.'}, status=404)
    except Cargo.DoesNotExist:
        return JsonResponse({'error': 'El cargo especificado no existe.'}, status=404)
    except ValidationError as e:
        return JsonResponse({'error': e.message}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
# zonascriticas/empresas/views.py
from django.shortcuts import render
from login.decorators import login_custom_required
from django.templatetags.static import static
from django.http import HttpResponse # Para el type hinting
from django.views.decorators.http import require_http_methods
from django.db.models import Q
from django.core.exceptions import ValidationError
import json

from .models import Empresa, Cargo, Servicio
from login.models import Usuario
from . import services 

# --- IMPORTACIÓN DEL NÚCLEO ---
from home.utils import api_response

@login_custom_required
def empresas_view(request):
    """Renderiza la plantilla principal (HTML)."""
    imagen_url_por_defecto = static('home\img\default.png') 
    imagen_a_mostrar = request.user.img.url if request.user.img else imagen_url_por_defecto
        
    context = { 'imagen_src': imagen_a_mostrar }
    return render(request, 'empresas.html', context)

@require_http_methods(["GET"])
def empresa_list(request):
    """API: Devuelve una lista de todas las empresas."""
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
                'servicios': list(empresa.servicios.values_list('id', flat=True)) 
            })

        # Estructura: payload -> { 'empresas': [...] }
        return api_response(data={'empresas': data})

    except Exception as e:
        return api_response(success=False, message=str(e), status_code=500)

@require_http_methods(["GET"])
def empleado_list(request, empresa_id):
    """API: Devuelve los empleados de una empresa."""
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
        
        return api_response(data={'empleados': data})
    except Exception as e:
        return api_response(success=False, message=str(e), status_code=500)

@require_http_methods(["GET"])
def recursos_list(request):
    """API: Devuelve listas de Cargos y Servicios."""
    try:
        cargos = list(Cargo.objects.values('id', 'nombre'))
        servicios = list(Servicio.objects.values('id', 'nombre_servicio'))
        
        cargos_fmt = [{'id': c['id'], 'text': c['nombre']} for c in cargos]
        servicios_fmt = [{'id': s['id'], 'text': s['nombre_servicio']} for s in servicios]

        return api_response(data={'cargos': cargos_fmt, 'servicios': servicios_fmt})
    except Exception as e:
        return api_response(success=False, message=str(e), status_code=500)

@require_http_methods(["POST"])
def update_empleado_estado(request, empleado_id):
    """API: Actualiza estado de empleado."""
    try:
        data = json.loads(request.body)
        empleado = Usuario.objects.get(pk=empleado_id)
        empleado.is_active = bool(data.get('estado'))
        empleado.save()
        return api_response(message='Estado actualizado')
    except Usuario.DoesNotExist:
        return api_response(success=False, message='Empleado no encontrado', status_code=404)
    except Exception as e:
        return api_response(success=False, message=str(e), status_code=500)

@require_http_methods(["POST"])
def update_empresa_estado(request, empresa_id):
    """API: Actualiza estado de empresa."""
    try:
        data = json.loads(request.body)
        nuevo_estado = bool(data.get('estado'))
        
        empresa = Empresa.objects.get(pk=empresa_id)
        mensaje = services.actualizar_estado_empresa(empresa, nuevo_estado) 
        
        return api_response(message=mensaje)

    except Empresa.DoesNotExist:
        return api_response(success=False, message='Empresa no encontrada', status_code=404)
    except Exception as e:
        return api_response(success=False, message=str(e), status_code=500)

@require_http_methods(["POST"])
def empresa_create(request):
    """API: Crea una nueva empresa."""
    try:
        data = request.POST.copy()
        nueva_empresa = services.crear_empresa(data)

        # Serialización manual para devolver el objeto creado
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

        return api_response(
            data={'empresa': empresa_data}, 
            message='Empresa registrada exitosamente', 
            status_code=201
        )

    except ValidationError as e:
        return api_response(success=False, message=e.message, status_code=400)
    except Exception as e:
        if 'UNIQUE constraint failed' in str(e) or 'Duplicate entry' in str(e):
            return api_response(success=False, message='Ya existe una empresa con ese NIT.', status_code=400)
        return api_response(success=False, message=str(e), status_code=500)

@require_http_methods(["POST"])
def empresa_update(request, empresa_id):
    """API: Actualiza una empresa."""
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
        
        return api_response(data={'empresa': empresa_data}, message='Empresa actualizada exitosamente')
        
    except Empresa.DoesNotExist:
        return api_response(success=False, message='Empresa no encontrada', status_code=404)
    except ValidationError as e:
        return api_response(success=False, message=e.message, status_code=400)
    except Exception as e:
        if 'UNIQUE constraint failed' in str(e) or 'Duplicate entry' in str(e):
            return api_response(success=False, message='Ya existe una empresa con ese NIT.', status_code=400)
        return api_response(success=False, message=str(e), status_code=500)

@require_http_methods(["POST"])
def empleado_create(request):
    """API: Crea un nuevo Empleado."""
    try:
        data = request.POST.copy()
        imagen_file = request.FILES.get('imagen_empleado')
        
        services.crear_empleado(data, imagen_file)

        return api_response(message='Empleado registrado exitosamente', status_code=201)
        
    except (Empresa.DoesNotExist, Cargo.DoesNotExist):
        return api_response(success=False, message='La empresa o el cargo no existen.', status_code=404)
    except ValidationError as e:
        return api_response(success=False, message=e.message, status_code=400)
    except Exception as e:
        return api_response(success=False, message=str(e), status_code=500)

@require_http_methods(["POST"])
def empleado_update(request, empleado_id):
    """API: Actualiza un empleado."""
    try:
        empleado = Usuario.objects.get(pk=empleado_id)
        data = request.POST.copy()
        imagen_file = request.FILES.get('imagen_empleado')

        services.actualizar_empleado(empleado, data, imagen_file)

        return api_response(message='Empleado actualizado exitosamente')

    except Usuario.DoesNotExist:
        return api_response(success=False, message='Empleado no encontrado.', status_code=404)
    except Cargo.DoesNotExist:
        return api_response(success=False, message='El cargo especificado no existe.', status_code=404)
    except ValidationError as e:
        return api_response(success=False, message=e.message, status_code=400)
    except Exception as e:
        return api_response(success=False, message=str(e), status_code=500)
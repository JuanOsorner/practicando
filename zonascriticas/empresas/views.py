from django.shortcuts import render
# from django.contrib.auth.decorators import login_required
from login.decorators import login_custom_required
from django.templatetags.static import static

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.db.models import Q
import json

from .models import Empresa, Cargo, Servicio
from login.models import Usuario

@login_custom_required
def empresas_view(request):
    """
    Renderiza la plantilla principal de la app 'empresas'.
    El frontend (JS) se encargará de pedir los datos a la API.
    """

    imagen_url_por_defecto = static('home/img/default.png') 

    # Comprueba si el usuario tiene una imagen en la BD
    if request.user.img:
        imagen_a_mostrar = request.user.img.url
    else:
        imagen_a_mostrar = imagen_url_por_defecto
        
    context = {
        'imagen_src': imagen_a_mostrar 
    }

    # Pasamos el token CSRF explícitamente por si el JS lo necesita
    # aunque 'apiService.js' lo toma del DOM.
    return render(request, 'empresas.html', context)

@require_http_methods(["GET"])
def empresa_list(request):
    """
    API: Devuelve una lista de todas las empresas.
    Filtra por estado y búsqueda.
    """
    try:
        # 1. Obtener parámetros
        filtro = request.GET.get('filtro', 'todos')
        busqueda = request.GET.get('busqueda', '')

        # 2. Query inicial
        empresas = Empresa.objects.prefetch_related('servicios').all()

        # 3. Aplicar filtro de estado
        if filtro == 'activos':
            empresas = empresas.filter(estado=True)
        elif filtro == 'inactivos':
            empresas = empresas.filter(estado=False)

        # 4. Aplicar filtro de búsqueda
        if busqueda:
            empresas = empresas.filter(
                Q(nombre_empresa__icontains=busqueda) | 
                Q(nit__icontains=busqueda)
            )

        # 5. Serializar datos (convertir Modelos a diccionarios)
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
            })

        return JsonResponse({'empresas': data})

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@require_http_methods(["POST"])
def update_empresa_estado(request, empresa_id):
    """
    API: Actualiza el estado (activo/inactivo) de una empresa.
    """
    try:
        data = json.loads(request.body)
        empresa = Empresa.objects.get(pk=empresa_id)
        empresa.estado = bool(data.get('estado'))
        empresa.save()
        return JsonResponse({'success': True, 'message': 'Estado actualizado'})
    except Empresa.DoesNotExist:
        return JsonResponse({'error': 'Empresa no encontrada'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

# --- API DE EMPLEADOS ---

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
                'nombre_completo': emp.get_full_name(),
                'username': emp.username,
                'email': emp.email,
                'numero_documento': emp.numero_documento,
                'img': emp.img.url if emp.img else None,
                'estado': emp.is_active, # Usamos 'is_active' de Django
                'cargo_nombre': emp.cargo.nombre if emp.cargo else None,
                'tiempo_limite_jornada': emp.tiempo_limite_jornada,
            })
        
        return JsonResponse({'empleados': data})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@require_http_methods(["POST"])
def update_empleado_estado(request, empleado_id):
    """
    API: Actualiza el estado (activo/inactivo) de un empleado.
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
        
# --- API de Recursos ---

@require_http_methods(["GET"])
def recursos_list(request):
    """
    API: Devuelve listas de Cargos y Servicios para los Selects.
    """
    try:
        cargos = list(Cargo.objects.values('id', 'nombre'))
        servicios = list(Servicio.objects.values('id', 'nombre_servicio'))
        
        # Formateamos para el multiselect (id, text)
        cargos_fmt = [{'id': c['id'], 'text': c['nombre']} for c in cargos]
        servicios_fmt = [{'id': s['id'], 'text': s['nombre_servicio']} for s in servicios]

        return JsonResponse({'cargos': cargos_fmt, 'servicios': servicios_fmt})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@require_http_methods(["POST"])
def empresa_create(request):
    """
    API: Crea una nueva empresa.
    Recibe datos de un FormData.
    """
    try:
        # 1. Crear la empresa con los datos principales
        # Usamos request.POST porque estamos enviando un FormData
        nueva_empresa = Empresa.objects.create(
            nombre_empresa=request.POST.get('nombre_empresa'),
            nit=request.POST.get('nit'),
            direccion=request.POST.get('direccion'),
            contacto=request.POST.get('contacto'),
            estado=True  # Las nuevas empresas siempre se crean como activas
        )

        # 2. Manejar los servicios (relación ManyToMany)
        # El JS enviará los IDs como 'servicios'
        servicio_ids = request.POST.getlist('servicios')
        if servicio_ids:
            nueva_empresa.servicios.set(servicio_ids)

        # 3. Serializar y devolver la nueva empresa (similar a 'empresa_list')
        servicios = list(nueva_empresa.servicios.values_list('nombre_servicio', flat=True))
        empresa_data = {
            'id': nueva_empresa.id,
            'nombre_empresa': nueva_empresa.nombre_empresa,
            'nit': nueva_empresa.nit,
            'direccion': nueva_empresa.direccion,
            'contacto': nueva_empresa.contacto,
            'estado': nueva_empresa.estado,
            'servicios_nombres': ", ".join(servicios),
        }

        return JsonResponse({
            'success': True, 
            'message': 'Empresa registrada exitosamente',
            'empresa': empresa_data # Devolvemos la nueva empresa
        })

    except Exception as e:
        # Manejo de errores (ej. NIT duplicado)
        return JsonResponse({'error': str(e)}, status=400)

@require_http_methods(["POST"])
def empresa_update(request, empresa_id):
    """
    API: Actualiza una empresa existente.
    Recibe datos de un FormData.
    """
    try:
        # 1. Buscar la empresa existente
        empresa = Empresa.objects.get(pk=empresa_id)

        # 2. Actualizar los campos con los datos del FormData
        empresa.nombre_empresa = request.POST.get('nombre_empresa')
        empresa.nit = request.POST.get('nit')
        empresa.direccion = request.POST.get('direccion')
        empresa.contacto = request.POST.get('contacto')
        
        # 3. Manejar los servicios (relación ManyToMany)
        servicio_ids = request.POST.getlist('servicios')
        if servicio_ids:
            empresa.servicios.set(servicio_ids)
        else:
            # Si no se envía ningún servicio, borramos las relaciones existentes
            empresa.servicios.clear()
            
        empresa.save() # Guarda los cambios en la BD

        # 4. Serializar y devolver la empresa actualizada
        servicios = list(empresa.servicios.values_list('nombre_servicio', flat=True))
        empresa_data = {
            'id': empresa.id,
            'nombre_empresa': empresa.nombre_empresa,
            'nit': empresa.nit,
            'direccion': empresa.direccion,
            'contacto': empresa.contacto,
            'estado': empresa.estado,
            'servicios_nombres': ", ".join(servicios),
            # Incluimos los IDs de servicios para actualizar el panel
            'servicios': list(empresa.servicios.values_list('id', flat=True)) 
        }

        return JsonResponse({
            'success': True, 
            'message': 'Empresa actualizada exitosamente',
            'empresa': empresa_data # Devolvemos la empresa actualizada
        })

    except Empresa.DoesNotExist:
        return JsonResponse({'error': 'Empresa no encontrada'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@require_http_methods(["POST"])
def empleado_create(request):
    """
    API: Crea un nuevo Empleado (Usuario) y lo asocia a una empresa.
    Recibe datos de un FormData.
    """
    try:
        # 1. Obtener datos del FormData
        data = request.POST
        
        empresa_id = data.get('id_empresa')
        cargo_id = data.get('cargo')
        email = data.get('email')
        numero_documento = data.get('numero_documento')

        # Verificamos si ya existe un usuario con ese email o documento
        if Usuario.objects.filter(email=email).exists():
            return JsonResponse({'error': 'Ya existe un usuario con este correo.'}, status=400)
        if Usuario.objects.filter(numero_documento=numero_documento).exists():
            return JsonResponse({'error': 'Ya existe un usuario con este documento.'}, status=400)

        # 2. Obtener objetos relacionados
        empresa = Empresa.objects.get(pk=empresa_id)
        cargo = Cargo.objects.get(pk=cargo_id) if cargo_id else None

        # 3. Crear el nuevo Usuario
        # Usamos el email como username y el documento como contraseña inicial
        nuevo_empleado = Usuario.objects.create(
            email=email,
            numero_documento=numero_documento,
            # 'first_name' (modelo) = 'nombre' (columna BD)
            first_name=data.get('first_name'), 
            tipo_documento=data.get('tipo_documento'),
            tiempo_limite_jornada=data.get('tiempo_limite_jornada') or None,
            empresa=empresa,
            cargo=cargo,
            tipo='Usuario', # 'tipo' es el campo de la BD
            is_active=True  # 'is_active' (modelo) = 'estado' (columna BD)
        )

        # 4. Asignar el resto de los campos
        nuevo_empleado.first_name = data.get('first_name')
        nuevo_empleado.last_name = data.get('last_name')
        nuevo_empleado.numero_documento = numero_documento
        nuevo_empleado.tipo_documento = data.get('tipo_documento')
        nuevo_empleado.tiempo_limite_jornada = data.get('tiempo_limite_jornada') or None
        
        # Asignar la imagen (si se subió)
        if 'imagen_empleado' in request.FILES:
            nuevo_empleado.img = request.FILES['imagen_empleado']

        # Asignar relaciones
        nuevo_empleado.empresa = empresa
        nuevo_empleado.cargo = cargo
        nuevo_empleado.tipo = 'Usuario' # Por defecto es 'Usuario'
        nuevo_empleado.is_active = True # Lo creamos activo
        
        nuevo_empleado.save()

        # 5. Devolver una respuesta de éxito
        return JsonResponse({
            'success': True, 
            'message': 'Empleado registrado exitosamente'
        })

    except Empresa.DoesNotExist:
        return JsonResponse({'error': 'La empresa especificada no existe.'}, status=404)
    except Cargo.DoesNotExist:
        return JsonResponse({'error': 'El cargo especificado no existe.'}, status=404)
    except Exception as e:
        # Manejo de otros errores (ej. campos únicos, etc.)
        return JsonResponse({'error': str(e)}, status=400)
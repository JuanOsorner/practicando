# Creamos esta capa de servicios para manejar la logica de negocio extensa de esta app

# zonascriticas/empresas/services.py

from django.db import transaction
from django.core.exceptions import ValidationError
from .models import Empresa, Cargo, Servicio
from login.models import Usuario

# --- LÓGICA DE EMPRESAS ---

# El decorador @transaction.atomic crea un bloque atomico de operaciones CRUD

@transaction.atomic
def crear_empresa(data: dict) -> Empresa:
    """
    Crea una nueva empresa y asigna sus servicios.
    'data' es un diccionario que contiene los datos validados.
    """
    servicio_ids = data.pop('servicios', [])
    
    # Creamos la empresa con los datos restantes
    # Usamos **data para desempaquetar el diccionario
    nueva_empresa = Empresa.objects.create(
        nombre_empresa=data.get('nombre_empresa'),
        nit=data.get('nit'),
        direccion=data.get('direccion'),
        contacto=data.get('contacto'),
        estado=True  # Regla de negocio: siempre activa al crear
    )

    if servicio_ids:
        nueva_empresa.servicios.set(servicio_ids)

    return nueva_empresa

@transaction.atomic
def actualizar_empresa(empresa: Empresa, data: dict) -> Empresa:
    """
    Actualiza una empresa existente y sus servicios.
    """
    servicio_ids = data.pop('servicios', None)

    # Actualizar campos principales
    empresa.nombre_empresa = data.get('nombre_empresa', empresa.nombre_empresa)
    empresa.nit = data.get('nit', empresa.nit)
    empresa.direccion = data.get('direccion', empresa.direccion)
    empresa.contacto = data.get('contacto', empresa.contacto)
    
    if servicio_ids is not None:
        empresa.servicios.set(servicio_ids)
        
    empresa.save()
    return empresa

@transaction.atomic
def actualizar_estado_empresa(empresa: Empresa, nuevo_estado: bool) -> str:
    """
    Actualiza el estado de una empresa y aplica la lógica
    de negocio en cascada a sus empleados.
    """
    if empresa.estado == nuevo_estado:
        return f"La empresa ya estaba {'activa' if nuevo_estado else 'inactiva'}."

    empresa.estado = nuevo_estado
    empresa.save()

    if nuevo_estado is False:
        # Regla de negocio 1: Desactivar empresa desactiva empleados.
        empleados_afectados_count = empresa.empleados.update(is_active=False)
        return f'Empresa desactivada. {empleados_afectados_count} empleado(s) han sido desactivados.'
    else:
        # Regla de negocio 2: Reactivar empresa NO reactiva empleados.
        return 'Empresa activada. Los empleados permanecen en su estado actual.'

# --- LÓGICA DE EMPLEADOS ---

def _validar_datos_unicos_empleado(email: str, numero_documento: str, empleado_id: int = None):
    """
    Servicio interno para validar unicidad de email y documento.
    Levanta un ValidationError si los datos ya existen.
    """
    query_email = Usuario.objects.filter(email=email)
    query_doc = Usuario.objects.filter(numero_documento=numero_documento)
    
    # Si estamos actualizando (empleado_id no es None), excluimos al propio empleado
    if empleado_id:
        query_email = query_email.exclude(pk=empleado_id)
        query_doc = query_doc.exclude(pk=empleado_id)

    if query_email.exists():
        raise ValidationError('Ya existe un usuario con este correo.')
    if query_doc.exists():
        raise ValidationError('Ya existe un usuario con este documento.')

@transaction.atomic
def crear_empleado(data: dict, imagen_file=None) -> Usuario:
    """
    Crea un nuevo empleado (Usuario) y lo asocia a una empresa.
    """
    empresa_id = data.get('id_empresa')
    cargo_id = data.get('cargo')
    email = data.get('email')
    numero_documento = data.get('numero_documento')

    # 1. Validar unicidad
    _validar_datos_unicos_empleado(email, numero_documento)
    
    # 2. Obtener instancias relacionadas (levantará DoesNotExist si falla)
    empresa = Empresa.objects.get(pk=empresa_id)
    cargo = Cargo.objects.get(pk=cargo_id) if cargo_id else None

    # 3. Crear el objeto
    nuevo_empleado = Usuario.objects.create(
        email=email,
        numero_documento=numero_documento,
        first_name=data.get('first_name'),
        tipo_documento=data.get('tipo_documento'),
        tiempo_limite_jornada=data.get('tiempo_limite_jornada') or None,
        empresa=empresa,
        cargo=cargo,
        tipo=data.get('tipo', 'Usuario'),
        is_active=True # Regla de negocio: siempre activo al crear
    )

    # 4. Asignar imagen si existe
    if imagen_file:
        nuevo_empleado.img = imagen_file
        nuevo_empleado.save()

    return nuevo_empleado

@transaction.atomic
def actualizar_empleado(empleado: Usuario, data: dict, imagen_file=None) -> Usuario:
    """
    Actualiza un empleado existente.
    """
    email = data.get('email')
    numero_documento = data.get('numero_documento')

    # 1. Validar unicidad (excluyendo al empleado actual)
    _validar_datos_unicos_empleado(email, numero_documento, empleado_id=empleado.id)
    
    # 2. Obtener instancias relacionadas
    cargo_id = data.get('cargo')
    cargo = Cargo.objects.get(pk=cargo_id) if cargo_id else None

    # 3. Actualizar campos
    empleado.first_name = data.get('first_name')
    empleado.email = email
    empleado.numero_documento = numero_documento
    empleado.tipo_documento = data.get('tipo_documento')
    empleado.tipo = data.get('tipo')
    empleado.tiempo_limite_jornada = data.get('tiempo_limite_jornada') or None
    empleado.cargo = cargo
    
    if imagen_file:
        empleado.img = imagen_file

    empleado.save()
    return empleado
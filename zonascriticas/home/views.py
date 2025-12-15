"""
zonascriticas\home\views.py

Descripción: Esta vista es nuestro enrutador global. Hace una redireccion siguiendo
la logica del negocio 

requerimientos:

-> Si el usuario es tipo adminsitrador le hace redireccion a perfil
-> Si el usuario en la base de datos 

"""
from django.shortcuts import render, redirect
from django.http import HttpRequest, HttpResponse
from login.decorators import login_custom_required
from descargo_responsabilidad.models import RegistroIngreso 

@login_custom_required
def home_view(request: HttpRequest) -> HttpResponse:
    """
    Router Central: Decide a dónde va el usuario según su estado actual.

    args: request

    returns: HttpResponse
    """
    user = request.user

    # 1. ADMIN -> Perfil / Panel Admin
    if user.tipo == 'Administrador' or user.is_staff:
        return redirect('perfil')

    # 2. PENDIENTE HERRAMIENTAS (Prioridad Alta)
    # Si tiene herramientas pendientes, no puede hacer nada más.
    if RegistroIngreso.objects.filter( 
        visitante=user, 
        estado=RegistroIngreso.EstadoOpciones.PENDIENTE_HERRAMIENTAS 
    ).exists(): # Verifica si existe el usuario con esas condiciones
    # Observacion tecnica: Se usa exists dado que es menos costoso que usar count 
        return redirect('registro_herramientas_view')

    # 3. EN ZONA (Usuario ya ingresado y activo)
    # Usamos select_related para optimizar la consulta de la ubicación
    ingreso_activo = RegistroIngreso.objects.select_related('ubicacion').filter(
        visitante=user,
        estado=RegistroIngreso.EstadoOpciones.EN_ZONA
    ).first() 

    if ingreso_activo:
        # A. Modalidad de Trabajo -> Tablero Actividades
        if ingreso_activo.modalidad in [
            RegistroIngreso.ModalidadOpciones.CON_EQUIPOS, 
            RegistroIngreso.ModalidadOpciones.SOLO_ACTIVIDADES
        ]:
            return redirect('actividades_view')
        
        # B. Modalidad Visita -> Pantalla de espera/salida (Template Nuevo)
        return render(request, 'modo_visita.html', {'ingreso': ingreso_activo})

    # 4. LIBRE -> Escáner QR Principal
    return redirect('responsabilidad')
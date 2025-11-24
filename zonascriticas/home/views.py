# zonascriticas/home/views.py

from django.shortcuts import render, redirect
from django.http import HttpRequest, HttpResponse
from login.decorators import login_custom_required
from descargo_responsabilidad.models import RegistroIngreso 

@login_custom_required
def home_view(request: HttpRequest) -> HttpResponse:
    """
    Aiguilleur (Enrutador Central).
    Decide a dónde va el usuario según su estado en la Base de Datos.
    """
    user = request.user 

    # 1. CAMINO DEL ADMINISTRADOR
    # Los admins tienen su propio dashboard en 'perfil'
    if user.tipo == 'Administrador' or user.is_staff:
        return redirect('perfil')

    # 2. CAMINO DEL USUARIO: Verificar Estados Pendientes (Prioridad Alta)
    
    # A. ¿Tiene herramientas pendientes por registrar?
    ingreso_pendiente_herramientas = RegistroIngreso.objects.filter(
        visitante=user,
        estado=RegistroIngreso.EstadoOpciones.PENDIENTE_HERRAMIENTAS
    ).first()

    if ingreso_pendiente_herramientas:
        # Redirección forzosa a la App de Herramientas
        return redirect('registro_herramientas_view')

    # B. (FUTURO) ¿Tiene actividades pendientes?
    # Aquí pondremos la redirección a registro_actividades cuando la creemos.
    # if estado == PENDIENTE_ACTIVIDADES: return redirect(...)

    # 3. CAMINO DEL USUARIO: Verificar si ya está adentro (Prioridad Media)
    ingreso_activo = RegistroIngreso.objects.filter(
        visitante=user,
        estado=RegistroIngreso.EstadoOpciones.EN_ZONA
    ).first()

    if ingreso_activo:
        # --- USUARIO YA ESTÁ ADENTRO ---
        # Mostramos el Dashboard Operativo (Temporalmente un HTML)
        # Cuando hagamos la app de Salida, aquí redirigiremos a 'salida_dashboard'
        
        nombre_zona = ingreso_activo.ubicacion.nombre
        
        html_temporal = f"""
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>En Zona - JoliFoods</title>
            <style>
                body {{ font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f4f6f9; }}
                .card {{ background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }}
                h1 {{ color: #352460; margin-bottom: 10px; }}
                .badge {{ background: #2ecc71; color: white; padding: 5px 10px; border-radius: 15px; font-size: 0.9em; }}
                .zone-name {{ font-size: 1.5em; font-weight: bold; color: #333; margin: 20px 0; display: block; }}
            </style>
        </head>
        <body>
            <div class="card">
                <h1>Estado Actual</h1>
                <span class="badge">ACTIVO</span>
                <p>Hola <strong>{user.first_name}</strong>, el sistema registra que te encuentras trabajando en:</p>
                <span class="zone-name">{nombre_zona}</span>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #666; font-size: 0.9em;">
                    Para reportar tu salida, por favor espera a que el módulo de <b>Control de Salidas</b> esté habilitado.
                </p>
            </div>
        </body>
        </html>
        """
        return HttpResponse(html_temporal)

    # 4. CAMINO DEL USUARIO: Usuario Libre (Prioridad Baja)
    # No tiene ingresos activos ni pendientes -> Lo mandamos a escanear QR
    return redirect('responsabilidad')
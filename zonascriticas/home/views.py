# zonascriticas/home/views.py

from django.shortcuts import render, redirect
from django.http import HttpRequest, HttpResponse
from login.decorators import login_custom_required
from descargo_responsabilidad.models import RegistroIngreso 

@login_custom_required
def home_view(request: HttpRequest) -> HttpResponse:
    """
    Aiguilleur (Enrutador Central Inteligente).
    """
    user = request.user

    # 1. ADMIN
    if user.tipo == 'Administrador' or user.is_staff:
        return redirect('perfil')

    # 2. PENDIENTE HERRAMIENTAS (Prioridad Alta)
    ingreso_pendiente = RegistroIngreso.objects.filter(
        visitante=user,
        estado=RegistroIngreso.EstadoOpciones.PENDIENTE_HERRAMIENTAS
    ).first()

    if ingreso_pendiente:
        return redirect('registro_herramientas_view')

    # 3. EN ZONA (Usuario trabajando)
    ingreso_activo = RegistroIngreso.objects.filter(
        visitante=user,
        estado=RegistroIngreso.EstadoOpciones.EN_ZONA
    ).first()

    if ingreso_activo:
        # --- LÓGICA DE REDIRECCIÓN INTELIGENTE ---
        # Si su modalidad implica trabajo (Equipos o Actividades), 
        # el Dashboard natural es el tablero de Actividades.
        if ingreso_activo.modalidad in [
            RegistroIngreso.ModalidadOpciones.CON_EQUIPOS, 
            RegistroIngreso.ModalidadOpciones.SOLO_ACTIVIDADES
        ]:
            return redirect('actividades_view')
        
        # Si es VISITA, mostramos el panel de salida (que haremos luego)
        # Por ahora mostramos el HTML temporal pero con un botón de salida
        # Ojo: Para producción esto debe ser un template real
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
                .btn-salida {{ display:block; width:100%; padding:15px; background:#c0392b; color:white; text-decoration:none; border-radius:8px; margin-top:20px; font-weight:bold; }}
            </style>
        </head>
        <body>
            <div class="card">
                <h1>Modo Visita Activo</h1>
                <p>Estás registrado en: <strong>{ingreso_activo.ubicacion.nombre}</strong></p>
                <p>Tu modalidad es solo visita. No tienes actividades pendientes.</p>
                <button onclick="cerrarVisita()" class="btn-salida">Finalizar Visita</button>
            </div>
            <script>
                // Script temporal para salir
                async function cerrarVisita() {{
                    if(!confirm('¿Salir de la zona?')) return;
                    try {{
                        // Usamos fetch nativo por simplicidad en este HTML string
                        const res = await fetch('/responsabilidad/api/salida/', {{
                            method: 'POST',
                            headers: {{ 'X-CSRFToken': '{request.COOKIES.get("csrftoken")}' }}
                        }});
                        if(res.ok) window.location.reload();
                        else alert('Error al salir');
                    }} catch(e) {{ alert(e); }}
                }}
            </script>
        </body>
        </html>
        """
        return HttpResponse(html_temporal)

    # 4. LIBRE (Escanear QR)
    return redirect('responsabilidad')
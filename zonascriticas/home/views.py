from django.shortcuts import render, redirect
from django.http import HttpRequest, HttpResponse
from login.decorators import login_custom_required
# Importamos el modelo para poder preguntar el estado
from descargo_responsabilidad.models import RegistroIngreso 

@login_custom_required
def home_view(request: HttpRequest) -> HttpResponse:
    """
    Aiguilleur (Enrutador) Inteligente.
    """
    user = request.user 

    # 1. CAMINO DEL ADMINISTRADOR
    if user.tipo == 'Administrador' or user.is_staff:
        return redirect('perfil')

    # 2. CAMINO DEL USUARIO
    # Buscamos si tiene un ingreso activo (estado='En Zona')
    ingreso_activo = RegistroIngreso.objects.filter(
        visitante=user,
        estado=RegistroIngreso.EstadoOpciones.EN_ZONA
    ).first()

    if ingreso_activo:
        # --- CASO A: USUARIO OCUPADO (YA ESTÁ ADENTRO) ---
        # Aquí redirigiremos a las futuras apps. 
        # Por ahora, mostramos un mensaje de éxito técnico.
        
        nombre_zona = ingreso_activo.ubicacion.nombre
        
        html_temporal = f"""
        <div style='font-family: sans-serif; text-align: center; padding: 20px;'>
            <h1>🚧 EN ZONA CRÍTICA 🚧</h1>
            <p>Hola <strong>{user.first_name}</strong>.</p>
            <p>El sistema detecta que estás dentro de: <br>
               <b style='font-size: 1.5em; color: red;'>{nombre_zona}</b>
            </p>
            <hr>
            <p>Aquí cargaremos pronto el módulo de <b>Registro de Herramientas</b> o <b>Salida</b>.</p>
            <p><i>(Lógica de redirección: FUNCIONANDO ✅)</i></p>
        </div>
        """
        return HttpResponse(html_temporal)

    else:
        # --- CASO B: USUARIO LIBRE ---
        # No tiene ingresos activos, lo mandamos a escanear.
        return redirect('responsabilidad')
"""
zonascriticas/login/views.py

Vistas del módulo de autenticación.

Este archivo contiene las vistas responsables de:

- Mostrar la página de login.
- Gestionar el cierre de sesión.
- Procesar el inicio de sesión vía API (AJAX / fetch).

La vista de login implementa una **arquitectura por fases**, donde la seguridad
se evalúa antes de procesar cualquier dato sensible, integrándose con el
mecanismo de rate limiting escalonado definido en ``SecurityJail``.

Principios aplicados
--------------------
- *Fail fast*: se bloquea la petición antes de leer datos si la IP está penalizada.
- *Security first*: protección CSRF y control de abuso por IP.
- *Stateless auth lógica*: autenticación manual basada en sesión.
- *Mensajes controlados*: respuestas JSON consistentes para frontend.

Escrito por Juan Esteban Osorno Duque 😎
"""

from django.http import JsonResponse, HttpRequest, HttpResponse
from django.shortcuts import render, redirect
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_protect

from .models import Usuario
from .utils import SecurityJail


# ----------------------------------------------------------------------
# Vistas públicas
# ----------------------------------------------------------------------

def mostrar_login(request: HttpRequest) -> HttpResponse:
    """
    Renderiza la plantilla de inicio de sesión.

    Esta vista únicamente presenta el formulario de login y no
    contiene lógica de autenticación.

    Parameters
    ----------
    request : HttpRequest
        Petición HTTP entrante.

    Returns
    -------
    HttpResponse
        Renderizado de la plantilla ``login.html``.
    """
    return render(request, "login.html")


def logout_view(request: HttpRequest) -> HttpResponse:
    """
    Cierra la sesión del usuario autenticado.

    Implementación manual del logout, eliminando completamente
    la sesión activa mediante ``flush``.

    Notas
    -----
    - ``flush`` elimina todos los datos de sesión y genera una nueva clave.
    - El ``try/except`` evita errores en casos de sesión corrupta o inexistente.

    Parameters
    ----------
    request : HttpRequest
        Petición HTTP entrante.

    Returns
    -------
    HttpResponse
        Redirección a la vista de login.
    """
    try:
        request.session.flush()
    except Exception:
        # Fallo silencioso: no exponemos detalles de sesión
        pass

    return redirect("login")


# ----------------------------------------------------------------------
# API de autenticación
# ----------------------------------------------------------------------

@require_POST
@csrf_protect
def login_api(request: HttpRequest) -> JsonResponse:
    """
    Endpoint de autenticación vía POST.

    Esta vista procesa el inicio de sesión en **cuatro fases claramente
    diferenciadas**:

    1. **Seguridad**: verificación de bloqueo por IP (rate limiting).
    2. **Validación**: lectura y validación de datos de entrada.
    3. **Autenticación**: búsqueda y validación del usuario.
    4. **Post-login**: saneamiento y creación de sesión.

    La respuesta se devuelve siempre en formato JSON para facilitar
    la integración con clientes frontend.

    Parameters
    ----------
    request : HttpRequest
        Petición HTTP POST con los datos de login.

    Returns
    -------
    JsonResponse
        Resultado del proceso de autenticación.
    """

    # --------------------------------------------------------------
    # 1. FASE DE SEGURIDAD: control de abuso por IP
    # --------------------------------------------------------------
    puede_pasar, mensaje_error = SecurityJail.verificar_acceso(request)
    if not puede_pasar:
        # 429 Too Many Requests
        return JsonResponse(
            {"status": False, "mensaje": mensaje_error},
            status=429,
        )

    # --------------------------------------------------------------
    # 2. FASE DE VALIDACIÓN: lectura de datos
    # --------------------------------------------------------------
    documento = request.POST.get("documento", "").strip()

    if not documento:
        return JsonResponse(
            {"status": False, "mensaje": "Documento no proporcionado."},
            status=400,
        )

    # --------------------------------------------------------------
    # 3. FASE DE AUTENTICACIÓN
    # --------------------------------------------------------------
    try:
        user = Usuario.objects.get(numero_documento=documento)

    except Usuario.DoesNotExist:
        # El documento no existe: posible enumeración o fuerza bruta
        SecurityJail.registrar_fallo(request)

        # 404 o 401 según la política de ocultamiento
        return JsonResponse(
            {
                "status": False,
                "mensaje": "El documento no se encuentra registrado.",
            },
            status=404,
        )

    if not user.is_active:
        # Usuario válido pero inactivo (no se considera ataque)
        return JsonResponse(
            {"status": False, "mensaje": "Usuario inactivo."},
            status=403,
        )

    # --------------------------------------------------------------
    # 4. FASE DE ÉXITO: gestión segura de sesión
    # --------------------------------------------------------------
    # Limpiamos cualquier sesión previa
    if request.session.get("id_usuario_logueado"):
        request.session.flush()

    # Protección contra session fixation
    if not request.session.session_key:
        request.session.create()
    else:
        request.session.cycle_key()

    # Persistimos el identificador del usuario
    request.session["id_usuario_logueado"] = user.id

    # Tiempo de vida de la sesión (24h)
    request.session.set_expiry(86400)

    return JsonResponse(
        {"status": True, "mensaje": "Inicio de sesión exitoso."}
    )

# reporting/views.py

# --- Importaciones de Django ---
from django.http import HttpResponse, HttpRequest, Http404
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
# from django.contrib.auth.decorators import login_required # Decorador comentado

# --- Importaciones de nuestra App ---
from . import services  # Importamos el módulo de servicios que desacopla la lógica


# @login_required  # <-- Esto solo cuando lo usemos en realidad
def send_report_view(request: HttpRequest, user_id: int) -> HttpResponse:
    """
    Vista de orquestación (SIN SEGURIDAD) para generar y enviar un reporte en PDF.

    1. Obtiene los datos del usuario (Modelo).
    2. Llama al servicio de generación de PDF (Renderizado HTML + xhtml2pdf).
    3. Llama al servicio de envío de correo (Django Mail).
    4. Devuelve una respuesta al cliente.
    """

    # --- 1. Obtención y Verificación de Datos ---
    try:
        # Usamos get_object_or_404 para manejar elegantemente un ID no existente
        user_to_report = get_object_or_404(User, pk=user_id)
    except Http404:
        return HttpResponse(f"Error: Usuario con id {user_id} no encontrado.", status=404)

    # --- Paso 2: Verificación de permisos comentada ---
    # if not request.user.is_staff and request.user.id != user_to_report.id:
    #      return HttpResponse("Acceso denegado: No tienes permiso para esta acción.", status=403)


    # --- 2. Definición del Contexto (Datos para la plantilla) ---
    # En una aplicación real, estos datos vendrían de consultas a la base de datos.
    report_data_context = {
        'user': user_to_report,
        'data_list': [
            {'name': 'Inicios de sesión (mes)', 'value': 15},
            {'name': 'Documentos subidos (mes)', 'value': 3},
            {'name': 'Proyectos activos', 'value': 1},
        ]
    }
    
    # Definimos las variables para nuestros servicios
    template_path = 'pdfs_django/pdfs_django.html'
    subject = f"Tu reporte de actividad, {user_to_report.username}"
    body = "Adjunto encontrarás tu reporte mensual en formato PDF."
    recipient_email = user_to_report.email
    attachment_name = f"reporte_{user_to_report.username}.pdf"

    # --- 3. Orquestación de Servicios (El trabajo real) ---
    try:
        # Paso 3a: Generar el PDF en memoria (llama a services.py)
        print(f"[Vista] Generando PDF para {recipient_email}...")
        pdf_bytes = services.generate_pdf_from_template(
            template_path=template_path,
            context=report_data_context
        )

        if not pdf_bytes:
            print(f"[Vista] ERROR: services.generate_pdf_from_template devolvió None.")
            return HttpResponse("Error interno: No se pudo generar el PDF.", status=500)

        # Paso 3b: Enviar el correo con el PDF adjunto (llama a services.py)
        print(f"[Vista] PDF generado. Enviando correo a {recipient_email}...")
        services.send_pdf_by_email(
            pdf_bytes=pdf_bytes,
            subject=subject,
            body=body,
            to_email=recipient_email,
            attachment_name=attachment_name
        )

        # --- 4. Respuesta Exitosa al Usuario ---
        print(f"[Vista] Proceso completado exitosamente para {recipient_email}.")
        return HttpResponse(f"Reporte enviado exitosamente a {user_to_report.email}")

    except Exception as e:
        # Captura de errores generales (ej. fallo de conexión SMTP, error de permisos)
        print(f"[Vista] ERROR FATAL en el proceso: {e}")
        return HttpResponse(f"Ocurrió un error inesperado durante el envío: {e}", status=500)
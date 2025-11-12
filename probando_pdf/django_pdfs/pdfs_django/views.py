# pdfs_django/views.py

from django.http import HttpResponse, HttpRequest, Http404
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from . import services

# ... (comentarios de arquitectura) ...

# @login_required
def send_report_view(request: HttpRequest, user_id: int) -> HttpResponse:
    
    # --- 1. Obtención y Verificación de Datos ---
    try:
        user_to_report = get_object_or_404(User, pk=user_id)
    except Http404:
        return HttpResponse(f"Error: Usuario con id {user_id} no encontrado.", status=404)

    # ... (verificación de permisos comentada) ...

    # --- 2. Definición del Contexto (Datos para la plantilla) ---
    report_data_context = {
        'user': user_to_report,
        'data_list': [
            {'name': 'Inicios de sesión (mes)', 'value': 15},
            {'name': 'Documentos subidos (mes)', 'value': 3},
            {'name': 'Proyectos activos', 'value': 1},
        ]
    }
    
    template_path = 'pdfs_django/pdfs_django.html'
    subject = f"Tu reporte de actividad, {user_to_report.username}"
    body = "Adjunto encontrarás tu reporte mensual en formato PDF."
    recipient_email = user_to_report.email
    # Usaremos este nombre de archivo para AMBAS funciones
    attachment_name = f"reporte_{user_to_report.username}.pdf" 

    # --- 3. Orquestación de Servicios (El trabajo real) ---
    try:
        # Paso 3a: Generar el PDF en memoria
        print(f"[Vista] Generando PDF para {recipient_email}...")
        pdf_bytes = services.generate_pdf_from_template(
            template_path=template_path,
            context=report_data_context
        )

        if not pdf_bytes:
            print(f"[Vista] ERROR: services.generate_pdf_from_template devolvió None.")
            return HttpResponse("Error interno: No se pudo generar el PDF.", status=500)

        
        # --- ¡NUEVA LÍNEA AÑADIDA! ---
        # Paso 3b: Guardar el PDF directamente en la carpeta 'sent_emails'
        print(f"[Vista] Guardando PDF en la carpeta local...")
        services.save_pdf_to_local_folder(
            pdf_bytes=pdf_bytes,
            filename=attachment_name,
            folder_name="sent_emails" # Coincide con la carpeta del .eml
        )
        # -----------------------------


        # Paso 3c: "Enviar" el correo (que lo guarda como .eml en 'sent_emails')
        print(f"[Vista] PDF generado. Enviando correo (filebased) a {recipient_email}...")
        services.send_pdf_by_email(
            pdf_bytes=pdf_bytes,
            subject=subject,
            body=body,
            to_email=recipient_email,
            attachment_name=attachment_name
        )

        # --- 4. Respuesta Exitosa al Usuario ---
        print(f"[Vista] Proceso completado exitosamente para {recipient_email}.")
        # Mensaje de éxito actualizado
        return HttpResponse(f"Reporte enviado (guardado en .eml) y PDF guardado localmente en 'sent_emails'.")

    except Exception as e:
        print(f"[Vista] ERROR FATAL en el proceso: {e}")
        return HttpResponse(f"Ocurrió un error inesperado durante el envío: {e}", status=500)
# core/views.py

# No usamos render aqui porque no vamos a renderizar html
from django.http import HttpResponse
from django.template.loader import get_template
from django.core.mail import EmailMessage
from django.conf import settings

import io
from xhtml2pdf import pisa


def generar_y_enviar_pdf(request):
    """
    Una vista para generar, adjuntar y enviar un PDF usando xhtml2pdf.
    """
    print("Iniciando proceso de generación de PDF (con xhtml2pdf)...")

    try:
        # 1. Preparar el contexto (Igual que antes)
        context = {
            'nombre': 'Usuario Final',
            'order_id': '123-ABC'
        }

        # 2. Renderizar el HTML a un string (Igual que antes)
        template = get_template('reporte.html')
        html_string = template.render(context)

        # 3. Generar el PDF en memoria con xhtml2pdf
        print("Generando PDF...")

        # --- INICIO DE CAMBIOS ---
        # xhtml2pdf necesita un "archivo" donde escribir,
        # así que creamos un buffer de bytes en memoria.
        result_buffer = io.BytesIO()

        # Llamamos a la función de pisa para crear el PDF
        pisa_status = pisa.CreatePDF(
            html_string,              # El string HTML
            dest=result_buffer        # El archivo de destino (en memoria)
        )

        # Verificamos si hubo un error
        if pisa_status.err:
            return HttpResponse(f"Error al generar PDF: {pisa_status.err}", status=500)

        # Obtenemos los bytes del PDF desde el buffer
        pdf_binario = result_buffer.getvalue()
        result_buffer.close()
        # --- FIN DE CAMBIOS ---
        
        # 4. Preparar el correo (Igual que antes)
        print("Configurando correo...")
        subject = "¡Aquí está tu reporte PDF!"
        body = "Hola, adjuntamos el reporte que solicitaste."
        from_email = settings.DEFAULT_FROM_EMAIL
        to_email = [settings.DEFAULT_FROM_EMAIL] 

        # 5. Crear la instancia del correo y adjuntar el PDF (Igual que antes)
        email = EmailMessage(
            subject=subject,
            body=body,
            from_email=from_email,
            to=to_email
        )
        
        email.attach(
            filename="reporte_123.pdf",
            content=pdf_binario,
            mimetype="application/pdf"
        )

        # 6. Enviar (Igual que antes)
        print("Enviando correo...")
        email.send()
        
        print("¡Proceso completado con éxito!")
        return HttpResponse("PDF generado y enviado (xhtml2pdf). Revisa tu correo.")

    except Exception as e:
        print(f"Error: {e}")
        return HttpResponse(f"Ocurrió un error: {e}", status=500)
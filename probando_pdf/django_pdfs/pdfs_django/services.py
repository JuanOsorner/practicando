# reporting/services.py
import io
from django.template.loader import render_to_string
from django.core.mail import EmailMessage
from django.conf import settings
from xhtml2pdf import pisa  # Importamos la librería clave

def generate_pdf_from_template(template_path: str, context: dict) -> bytes:
    """
    Renderiza una plantilla de Django a HTML y la convierte en un PDF en memoria.

    :param template_path: Ruta a la plantilla de Django (ej. 'reporting/my_pdf_template.html')
    :param context: Diccionario de contexto para la plantilla.
    :return: Los bytes del PDF generado.
    """
    # 1. Renderizar la plantilla HTML
    html_string = render_to_string(template_path, context)
    
    # 2. Crear un buffer de bytes en memoria para el PDF
    result = io.BytesIO()

    # 3. Generar el PDF
    # pisa.CreatePDF necesita el HTML (string o bytes) y el archivo de salida (el buffer)
    pdf = pisa.CreatePDF(
        src=html_string,
        dest=result,
        encoding='UTF-8'
    )

    # 4. Verificar si la creación fue exitosa
    if not pdf.err:
        # Devolver el contenido del buffer
        return result.getvalue()
    
    # Si hay un error, pisa.CreatePDF devuelve False y 'pdf.err' tiene el detalle
    # En una aplicación real, deberíamos loggear este error
    print(f"Error al generar PDF: {pdf.err}")
    return None

def send_pdf_by_email(
    pdf_bytes: bytes, 
    subject: str, 
    body: str, 
    to_email: str, 
    attachment_name: str = "documento.pdf"
):
    """
    Envía un correo con el PDF (en bytes) como adjunto.
    """
    if not pdf_bytes:
        print("No se enviará el correo, los bytes del PDF están vacíos.")
        return

    # 1. Crear el objeto de correo
    email = EmailMessage(
        subject=subject,
        body=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[to_email]
    )

    # 2. Adjuntar el PDF
    # (nombre_archivo, contenido, tipo_mime)
    email.attach(attachment_name, pdf_bytes, 'application/pdf')

    # 3. Enviar el correo
    email.send(fail_silently=False)
    print(f"Correo enviado exitosamente a {to_email}")
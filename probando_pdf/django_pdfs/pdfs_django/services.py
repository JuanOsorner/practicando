# pdfs_django/services.py
import io
from django.template.loader import render_to_string
from django.core.mail import EmailMessage
from django.conf import settings # <-- IMPORTACIÓN NUEVA
from xhtml2pdf import pisa

def generate_pdf_from_template(template_path: str, context: dict) -> bytes:
    """
    Renderiza una plantilla de Django a HTML y la convierte en un PDF en memoria.
    """
    # 1. Renderizar la plantilla HTML
    html_string = render_to_string(template_path, context)
    
    # 2. Crear un buffer de bytes en memoria para el PDF
    result = io.BytesIO()

    # 3. Generar el PDF
    pdf = pisa.CreatePDF(
        src=html_string,
        dest=result,
        encoding='UTF-8'
    )

    # 4. Verificar si la creación fue exitosa
    if not pdf.err:
        return result.getvalue()
    
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
    (Actualmente usa el filebased.EmailBackend)
    """
    if not pdf_bytes:
        print("No se enviará el correo, los bytes del PDF están vacíos.")
        return

    email = EmailMessage(
        subject=subject,
        body=body,
        from_email=settings.DEFAULT_FROM_EMAIL, # Usa el DEFAULT_FROM_EMAIL de settings.py
        to=[to_email]
    )
    email.attach(attachment_name, pdf_bytes, 'application/pdf')
    email.send(fail_silently=False)
    print(f"Correo (filebased) enviado exitosamente para {to_email}")


# --- ¡NUEVA FUNCIÓN AÑADIDA! ---

def save_pdf_to_local_folder(
    pdf_bytes: bytes, 
    filename: str, 
    folder_name: str = "sent_emails"
):
    """
    Guarda los bytes del PDF en una carpeta específica en la raíz del proyecto.
    Usa Pathlib de settings.BASE_DIR para manejar las rutas.
    
    :param pdf_bytes: Los datos binarios del PDF.
    :param filename: El nombre deseado para el archivo (ej. "reporte.pdf").
    :param folder_name: La carpeta de destino (relativa a BASE_DIR).
    """
    if not pdf_bytes:
        print("[Servicio] No se guardó el PDF localmente, los bytes están vacíos.")
        return None

    try:
        # 1. settings.BASE_DIR es un objeto Pathlib (definido en settings.py)
        #    Esto crea la ruta: /ruta/a/tu/proyecto/sent_emails/
        destination_folder = settings.BASE_DIR / folder_name
        
        # 2. Asegurarse de que la carpeta exista
        destination_folder.mkdir(parents=True, exist_ok=True)
            
        # 3. Crear la ruta completa del archivo
        file_path = destination_folder / filename
        
        # 4. Escribir los bytes en el archivo
        #    .write_bytes() es la forma más simple y moderna de escribir binarios
        file_path.write_bytes(pdf_bytes)
        
        print(f"[Servicio] PDF guardado exitosamente en: {file_path}")
        return file_path
    
    except Exception as e:
        print(f"[Servicio] ERROR al guardar el PDF localmente: {e}")
        return None
import os
import uuid
import base64
from django.core.files.base import ContentFile
from django.utils.timezone import now

def path_pdf_generator(instance, filename):
    """Genera rutas dinámicas para los PDFs."""
    ext = filename.split('.')[-1]
    nuevo_nombre = f"{uuid.uuid4()}.{ext}"
    fecha = now()
    return f'pdfs/usuario_{instance.usuario.id}/{instance.tipo.lower()}/{fecha.year}/{fecha.month}/{nuevo_nombre}'

def decodificar_imagen_base64(data_uri, nombre_archivo="firma.png"):
    """
    Convierte un string Base64 (data:image/png;base64,...) en un ContentFile de Django.
    """
    if not data_uri or not isinstance(data_uri, str):
        return None

    # Separar el encabezado 'data:image/png;base64,' del contenido real
    if 'base64,' in data_uri:
        formato, imgstr = data_uri.split(';base64,') 
    else:
        imgstr = data_uri

    # Decodificar
    data = base64.b64decode(imgstr)
    
    # Retornar objeto archivo listo para el modelo
    return ContentFile(data, name=nombre_archivo)
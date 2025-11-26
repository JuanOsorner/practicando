import os
import uuid
import base64
from datetime import datetime
from django.http import JsonResponse
from django.utils.deconstruct import deconstructible
from typing import Any, Optional, Union
from django.core.files.base import ContentFile
"""
🚨EXPLICACION TECNICQA🚨

Se realiza este modulo aparte de Django para poder manejar logica compartida por muchas apps
vamos a heredar esta logica a las demas apps para que podamos depurar mejor los errores a futuro
si se realiza cualquier cambio
"""

@deconstructible
class GeneradorRutaArchivo:
    """
    Clase utilitaria para generar rutas de archivo dinámicas y seguras.
    
    Uso:
        foto = models.ImageField(upload_to=GeneradorRutaArchivo('usuarios/fotos'))
    
    Ventajas:
        1. Decorador @deconstructible: Permite que Django serialice esta clase 
           en las migraciones sin errores (vital para buenas prácticas).
        2. Estructura Temporal: Organiza archivos por Año/Mes automáticamente para 
           evitar directorios con millones de archivos (problema de inodo en Linux).
        3. Seguridad: Renombra el archivo con UUID4 para evitar colisiones y 
           predecibilidad de URLs.
    """
    
    def __init__(self, sub_carpeta: str):
        self.sub_carpeta = sub_carpeta

    def __call__(self, instance: Any, filename: str) -> str:
        """
        Método mágico que Django invoca al subir el archivo.
        """
        # 1. Extraer extensión original (y limpiarla)
        ext = filename.split('.')[-1].lower()
        
        # 2. Generar nombre único seguro
        nuevo_nombre = f"{uuid.uuid4()}.{ext}"
        
        # 3. Obtener fecha actual para particionamiento
        ahora = datetime.now()
        
        # 4. Construir ruta: prefijo/año/mes/uuid.ext
        # Ejemplo: herramientas/inventario/2023/10/a1b2-c3d4.jpg
        return os.path.join(
            self.sub_carpeta,
            str(ahora.year),
            str(ahora.month),
            nuevo_nombre
        )

# AQUI VAN LAS FUNCIONES QUE VAMOS A REUSAR EN MUCHAS APPS

def api_response(data: Any = None, success: bool = True, message: str = "Operación exitosa", 
    status_code: int = 200
) -> JsonResponse:
    """
    Helper global para estandarizar TODAS las respuestas JSON del sistema.
    
    Estructura garantizada:
    {
        "success": bool,
        "message": str,
        "payload": data,  <-- Siempre 'payload', nunca 'data' o 'items' al azar
        "timestamp": iso_str
    }
    """
    response_data = {
        "success": success,
        "message": message,
        "payload": data,
        "timestamp": datetime.now().isoformat()
    }
    return JsonResponse(response_data, status=status_code)

def decodificar_imagen_base64(data_uri: str, nombre_archivo: str = "archivo.png") -> Optional[ContentFile]:
    """
    Convierte un string Base64 (data:image/png;base64,...) en un ContentFile de Django.
    Retorna None si el string está vacío o inválido.
    """
    if not data_uri or not isinstance(data_uri, str):
        return None

    # Separar el encabezado 'data:image/png;base64,' del contenido real
    if 'base64,' in data_uri:
        try:
            _, imgstr = data_uri.split(';base64,')
        except ValueError:
            return None # Formato incorrecto
    else:
        imgstr = data_uri

    try:
        decoded_file = base64.b64decode(imgstr)
    except Exception:
        return None

    return ContentFile(decoded_file, name=nombre_archivo)
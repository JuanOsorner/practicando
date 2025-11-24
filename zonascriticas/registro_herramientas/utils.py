""" 
AQUI COLOCAMOS LA LOGICA REUTILIZABLE QUE ESTA FUERA DE LOS LIMITES DE DJANGO PERO
QUE PODEMOS USAR EN NUESTRO MODULOS DE DJANGO
"""
import uuid
import datetime
import os

def path_inventario_foto(instance, filename):
    """
    Genera ruta: herramientas/inventario/usuario_ID/uuid.jpg
    Se usa para la foto 'maestra' del catálogo del usuario.
    """
    ext = filename.split('.')[-1]
    nuevo_nombre = f"{uuid.uuid4()}.{ext}"
    return f'herramientas/inventario/usuario_{instance.usuario.id}/{nuevo_nombre}'

def path_evidencia_ingreso(instance, filename):
    """
    Genera ruta: herramientas/ingresos/AÑO/MES/ingreso_ID/uuid.jpg
    Se usa para la foto transaccional (evidencia del día).
    """
    ext = filename.split('.')[-1]
    nuevo_nombre = f"{uuid.uuid4()}.{ext}"
    
    fecha = datetime.date.today()
    # Organizamos por año/mes para evitar carpetas con 1 millón de archivos
    return f'herramientas/ingresos/{fecha.year}/{fecha.month}/ingreso_{instance.registro_ingreso.id}/{nuevo_nombre}'
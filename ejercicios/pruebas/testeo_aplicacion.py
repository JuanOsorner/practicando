# Este archivo es para probar si esta funcionando correctamente nuestro .env
import os
from pathlib import Path
from dotenv import load_dotenv
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
    )

logging.info("url")
# path encuentra la ruta absoluta
# resolve limpia la ruta para que no tenga puntos
# parent sube un nivel
BASE_DIR = Path(__file__).resolve().parent.parent
logging.info(f"Ejecutando archivo {BASE_DIR}")

logging.info("url del .env")
env_path = BASE_DIR.parent / '.env'
logging.info(f"Ejecutando archivo {env_path}")

logging.info("Cargando variables de entorno")
try:
    load_dotenv(dotenv_path=env_path)
    # Usamos with ... as para poder cerrar los errores y poder manejarlos
    with open(env_path, 'r', encoding='utf-8') as archivo:
        contenido = archivo.read()
    logging.info(f"Variables de entorno cargadas correctamente {contenido}")

    LLAVE = os.getenv('SECRET_KEY_IMASD')
    DEBUG = os.getenv('DEBUG', 'False') == 'True'
    ALLOWED = os.getenv('ALLOWED_HOSTS', '127.0.0.1,localhost').split(',')

    logging.info(f"EXITO: SE HA ENCONTRADO: {LLAVE}, {DEBUG} y {ALLOWED}")
except Exception as e:
    logging.error(f"Error al cargar el archivo .env: {e}")
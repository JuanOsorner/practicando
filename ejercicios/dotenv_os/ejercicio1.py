import os
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s"
)

def buscar_archivo(nombre: str):
    """
    Recibe el nombre de un archivo y verifica si existe en el directorio
    actual. Si existe, lo lee; si no existe, lo crea.
    """

    if os.path.exists(nombre):
        logging.info(f"El archivo {nombre} existe. Leyendo contenido...")
        with open(nombre, "r") as archivo:
            contenido = archivo.read()
            logging.info(f"Contenido leído:\n{contenido}")
    else:
        logging.warning(f"El archivo {nombre} no existe. Creándolo...")
        with open(nombre, "w") as archivo:
            archivo.write(f"Archivo creado exitosamente como {nombre}")
        logging.info("Archivo creado exitosamente")

if __name__ == "__main__":
    buscar_archivo("datos.txt")

# Segunda parte de practica de os y logging

# Importamos las librerias
import os
import logging

# 1. Creamos la configuracion del logging que incluye
# -> El nivel del logging
# -> El formato del mensaje
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s %(levelname)s %(message)s"
)

# 2. Vamso a crearnos un algoritmo que verifique si existe la ruta de un archivo sino existe 
def buscar_archivo(nombre: str, ruta: str):
    """
    Esta funcion verifica si existe una ruta, sino existe envia un error
    si la ruta recorre todos los archivos de la carpeta y verifica si existe una 
    con el nombre del archivo
    """
    if os.path.exists(ruta):
        logging.info("Ruta encontrada correctamente")
    else:
        logging.error("Ruta no encontrada")
        return
    for archivo in os.listdir(ruta):
        if archivo == nombre:
            logging.info(f"El archivo {nombre} se encontro en la ruta {ruta}")
        datos = {
            "nombre": nombre,
            "tamaño": f"El tamaño del archivo es de {os.path.getsize(os.path.join(ruta, nombre))} bytes"
        }
    logging.info("Creando log con los archivos encontrados")
    with open(nombre , "w") as arc:
        arc.write(f"Se encontraron en la ruta {ruta}\n\n{datos}")
    return

if __name__ == "__main__":
    buscar_archivo("archivo.txt", "C:\\Users\\juan.osorno\\OneDrive - JOLI FOODS S.A.S\\Documentos\\practicando\\ejercicios\\dotenv_os")
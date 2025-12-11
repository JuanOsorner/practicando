"""

Vamos a analizar un archivo cualquiera y vamos a buscar en su contenido si 
existe alguna palabra clave, si encuentra la palabra la copia y la crea en 
otro archivo 

"""

import os
import logging

# 0. Llamamos a nuestra clase personalizada para proteger los parametros de la funcion
from decorators import decoradores

# 1. Configuracion de logging
logging.basicConfig(
    level=logging.ERROR, # Cuantos niveles queremos guardar (Por ahora solo errores)
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("error.log"), # Guardar los errores en un archivo
        logging.StreamHandler() # Mostrar los errores en la consola
    ]
)

palabras_clave = ["Hola", "Mundo", "Juan", "Python"]

@decoradores.funciones_string
def buscar_palabras(ruta: str, nombre: str, lista: list):
    with open(nombre, "r", encoding="utf-8") as archivo:
        contenido = archivo.read()
        for palabra in lista:
            if palabra in contenido:
                logging.info(f"Se encontro la palabra {palabra} en el archivo {nombre}")
                with open("lista_palabras.log","w") as archvios:
                    archvios.write(palabra)

print(buscar_palabras("ruta", "nombre", palabras_clave))
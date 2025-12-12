import logging

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("practica.log"),
        logging.StreamHandler()
    ]
)

def parametros_lista(func):
    """
    Este decorador encapsula la logica de la funcion para
    validar que los parametros sean listas
    """
    logging.info("Validando que los parametros de una funcion sean listas")
    def envoltorio(*args,**kwargs):
        logging.info("Se ejecutara el ciclo for que recorere los argumentos")
        try:
            for arg in args:
                if not isinstance(arg, list):
                    raise ValueError("Todos los argumentos deben ser listas")
            logging.info("Se ejecutara la funcion correctamente")
            return func(*args,**kwargs)
        except Exception as error:
            logging.error(f"ERROR EN LA FUNCION {func.__name__}: {error}")
    return envoltorio

@parametros_lista
def maximo_una_lista(lista):
    logging.info("Se ejecutara la funcion maximo_una_lista")
    contigua, elemento = [], 0
    try:
        logging.info("Se ejecutara el ciclo for que recorere la lista")
        for i in range(len(lista)):
            lista.pop(i)
            elemento = lista[i]
            for j in range(len(lista)):
                if elemento in lista or elemento < lista[j]:
                    continue
                else:
                    return elemento
    except Exception as error:
        logging.error(f"ERROR CRITICO: {error}")

print(maximo_una_lista([1,2]))
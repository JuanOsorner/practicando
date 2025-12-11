# ESTE ARCHIVO ES MERAMENTE PARA PRUEBAS Y ENTENDER COMO FUNCIONA LOGGER

import logging

# Configuramos para manejar los errores de esta parte
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("Detalles_decoradores.log"),
        logging.StreamHandler()
    ]
)

class decoradores:
    """
    Esta clase contiene decoradores repetitivos que podemos usar en diferentes archivos
    """
    # 1. Creamos un metodo que recibe por defecto uyn diccionario con la necesidad de indicar
    #    que tipo de datos queremos que sean los parametros de la funcion
    @staticmethod
    def proteger_parametros(tipos):
        """
        Este metodo le indica que parametros debe aceptar una funcion especifica
        """
        # 1. Extraemos los tipos que nos llegan del diccionario
        tipo = [tip for tip in tipos.values()]
        logging.info(f"Se extraen los tipos que nos llegan del diccionario\n-{tipo}")
        # 2. Creamos nuestro decorador
        def decorador(funcion):
            # 3. Creamos nuestra proteccion de la logica
            def envoltorio(*args, **kwargs):
                try:
                    logging.info(f"Se ejecuta la logica de la funcion con parametros-{args}")
                    for arg, tip in zip(args, tipo):
                        if type(arg) != tip:
                            raise ValueError(f"El parametro {arg} debe ser de tipo {tip}")
                    return funcion(*args, **kwargs)
                except Exception as error:
                    logging.error(f"Error al ejecutar la logica de la funcion\n-{error}", exc_info=True)
            return envoltorio
        return decorador

if __name__ == "__main__":
    @decoradores.proteger_parametros(tipos={"nombre": str, "edad": int})
    def imprimir(nombre, edad):
        print(f"Hola {nombre}, tienes {edad} años")
    imprimir("Juan", [])
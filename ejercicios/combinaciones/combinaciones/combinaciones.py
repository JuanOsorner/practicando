# En este archivo vamos a crear una clase que cuando le mandemos 
class combinaciones:
    """
    Esta clase es la que va a contener el algoritmo de combinaciones
    """
    def __init__(self):
        self.contador = 0
    
    @staticmethod
    def combinar_listas(lista,cantidad):
        """
        Este metodo recibe una lista y nosotros retornamos todas las
        combinaciones de sublistas de dicha lista
        """
        # 1. Creamos una validacion de datos y enviamos nuestros errores personalizados
        if not lista and not cantidad:
            raise ValueError("Ingrese la lista y la cantidad de elementos a combinar")
        elif cantidad < 0:
            raise ValueError("La cantidad de elementos a combinar no puede ser negativa")
        # 2. Creamos una lista vacia que vamos a retornar mas adelante
        lista = []
        
# Vamos a practicar el uso del metodo __call__
# call nos permite llamar la clase como si fuera un metodo para usarla tantas veces como queramos

# Importamos nuestra libreria random para generar un numero aleatorio 0 o 1
import random
class Binarios:
    def __init__(self):
        # Nos creamos un contador para la cantidad de ceros o 1s
        self.contador = 0

    def _generar_binario(self):
        """
        Este metodo privado toma los datos del self y los concatena 
        siguiendo una cantidad de ceros o unos
        """
        for i in range(self.cantidad):
            uno_cero = str(random.randint(0,1))
            if "0" : # 🚨 aqui quedamos 

            
    # Esto hace que llamemos la clase como un metodo
    def __call__(self,cota,cantidad,char="1"):
        """
        Recibimos una cota para el binario, la cantidad de ceros o unos que vamos a crear y retornamos el
        binario
        """
        if not (isinstance(cantidad1, int) and isinstance(cantidad2, int)) or char not in ["1","0"]:
            # Mandamos nuestro propio mensaje de error
            return " 🚨 ERROR 🚨 No se ingreso de manera adecuado los datos"
        # Si sobrevivimos hasta ahora entonces pasamos los datos al self
        self.cantidad = cantidad # ➡️ Esta sera la cantidad de unos o la cantidad de ceros
        self.uno_cero = uno_cero # ➡️ Vamos a pedir si desea una cadena con unos o otra conceros
        self.char = char # ➡️ El usuario puede ingresar 1 o 0. Vamos a dejar por defecto 1


import random

class Binarios:
    def __init__(self):
        # Nos creamos un contador para la cantidad de ceros y 1s
        self.contador_ceros = 0
        self.contador_unos = 0
        
    def __call__(self, cota, cantidad, char="1"):
        """
        Recibimos una cota para el binario, la cantidad de ceros o unos que vamos a crear y retornamos el binario
        """
        if not (isinstance(cantidad, int) and isinstance(cota, int)) or char not in ["1","0"]:
            return " 🚨 ERROR 🚨 No se ingreso de manera adecuado los datos"
        
        # Reiniciamos contadores para nueva generación
        self.contador_ceros = 0
        self.contador_unos = 0
        
        self.cota = cota
        self.cantidad = cantidad
        self.char = char
        self.controlador = self.cota - self.cantidad
        
        return self._generar_binario()

    def _generar_binario(self):
        """
        Este metodo privado toma los datos del self y los concatena 
        siguiendo una cantidad de ceros o unos
        """
        texto = ""
        
        while len(texto) != self.cota:
            uno_cero = str(random.randint(0, 1))
            
            if self.char == "1":
                # Queremos exactamente 'cantidad' de unos
                if uno_cero == "1" and self.contador_unos < self.cantidad:
                    self.contador_unos += 1
                    texto += uno_cero
                elif uno_cero == "0" and self.contador_ceros < self.controlador:
                    self.contador_ceros += 1
                    texto += uno_cero
            else:  # char == "0"
                # Queremos exactamente 'cantidad' de ceros
                if uno_cero == "0" and self.contador_ceros < self.cantidad:
                    self.contador_ceros += 1
                    texto += uno_cero
                elif uno_cero == "1" and self.contador_unos < self.controlador:
                    self.contador_unos += 1
                    texto += uno_cero
                    
        return texto

# Ejemplo de uso:
binarios = Binarios()
print(binarios(10, 3, "1"))  # Binario de 10 dígitos con exactamente 3 unos
print(binarios(8, 2, "0"))   # Binario de 8 dígitos con exactamente 2 ceros
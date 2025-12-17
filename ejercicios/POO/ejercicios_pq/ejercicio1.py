class ejercicio1:
    # Creamos nuestro constructor de la clase ejercicio1 
    # Podemos quitarnos la responsabilidad de usar getters y setters protegiendo
    # los datos de entrada en el constructor
    def __init__(self,vector):
        # Primero validamos si lo que se ingresa es una lista
        if not vector or not isinstance(vector,list):
            raise ValueError("No se ingreso una lista")
        # Veamos si existe un elemento que no sea un numero en esta lista
        for elemento in vector:
            if not isinstance(elemento,int):
                raise ValueError("No se ingreso un vector de enteros")
        # Si todo sale bien copiarmos en el vector al self de la clase
        self.vector=vector
    
    def convertir_a_disperso(self) -> dict:
        """
        Este metodo debe tomar un vector y retornar un diccionario con los
        indices que no son ceros

        args: self.vector (list)

        returns: diccionario (dict)
        """
        # Empezamos con un diccionario vacio
        return {i: v for i, v in enumerate(self.vector) if v != 0}

                
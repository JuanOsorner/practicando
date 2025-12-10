# Por el momento no evaluar aqui (Esto es solo practica)
def enteros_positivos(func):
    """
    Esta funcion protege los datos de los parametros de la funcion resultante
    """
    def envoltura_logica(dato1, *args, **kwargs):
        """
        Antes de pasar retornar la funcion vamos a proteger los argumentos
        """
        if type(dato1) != int or dato1 <= 0:
            return {
                "Tipo": type(dato1),
                "dato": dato,
                "Funcion": "Ninguna",
                "Mensaje": "Parametro erroneo"
            }
        return {
            "Funcion": func(dato1, *args, **kwargs),
            "Mensaje": "Todo perfecto (ESTAS APRENDIENDO A USAR JSON EN PYTHON)"
        }
    return envoltura_logica
# Solo Evaluar el algoritmo de sumar
@enteros_positivos
def sumar(indice1: int) -> str:
    suma = 0
    for i in range(indice1):
        for j in range(i):
            suma += i*j
    return f"La suma es: {suma}"  
# No calificar esto (Simplemente estoy practicando formas de programar mientras aprendo analisis de algoritmos)
resultado = sumar(4) # Esto nos va a devolver un diccionario
for clave,valor in resultado.items():
    print(f"{clave}:{valor}\n")
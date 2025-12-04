# Observación: Si queremos romper una ramificación completa de un nodo podemos usar return, de lo contrio continue

def generar_cadenas(palabra: str, cantidad: int) -> list:
    """
    Este metodo nos devuelve la lista con todas
    las palabras validas del arbol
    """
    lista = []
    def generar(actual: str):
        if len(actual) == cantidad:
            lista.append(actual)
            return
        # Si la lista no es vacia tomamos la ultima letra
        ultima_letra = actual[-1] if actual else None
        for letra in palabra:
            if ultima_letra == "1" and letra == "2":
                continue
            generar(actual + letra)
    generar("")
    return lista
    
print(generar_cadenas("021",3))

# No evaluar el siguiente algoritmo
def buscar(lista: list, palabra: str) -> str:
    """
    Busca en todas las palabras de una lista si existe la palabra dentro
    de un string
    
    parametros: lista - list, palabra - string
    
    retorna: un string
    """
    for elemento in lista:
        # Validamos si el elemento es un string
        if type(elemento) != str:
            return "Existe un elemento en la lista que no es string"
        if palabra in elemento:
            return f"Existe la palabra {palabra} en {elemento}"
    return f"No se encontro la palabra {palabra} en la lista \n\n {lista}"

# lista_palabras = generar_cadenas("012",4)
# print(buscar(lista_palabras, "12"))

"""
➡️ Explicación

Creamos una funcion que devuelve una funcion que se anida varias veces. 

Sea p la palabra "012" y k = 2, entonces cuando entra en los parametros
del metodo la funcion: 

1. Pregunta si el tamaño de la nbueva palabra es de tamaño 2, sino lo es tomamos
la ultima letra de la pnueva palabra, como inicialmente la palabra es "", entonces
retorna None, entra en el bucle, toma la letra 0 y la concatena con "", por tanto
la nueva palabra es 0. 

2. Vuelve y pregunta, como no es de tamaño 2, pasa al siguiente if ternario
y toma la letra 0, entra en el ciclo y toma la letra 0, pregunta si la ultima palabra es 1
sino es entonces sale y guarda el 00.

¿Por que funciona nuestro metodo? Porque en el ciclo preguntamos si la ultima letra es
1, si la letra en ese momento es 2 dentro del bucle, no la anida rompiendo el anidamiento
hasta ese momento
"""
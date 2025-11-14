# Algoritmo que crea un binario de tamaño n sin dos ceros consecutivos
import random #Importamos para hacer un llenado aleatorio

def crear_binario(tamaño: int, lista = []) -> list:
    """
    Este metodo recibe el tamaño de un binario
    y crea uno sin dos ceros consecutivos en 
    una lista por defecto
    """
    if tamaño <= 0:
        return "No se ingreso un tamaño adecuado"
    # Hacemos un llenado inicial
    lista.append(random.randint(0,1))
    while len(lista) != tamaño:
        # 0 o 1 cada vez y un indice iniciado en 1
        uno_cero, indice = random.randint(0,1), 1
        # Preguntamos si cero
        if uno_cero == 0:
            # Si logra ser cero preguntamos si esta en la posicion anterior
            if lista[indice-1] != 0:
                lista.append(uno_cero)
        # Sino insertamos el 1
        lista.append(1)
    # Al finalizar el ciclo retornamos la lista
    return lista
     
print(crear_binario(5))   
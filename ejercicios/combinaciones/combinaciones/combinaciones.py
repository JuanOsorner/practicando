"""
Practicar funciones recursivas
"""
def permutaciones_repeticion(palabra: str, k: int) -> list:
    """
    Este metodo recibe una palabra, un entero k
    y devuelve todas las permutaciones con repeticion 
    listadas
    """
    lista = []
    if len(palabra) < k and k < 0:
        # Devolvemos la lista vacia si el tamaño de la palabra es menor que k
        return lista
    def permutar(n_palabra: str) -> str:
        """
        Este metodo genera todas las permutaciones que podemos
        hacer con las letras de una palabra
        """
        if len(n_palabra) == k:
            lista.append(n_palabra)
            return
        for letra in palabra:
            permutar(n_palabra + letra)
    permutar("")
    return lista
    
print(permutaciones_repeticion("ABCD",2))

def combinaciones(palabra: str, entero: int) -> list:
    """
    Este metodo toma una palabra y devuelve las
    combinaciones de esa palabra listadas tomandolas
    de a el numero entero
    """
    lista = []
    if len(palabra) < k and k < 0:
        # Devolvemos la lista vacia si el tamaño de la palabra es menor que k
        return lista
    
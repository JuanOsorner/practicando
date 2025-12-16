"""
ejercicios\p_decoradores\nivel_6.py

Descripcion: en este archivo estamos practicando decoradores y algoritmos de algebra lineal

Objetivo: mejorar la sintaxis aprendiendo matematicas para la programacion
"""
def validar_espacio(func):
    """
    Decorador para validar que dos vectores
    esten en el mismo espacio vectorial
    """
    def envoltura_logica(*args, **kwargs):
        for arg in args:
            if not isinstance(arg, list):
                return f"El argumento: {arg} no es un vector"
            elif len(args[0]) != len(arg):
                return f"El vector {arg} no pertenece al mismo espacio vectorial que {args[0]}"
        return func(*args,**kwargs)
    return envoltura_logica
    
@validar_espacio
def ortogonales(u: list, v: list) -> dict:
    """
    Tomamos dos vectores y validamos que sean ortogonales
    
    args: u (lista), v (lista)
    
    return: diccionario con los vectores, la suma y si es ortogonal o no
    """
    suma, valor = 0, False
    for i in range(len(u)):
        suma += u[i]*v[i]
    if suma == 0:
        valor = True
    return {
        'vectores': f"El vector 1: {u} El vector 2: {v}",
        'producto_punto': suma,
        'Ortogonales': valor
    }
v1 = [1,1,1,1]
v2 = [0,-9,5,4]
diccionario = ortogonales(v1,v2)
if diccionario.get('Ortogonales'):
    print(f"Los vectores: {diccionario.get('vectores')} son Ortogonales\nSuma: {diccionario.get('producto_punto')}")
else:
    print(f"Los vectores: {diccionario.get('vectores')} no son Ortogonales\nSuma: {diccionario.get('producto_punto')}")
    
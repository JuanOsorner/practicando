# Crear un decorador que cuente cuantas veces se llama una función: 
def decorador(func):
    contador = 0
    def wrapper(*args, **kwards):
        # Envolvemos la logica de la funcion aqui
        # nonlocal es para decirle a python que la variable no es local del metodo
        nonlocal contador
        contador += 1
        print(f"Se llamo {contador} veces la funcion")
        return func(*args, **kwards)
    return wrapper
"""
Basicamente un @ en python equivale a nueva_fun = decorador(func)
"""
@decorador
def funcion():
    return "Hola"

for i in range(10):
    print(funcion())
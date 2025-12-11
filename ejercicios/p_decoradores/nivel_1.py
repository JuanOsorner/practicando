# Vamos a practicar decoradores

#🚨 Este es un nivel basico
def envolver_logica(funcion, a, b): # Si la funcion tiene parametros obligatorios debemos envolverlos tambien
    """
    Esta funcion toma otra como parametro
    y ejecuta una logica inicial antes de ejecutar la funcion
    """
    print("Iniciando...")
    resultado = funcion(a,b) #Ejecuta la funcion que llego como parametro
    print("🟢 INICIADO 🟢")
    return resultado
    
def sumar_dos_numeros(a: int, b: int) -> int:
    """
    Este metodo toma dos enteros y devuelve su suma
    """
    return a + b
    
# Envolvemos la funcion envolver_logica sobre suma
resultado = envolver_logica(sumar_dos_numeros,1,2)
print(resultado)
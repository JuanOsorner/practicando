def parametros_enteros(funcion):
    """
    Este decorador verifica que lo que se recibe de una funcion sea una lista
    y que sus elementos sean enteros
    """
    def envoltura(*args, **kwargs):
        # Intentamos ejecutar una logica si algo sale mal retornamos un error
        try:
            # Validamos que el argumento sea una lista
            if arg in args is not list or len(args) != 1:
                raise ValueError("Ingrese una sola lista en los argumentos")
            # Tomamos el unico elemento de la lista y lo clonamos
            lista = list(args[0])
            # Recorremos los elementos de la lista y validamos que sean entero 
            for elemento in lista:
                if not isinstance(elemento, int):
                    raise ValueError("Todos los argumentos deben ser enteros")      

            return funcion(*args, **kwargs)
        except Exception as e:
            return f"Error: {e}"
    return envoltura
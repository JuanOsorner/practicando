def Validacion_fuerte(func):
    def envoltura_logica(lista,palabra,entero, *args, **kwards):
        if type(lista) != list:
            return "👁 NO SE HA INGRESADO UNA LISTA VALIDA"
        elif type(palabra) != str or palabra == "":
            return "👁 NO SE HA INGRESADO UN TEXTO ADECUADO"
        elif type(entero) != int or len(palabra) < entero:
            return "👁 NO SE HA INGRESADO UN ENTERO ADECUADO"
        return func(lista,palabra,entero,*args,**kwards)
    return envoltura_logica
@Validacion_fuerte
def guardar_lista(lista, palabra, k):
    """
    Este metodo recibe una lista que debe ser vacia,
    """
    def permutar(n_palabra):
        if len(n_palabra) == k:
            lista.append(n_palabra)
            return
        for letra in palabra:
            permutar(n_palabra + letra)
    permutar("")
    return lista
    
print(guardar_lista([],"ABCD",4))
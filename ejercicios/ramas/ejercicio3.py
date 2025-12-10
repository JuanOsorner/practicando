def listar(lista: list) -> list:
    arbol = []
    def gemerar_lista(nueva: list) -> list:
        arbol.append(nueva)
        for elemento in lista:
            if nueva and elemento <= nueva[-1]:
                continue
            elif sum(nueva) > 10: 
                nueva.pop(elemento)
                continue
            elif len(nueva) == len(lista):
                return
            nueva_lista = nueva + [elemento]
            gemerar_lista(nueva_lista)
    gemerar_lista([])
    return arbol
print(listar([1,2,3,5]))
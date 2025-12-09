def generar_lista(palabra: str, condicion: str, cantidad: int) -> list:
        """
        Toma una palabra y una condicion y te 
        devuelve la lista de palabras que cumplen 
        con la condicion
        
        args: 
            palabra (string) una palabra (EJ: ABC)
            condicion (string) letras (EJ AA)
            cantidad (string) un tamaño para la cadena
            
        return: 
            lista de palabras validas
        """
        lista = []
        def generar(nueva: str):
            """
            Toma una palabra anidada y devuelve
            una nueva
            
            args: 
                nueva (string) palabra (EJ: "")
            
            returns: 
                una palabra
            """
            # reto
            if len(nueva) == cantidad:
                lista.append(nueva)
                return
            # Tomamos la ultima letra si se encuentra la palabra, sino nada
            ultima_letra = nueva[-1] if nueva else None
            for letra in palabra:
                # Observacion: Esta condicion por el momento solo funciona para dos letras
                if ultima_letra and ultima_letra + letra == condicion:
                    continue
                generar(nueva + letra)
        generar("")
        return lista
print(generar_lista("ABC","AA",3))

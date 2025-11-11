# Esta clase es para crear mis propios decoradores
class decoradores:
    # Una observacion importante es que cuando estamos creando decoradores de manera modular
    # Tenemos que usar la envoltura static

    """Los decoradores son la forma de hablar de composición de funciones en python"""
    @staticmethod
    def decorador(funcion_original):
        def f(entero):
            print("Se ejecuta el decorador")
            return funcion_original(entero)
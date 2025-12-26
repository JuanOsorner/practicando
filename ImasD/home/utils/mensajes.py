from django.http import JsonResponse # Para enviar las respuestas json

class mensajes:
    """
    Esta clase es la encargada de enviar los tipos de mensajes al front de toda clase
    """
    def __init__(self):
        pass # Por el momento lo vamos a manejar pass (Escalabilidad)
    
    # Lo vamos a usar como un metodo estatico para facilidad de uso
    @staticmethod
    def json_mensaje(mensaje: str, tipo: bool, url: str) -> JsonResponse:
        """
        Esta funcion envia un mensaje json al front

        Nota: A medida que los proyectos crezcan pueden añadirse mas parametros
        incluso escalar a los decoradores
        """
        return JsonResponse({
            'success': tipo,
            'message': mensaje,
            'url': url
        }) 
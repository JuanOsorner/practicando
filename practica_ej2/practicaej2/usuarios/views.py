from django.shortcuts import render
#Importamos como vamos a responder 
import json
from django.http import JsonResponse
# Importamos a nuestro mesero
from .models import Usuario

# Create your views here.
def enviar_usuarios(request):
    """Validamos la respuesta que nos envian desde el front"""
    if request.method == 'GET':
        try:
            # Los usuarios que se traen del query
            usuarios = Usuario.objects.all()
            # Creamos un nuevo diccionario con los que traemos del query
            datos = [usuario.diccionario_datos() for usuario in usuarios]
            respuesta = {
                'status': 'succces',
                'datos': datos,
                'mensaje': 'Usuarios cargados correctamente',
            }
            return JsonResponse(respuesta, status=200)
        except Exception as e:
            errores = {
                'status': 'error',
                'datos': None,
                'mensaje': str(e),
            }
            return JsonResponse(errores, status=500)
    else:
        respuesta_error = {
            'status': 'error',
            'datos': None,
            'mensaje': 'Método no permitido',
        }
        return JsonResponse(respuesta_error, status=405)
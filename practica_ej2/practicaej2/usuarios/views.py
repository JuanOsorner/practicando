from django.http import JsonResponse
from django.shortcuts import render
from .models import Usuario

def tabla_usuarios(request):
    """Esta vista se encarga de renderizar la tabla de usuarios"""
    return render(request, 'tabla_usuarios.html')

def enviar_usuarios(request):
    """Validamos la respuesta que nos envian desde el front"""
    if request.method == 'GET':
        try:
            # Los usuarios que se traen del query
            usuarios = Usuario.objects.all()
            # Usamos nuestra función pasando los usaurios al self
            datos = [usuario.diccionario_datos() for usuario in usuarios]
            respuesta = {
                'status': 'success',
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
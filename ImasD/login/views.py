"""
ImasD\login\views.py

Este archivo es el encargado de manejar las vistas del login

La responsabilidad de este archivo es redirigir al usuario a la app de home
si el usuario esta autenticado correctamente. Si no lo esta o bien esta inactivo
le mandamos un mensaje generico para evitar que los atacantes puedan saber si el usuario
existe o no
"""
from django.shortcuts import render, redirect # Para rendreizar y redireccionar
from django.contrib.auth import authenticate, login # Para autenticar y loguear
# Importamos nuestra clase de mensajes personalizados
from home.utils.mensajes import mensajes

# Creamos nuestra vista del login que se encarga de renderizar la plantilla
def login_view(request):
    """
    El unico funcionamiento de esta vista es renderizar la plantilla de login.html
    """
    return render(request, 'login.html')

def procesar_formulario(request):
    """
    Esta vista es la encargada de procesar el formulario de login
    y mandar al front los datos que necesita para validar la redireccion
    de los usuarios
    """
    # Validamos si lo que nos llega del request es un POST
    if request.method == 'POST':
        # Tomamo de la variable name = correo el valor que nos llega del formulario
        correo = request.POST.get('correo')
        # Tomamo de la variable name = password el valor que nos llega del formulario
        password = request.POST.get('password')

        # Notar que usamos username=correo porque en el modelo configuramos USERNAME_FIELD = 'correo'
        # Pero authenticate espera el argumento 'username'
        user = authenticate(request, username=correo, password=password)
        # authenticate nos va a enviar none si el usuario es inactivo 

        # Si encuentra el usuario
        if user is not None:
            login(request, user) # Crea la cokie de sesion
            # Validamos que tipo de usuario es
            if user.tipo == 'sa':
                return mensajes.json_mensaje('Bienvenido al sistema de super administracion de ImasD', True, 'prueba.html')
            elif user.tipo == 'ad':
                return mensajes.json_mensaje('Bienvenido al sistema de administracion de ImasD', True, 'prueba.html')
            elif user.tipo == 'us':
                return mensajes.json_mensaje('Bienvenido a ImasD', True, 'prueba.html')
        else:
            # Si no encuentra el usuario le enviamos un mensaje de error
            return mensajes.json_mensaje('No se pudo iniciar sesion, acerquese a un administrador para mas informacion', False, 'login.html')
    else:
        # Si se intenta ingresar al endpoit usando otro metodo le enviamos un mensaje de error
        return mensajes.json_mensaje('Metodo no permitido.', False, 'login.html')
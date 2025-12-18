from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login
from django.contrib import messages

# Creamos nuestra vista del login que se encarga de renderizar la plantilla
def login_view(request):
    # Validamos si lo que nos llega del request es un POST
    if request.method == 'POST':
        correo = request.POST.get('correo')
        password = request.POST.get('password')
        
        # Notar que usamos username=correo porque en el modelo configuramos USERNAME_FIELD = 'correo'
        # Pero authenticate espera el argumento 'username'
        user = authenticate(request, username=correo, password=password)
        
        if user is not None:
            if user.is_staff:
                login(request, user)
                # Redireccionamos al admin o a donde corresponda
                return redirect('/admin/')
            else:
                messages.error(request, 'El usuario no está activo.')
        else:
            messages.error(request, 'Credenciales inválidas. Por favor verifique su correo y contraseña.')

    # Renderizamos la plantilla de login.html
    return render(request, 'login.html')
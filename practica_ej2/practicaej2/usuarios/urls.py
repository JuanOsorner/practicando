from django.urls import path
from . import views

# Este es el menu que le enviamos a nuestro segundo mesero
urlpatterns = [
    path('usuarios/',viewas.enviar_usuarios, name='enviar_usuarios')
]
    
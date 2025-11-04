from django.urls import path
from . import views

# Este es el menu que le enviamos a nuestro segundo mesero
urlpatterns = [
    path('usuarios/', views.tabla_usuarios, name='tabla_usuarios'),
    path('api/usuarios/',views.enviar_usuarios, name='enviar_usuarios')
]
    
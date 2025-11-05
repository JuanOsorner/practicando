from django.urls import path
from . import views

# Este es el menu que le enviamos a nuestro segundo mesero
urlpatterns = [
    path('login/', views.mostrar_login, name='mostrar_login'),
]
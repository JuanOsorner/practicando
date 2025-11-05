from django.urls import path
from . import views

# Este es el menu que le enviamos a nuestro segundo mesero
urlpatterns = [
    path('', views.mostrar_login, name='login'),
    path('api/login/', views.login_api, name='login-api'),
    path('logout/', views.logout_view, name='logout'),
]
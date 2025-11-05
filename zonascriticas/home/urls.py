# home/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Esta es la URL /dashboard/ a la que redirige el login
    path('dashboard/', views.home_view, name='dashboard'),
    
    # --- Rutas de Admin (para el sidebar) ---
    path('perfil/', views.perfil_view, name='perfil'),
    path('empresas/', views.empresas_view, name='empresas'),
    path('jornadas/', views.jornadas_view, name='jornadas'),
    
    # --- Rutas de Usuario ---
    path('responsabilidad/', views.responsabilidad_view, name='responsabilidad'),
]
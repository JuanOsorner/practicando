from django.urls import path
from . import views

urlpatterns = [
    # Ruta existente
    path('', views.perfil_view, name='perfil'),
    
    # --- AÑADE ESTAS DOS NUEVAS RUTAS ---
    path('api/update/', views.update_profile_api, name='perfil-update-api'),
    path('api/update-image/', views.update_image_api, name='perfil-image-api'),
]
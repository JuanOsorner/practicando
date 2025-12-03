# zonascriticas/actividades/urls.py

from django.urls import path
from . import views

urlpatterns = [
    # Vista HTML
    path('', views.actividades_view, name='actividades_view'),
    
    # APIs JSON
    path('api/listar/', views.listar_actividades_api, name='api_listar_actividades'),
    path('api/iniciar/', views.iniciar_actividad_api, name='api_iniciar_actividad'),
    path('api/finalizar/<int:actividad_id>/', views.finalizar_actividad_api, name='api_finalizar_actividad'),
    
    path('api/zona/salir/', views.salida_zona_api, name='api_salida_zona'),
]
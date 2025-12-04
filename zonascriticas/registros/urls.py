# zonascriticas/registros/urls.py

from django.urls import path
from . import views

urlpatterns = [
    # Vista HTML Principal
    path('', views.registros_view, name='registros_view'),
    
    # API 1: Listar Visitantes (Para la Tabla Principal)
    path('api/listar-visitantes/', views.listar_visitantes_api, name='api_listar_visitantes'),
    
    # API 2: Historial Detallado (Para el Panel Lateral)
    path('api/historial/<int:usuario_id>/', views.historial_usuario_api, name='api_historial_usuario'),
    
    # API 3: Reactivar (Botón de acción en el panel)
    path('api/reactivar/', views.reactivar_jornada_api, name='api_reactivar_jornada'),
]
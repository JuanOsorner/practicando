from django.urls import path
from . import views

urlpatterns = [
    path('', views.responsabilidad_view, name='responsabilidad'),
    path('api/buscar-usuario/', views.buscar_usuario_api, name='api-buscar-usuario'),
    path('api/buscar-zona/', views.buscar_zona_api, name='api-buscar-zona'),
    path('api/procesar-ingreso/', views.procesar_ingreso_api, name='api-procesar-ingreso'),
]
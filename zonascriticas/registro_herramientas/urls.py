from django.urls import path
from . import views

urlpatterns = [
    # Vista Principal
    path('', views.registro_herramientas_view, name='registro_herramientas_view'),
    
    # APIs
    path('api/inventario/', views.api_obtener_inventario, name='api_inventario'),
    path('api/inventario/crear/', views.api_crear_inventario, name='api_crear_inventario'),
    path('api/registrar-ingreso/', views.api_registrar_ingreso_herramienta, name='api_registrar_ingreso'),
    path('api/finalizar/', views.api_finalizar_registro, name='api_finalizar_registro'),
]
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

    path('api/inventario/<int:item_id>/actualizar/', views.api_actualizar_inventario, name='api_actualizar_inventario'),
    path('api/inventario/<int:item_id>/eliminar/', views.api_eliminar_inventario, name='api_eliminar_inventario'),
    path('api/carrito/agregar/', views.api_agregar_carrito, name='api_agregar_carrito'),
    path('api/carrito/remover/', views.api_remover_del_carrito, name='api_remover_carrito'),
    path('api/carrito/masivo/', views.api_gestion_masiva, name='api_gestion_masiva'),
]
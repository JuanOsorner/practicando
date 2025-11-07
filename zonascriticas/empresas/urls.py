from django.urls import path
# 1. IMPORTA LAS VISTAS
from . import views 

urlpatterns = [
    # 2. VISTA DE PLANTILLA
    path('', views.empresas_view, name='empresas-list'),
    
    # --- 3. ENDPOINTS DE API ---
    path('api/empresas/', views.empresa_list, name='api-empresa-list'),
    path('api/empresas/crear/', views.empresa_create, name='api-empresa-create'),
    path('api/empresas/<int:empresa_id>/actualizar/', views.empresa_update, name='api-empresa-update'),

    path('api/empresas/<int:empresa_id>/estado/', views.update_empresa_estado, name='api-empresa-update-estado'),
    path('api/empresas/<int:empresa_id>/empleados/', views.empleado_list, name='api-empleado-list'),
    path('api/empleados/<int:empleado_id>/estado/', views.update_empleado_estado, name='api-empleado-update-estado'),
    path('api/recursos/', views.recursos_list, name='api-recursos-list'),

    path('api/empleados/crear/', views.empleado_create, name='api-empleado-create'),
]
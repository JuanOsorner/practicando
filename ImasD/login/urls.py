from django.urls import path 
from . import views

# Creamois el nombre de la app para evitar coliciones a futuro
app_name = 'login' # Debe ser app_name para que Django sepa a que app pertenece
# En las plantilla html ahora debemos usar login:{lo que sea}

# Incluimos todos los endpoints de la app Login
urlpatterns = [
    path('', views.login_view, name='login'), # GET: Renderizar login
    path('api/login/', views.procesar_login, name='login-api'), # POST: Procesar login
]
# zonascriticas/urls.py
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Incluye todas las URLs de tu app 'login' (/, /api/login/, /logout/)
    path('', include('login.urls')), 
    
    # Incluye todas las URLs de tu app 'home' (/dashboard/, /perfil/, etc.)
    path('', include('home.urls')),
]
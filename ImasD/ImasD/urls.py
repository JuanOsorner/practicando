"""
URL configuration for ImasD project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include

from django.conf import settings             # Importamos la configuración
from django.conf.urls.static import static   # Importamos la función para servir estáticos

# Aqui incluimos todas las urls del proyecto
urlpatterns = [
    path('admin/', admin.site.urls),
    path('login/', include('login.urls')), # Importamos las urls de Login
]

# Lógica condicional: Solo servimos media si estamos en modo DEBUG (Desarrollo).
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
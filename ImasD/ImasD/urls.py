"""

"""
from django.contrib import admin
from django.urls import path, include

from django.conf import settings             # Importamos la configuración
from django.conf.urls.static import static   # Importamos la función para servir estáticos

# Aqui incluimos todas las urls del proyecto
urlpatterns = [
    path('admin/', admin.site.urls),
    path('login/', include('login.urls')), # Importamos las urls de Login
    path('home/', include('home.urls')),
]

# Lógica condicional: Solo servimos media si estamos en modo DEBUG (Desarrollo).
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
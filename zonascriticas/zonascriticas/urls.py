# zonascriticas/urls.py
# from django.contrib import admin
from django.urls import path, include

from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # path('admin/', admin.site.urls),
    
    # Cuando se visita la raíz '/', se incluye login/urls.py
    path('', include('login.urls')), 
    
    # Cuando se visita '/dashboard/', se incluye home/urls.py
    path('', include('home.urls')), # Gestiona 'dashboard/'

    # Cuando se visita '/perfil/', se incluye perfil/urls.py
    path('perfil/', include('perfil.urls')),
    
    path('empresas/', include('empresas.urls')),
    # path('jornadas/', include('jornadas.urls')), <---- No las manejamos por el momento
]

# Esto le dice a Django que sirva los archivos de MEDIA_ROOT en la URL MEDIA_URL
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
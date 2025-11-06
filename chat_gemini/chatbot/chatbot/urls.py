# chatbot/urls.py (EL ARCHIVO PRINCIPAL)

from django.contrib import admin
from django.urls import path, include  # <-- IMPORTA INCLUDE

urlpatterns = [
    path('admin/', admin.site.urls),

    # Le decimos a Django: "Cualquier URL que llegue
    # debe ser manejada por el archivo 'gemini_bot.urls'"
    path('', include('gemini_bot.urls')), 
]
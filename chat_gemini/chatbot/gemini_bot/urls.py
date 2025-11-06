# gemini_bot/urls.py (NUEVO ARCHIVO)

from django.urls import path
from . import views

app_name = 'gemini_bot'  # Buena práctica (namespacing)

urlpatterns = [
    # La página principal que sirve el HTML -> /
    path('', views.chat_view, name='chat_view'),

    # El endpoint de la API que usa el JS -> /api/chat/
    path('api/chat/', views.chat_api, name='chat_api'),
]
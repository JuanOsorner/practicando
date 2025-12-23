from django.urls import path
from . import views

app_name = 'home' # Nos creamos nuestro namespace

urlpatterns = [
    path('', views.home_view, name='home'),
]
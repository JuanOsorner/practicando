# home/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Esta es la URL /dashboard/ a la que redirige el login
    path('dashboard/', views.home_view, name='dashboard'),
]
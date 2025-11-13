from django.urls import path
from . import views

urlpatterns = [
    path('', views.responsabilidad_view, name='responsabilidad'),
]
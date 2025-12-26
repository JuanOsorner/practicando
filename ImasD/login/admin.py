"""
ImasD\login\admin.py

Este archivo es la base del panel de administracion de django. 
Con este archivo puedes ver los usuarios en el panel de administracion de django
ingresa a la url /admin/ para verlo

Responsabilidad: poder ver la base de datos desde la administracion de django
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Usuario

class UsuarioAdmin(UserAdmin):
    # Define qué columnas se muestran en la lista de usuarios
    list_display = ('correo', 'nombre', 'tipo', 'cargo', 'is_staff', 'is_active')
    
    # Define por qué campos se puede buscar en la barra de búsqueda
    search_fields = ('correo', 'nombre')
    
    # Define los filtros laterales para segmentar datos rápidamente
    list_filter = ('tipo', 'is_staff', 'area')
    
    # Define el campo por defecto para ordenar la lista
    ordering = ('correo',)

    # Define cómo se agrupan los campos en el formulario de EDICIÓN
    # Nota: Quitamos 'username' porque usamos 'correo' como identificador
    fieldsets = (
        ('Credenciales', {'fields': ('correo', 'password')}),
        ('Información Personal', {'fields': ('nombre', 'cargo', 'area', 'tipo')}),
        ('Permisos', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )

    # Configuración para compatibilidad con la creación de usuarios (evita errores de readonly)
    filter_horizontal = ()

# Registramos el modelo vinculándolo con esta configuración de admin
admin.site.register(Usuario, UsuarioAdmin)
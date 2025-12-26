"""
ImasD\login\management\commands\crear_super.py

Este archivo se encarga de crear un super usuario por defecto

Nota: Este archivo es meramente administrativo y de desarrollo
NUNCA DEBE USARSE EN PRODUCCION PORQUE LA CONTRASEÑA DE ADMIN ES
EXTREMADAMENTE INSEGURA
"""

# Importamos la libreria de BaseCommand para crear el comando personalizado
from django.core.management.base import BaseCommand
# Nos permite tomar nuestro modelo de usuario personalizado
from django.contrib.auth import get_user_model

# Django detecta automaticamente este script como una comando de manage.py
# Nota: No debe cambiarse el nombre de la clase y de la funcion porque 
# Django espera que se llamen asi para que funcione
class Command(BaseCommand):
    """
    Esta clase es nuestro comando personalizado solo 
    para desarrollo y administracion
    """
    # texto que aparece al ejecutar el comando
    help = 'Crea un super usuario por defecto'

    # Punto de entrada de lo que hace el comando
    def handle(self, *args, **kwargs):
        """
        Esta funcion es la que se ejecuta cuando se ejecuta el comando
        """
        # Llamamos nuestro modelo de usuario personalizado
        User = get_user_model()
        # Datos del super usuario por defecto (SOLO DESARROLLO)
        # Si quieres escalar esto a Produccion debes usar las variables de entorno
        CORREO = "admin@admin.com"
        PASSWORD = 'admin'
        NOMBRE = 'Super Admin Dev'

        # Si el usuario no esta creado, entonces lo creamos
        if not User.objects.filter(correo=CORREO).exists():
            # Usa el manager que creamos anteriormente
            User.objects.create_superuser(
                correo=CORREO,
                nombre=NOMBRE,
                password=PASSWORD
            )
            # Mandamos un mensaje a la consola
            self.stdout.write(self.style.SUCCESS(f'Usuario {CORREO} creado exitosamente'))
        else:
            # Mandamos un mensaje a la consola
            self.stdout.write(self.style.WARNING(f'El usuario {CORREO} ya existe'))
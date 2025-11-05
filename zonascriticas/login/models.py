from django.db import models
# Manejamos la logica del login

# Abstract user sirve ya contiene los datos basicos cargados
"""
- username
- email
- password (¡HASHEADO)!
- is_activae (ESTADO)
- is_staff (TIPO)
- first_name, last_name
"""
class Usuario(AbstractUser):
    email = models.EmailField(unique=True) 

    TIPO_DOCUMENTO = (
        ('CC', 'Cédula de Ciudadanía'),
        ('CE', 'Cédula de Extranjería'),
        ('PA', 'Pasaporte'),
    )
    tipo_documento = models.CharField(max_length=2, choices=TIPO_DOCUMENTO, blank=True)
    numero_documento = models.CharField(max_length=20, blank=True)
    
    TIPO = (
        ('Administrador', 'Administrador'),
        ('Usuario', 'Usuario'),
    )
    tipo = models.CharField(max_length=11, choices=TIPO, default='Usuario')

    token = models.CharField(max_length=100, blank=True, null=True)
    img = models.ImageField(upload_to='usuarios/', blank=True, null=True)
    tiempo_limite_jornada = models.DateTimeField(blank=True, null=True)

    # El str es una forma de ver un dato cuando hacemos una isntancia
    def __str__(self):
        return self.username

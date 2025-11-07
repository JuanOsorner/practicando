from django.db import models
# Manejamos la logica del login
from django.contrib.auth.models import AbstractUser
# Importamos de empresas la empresa y el cargo
from empresas.models import Empresa, Cargo

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
    numero_documento = models.CharField(max_length=20, unique=True, blank=False, null=False)
    
    TIPO = (
        ('Administrador', 'Administrador'),
        ('Usuario', 'Usuario'),
    )
    tipo = models.CharField(max_length=13, choices=TIPO, default='Usuario')

    token = models.CharField(max_length=100, blank=True, null=True)
    img = models.ImageField(upload_to='usuarios/', blank=True, null=True)
    tiempo_limite_jornada = models.DateTimeField(blank=True, null=True)

    #Campo de expiración del token
    otp_expiracion = models.DateTimeField(blank=True, null=True)

    # Añadimos las llaves foraneas que necesita

    empresa = models.ForeignKey(
        'empresas.Empresa', 
        on_delete=models.SET_NULL, 
        null=True, # Permite que un usuario (ej. Admin) no pertenezca a ninguna empresa
        blank=True,
        related_name='empleados' # Nos permite hacer Empresa.empleados.all()
    )

    cargo = models.ForeignKey(
        'empresas.Cargo', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='usuarios'
    )

    # El str es una forma de ver un dato cuando hacemos una isntancia
    def __str__(self):
        return self.username

    class Meta:
        db_table = 'Usuarios'


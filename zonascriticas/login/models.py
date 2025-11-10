# zonascriticas/login/models.py
from django.db import models
from empresas.models import Empresa, Cargo 

class Usuario(models.Model):
    
    # Django pondrá 'id' por defecto, pero lo mapeamos a 'int(11)'
    id = models.AutoField(primary_key=True)
    
    email = models.EmailField(unique=True, db_column='correo', max_length=255) 

    TIPO = (
        ('Administrador', 'Administrador'),
        ('Usuario', 'Usuario'),
    )
    tipo = models.CharField(max_length=250, choices=TIPO, default='Usuario', db_column='tipo')

    # Mapeamos 'estado' (tinyint(1)) a 'is_active' (BooleanField)
    is_active = models.BooleanField(default=True, db_column='estado')

    # Mapeamos 'nombre' a 'first_name'
    first_name = models.CharField(max_length=250, db_column='nombre')

    TIPO_DOCUMENTO = (
        ('CC', 'Cédula de Ciudadanía'),
        ('CE', 'Cédula de Extranjería'),
        ('PA', 'Pasaporte'),
    )
    tipo_documento = models.CharField(max_length=50, choices=TIPO_DOCUMENTO, db_column='tipo_documento', blank=True)
    numero_documento = models.CharField(max_length=50, unique=True, db_column='numero_documento')
    
    token = models.CharField(max_length=255, blank=True, null=True, db_column='token')
    
    img = models.ImageField(upload_to='usuarios/', max_length=250, blank=True, null=True, db_column='img')
    
    tiempo_limite_jornada = models.TimeField(blank=True, null=True, db_column='tiempo_limite_jornada')

    empresa = models.ForeignKey(
        'empresas.Empresa', 
        on_delete=models.SET_NULL, 
        null=True,
        blank=True,
        related_name='empleados',
        db_column='id_empresa'
    )

    cargo = models.ForeignKey(
        'empresas.Cargo', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='usuarios',
        db_column='id_cargo'
    )

    # --- Propiedades de Compatibilidad (Arregla C009/C010) ---
    
    @property
    def is_staff(self):
        # Propiedad virtual para que 'home_view' funcione
        return self.tipo == 'Administrador'
    
    @property
    def is_anonymous(self):
        return False

    @property
    def is_authenticated(self):
        return True
    
    # Campo fantasma para que las plantillas no fallen
    @property
    def username(self):
        return self.email

    def get_full_name(self):
        return self.first_name

    def __str__(self):
        return self.email or f"Usuario {self.id}"

    class Meta:
        # ¡CAMBIO! Le decimos a Django que cree esta tabla
        # localmente para nosotros.
        managed = True 
        db_table = 'usuarios' # El nombre de la BD real
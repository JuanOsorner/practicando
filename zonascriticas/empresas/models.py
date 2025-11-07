from django.db import models
from django.conf import settings # Para importar tu AUTH_USER_MODEL

# Modelo para Cargos (Basado en tu tabla 'cargos')
class Cargo(models.Model):
    nombre = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.nombre

    class Meta:
        db_table = 'empresa_cargos' # Nombramos la tabla explícitamente

# Modelo para Servicios (Basado en tu tabla 'servicios')
class Servicio(models.Model):
    nombre_servicio = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.nombre_servicio

    class Meta:
        db_table = 'empresa_servicios_lista' # Nombramos la tabla

# Modelo para Empresas (Basado en tu tabla 'empresas')
class Empresa(models.Model):
    nombre_empresa = models.CharField(max_length=255)
    nit = models.CharField(max_length=20, unique=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True) # Django maneja esto
    direccion = models.CharField(max_length=255, blank=True, null=True)
    contacto = models.CharField(max_length=100, blank=True, null=True)
    estado = models.BooleanField(default=True) # Usamos BooleanField en lugar de tinyint(1)

    # Relación Muchos-a-Muchos (Basado en tu tabla 'empresa_servicios')
    # Django creará la tabla intermedia automáticamente.
    servicios = models.ManyToManyField(
        Servicio, 
        blank=True,
        related_name='empresas',
        db_table='empresa_servicios_pivot' # Nombramos la tabla pivot
    )

    def __str__(self):
        return self.nombre_empresa

    class Meta:
        db_table = 'empresa_empresas' # Nombramos la tabla
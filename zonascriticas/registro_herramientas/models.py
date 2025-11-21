from django.db import models
import uuid
from login.models import Usuario
from descargo_responsabilidad.models import RegistroIngreso

# --- Generadores de Rutas ---

def path_inventario_foto(instance, filename):
    ext = filename.split('.')[-1]
    nuevo_nombre = f"{uuid.uuid4()}.{ext}"
    return f'herramientas/inventario/usuario_{instance.usuario.id}/{nuevo_nombre}'

def path_evidencia_ingreso(instance, filename):
    ext = filename.split('.')[-1]
    nuevo_nombre = f"{uuid.uuid4()}.{ext}"
    import datetime
    fecha = datetime.date.today()
    return f'herramientas/ingresos/{fecha.year}/{fecha.month}/ingreso_{instance.registro_ingreso.id}/{nuevo_nombre}'


# --- MODELO 1: EL CATÁLOGO (Inventario) ---

class InventarioHerramienta(models.Model):
    
    # DEFINICIÓN ESTRICTA DE CATEGORÍAS
    class CategoriaOpciones(models.TextChoices):
        HERRAMIENTA = 'HERRAMIENTA', 'Herramienta / Equipo General'
        COMPUTO = 'COMPUTO', 'Activo de Cómputo / Tecnológico'

    usuario = models.ForeignKey(
        Usuario, 
        on_delete=models.CASCADE, 
        related_name='mi_inventario',
        db_column='id_usuario',
        verbose_name="Dueño"
    )

    # Ahora la categoría es un selector estricto
    categoria = models.CharField(
        max_length=20, 
        choices=CategoriaOpciones.choices, 
        default=CategoriaOpciones.HERRAMIENTA,
        verbose_name="Tipo de Activo",
        db_index=True # Indexamos esto para filtrar rápido en el frontend
    )

    nombre = models.CharField(max_length=255, verbose_name="Nombre del Activo")
    marca_serial = models.CharField(max_length=255, verbose_name="Marca / Serial")
    
    foto_referencia = models.ImageField(
        upload_to=path_inventario_foto, 
        blank=True, null=True,
        db_column='foto_referencia_ruta',
        verbose_name="Foto de Referencia"
    )

    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'inventario_herramientas'
        verbose_name = "Ítem de Inventario"
        verbose_name_plural = "Inventario Personal"

    def __str__(self):
        return f"[{self.categoria}] {self.nombre}"


# --- MODELO 2: EL REGISTRO (Transacción) ---

class HerramientaIngresada(models.Model):
    
    class EstadoHerramienta(models.TextChoices):
        INGRESADO = 'INGRESADO', 'En Planta'
        SALIO = 'SALIO', 'Retirado'

    registro_ingreso = models.ForeignKey(
        RegistroIngreso, 
        on_delete=models.CASCADE,
        related_name='herramientas_registradas',
        db_column='id_registro_ingreso'
    )

    herramienta_inventario = models.ForeignKey(
        InventarioHerramienta,
        on_delete=models.PROTECT, 
        related_name='historial_ingresos',
        db_column='id_inventario_activo'
    )

    observaciones = models.TextField(blank=True, null=True)
    
    foto_evidencia = models.ImageField(
        upload_to=path_evidencia_ingreso,
        db_column='foto_ingreso_ruta',
        verbose_name="Foto Evidencia del Día"
    )

    estado = models.CharField(
        max_length=20, 
        choices=EstadoHerramienta.choices, 
        default=EstadoHerramienta.INGRESADO
    )

    fecha_registro = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'registros_herramientas_ingreso'
        verbose_name = "Registro de Herramienta"
        verbose_name_plural = "Herramientas Ingresadas"

    def __str__(self):
        return f"Ingreso #{self.registro_ingreso.id} - {self.herramienta_inventario.nombre}"
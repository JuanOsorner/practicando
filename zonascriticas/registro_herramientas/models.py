from django.db import models
from login.models import Usuario
from descargo_responsabilidad.models import RegistroIngreso

# --- IMPORTACIÓN DEL NÚCLEO ---
from home.utils import GeneradorRutaArchivo

# --- MODELO 1: EL CATÁLOGO (Inventario) ---

class InventarioHerramienta(models.Model):
    
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

    categoria = models.CharField(
        max_length=20, 
        choices=CategoriaOpciones.choices, 
        default=CategoriaOpciones.HERRAMIENTA,
        verbose_name="Tipo de Activo",
        db_index=True
    )

    nombre = models.CharField(max_length=255, verbose_name="Nombre del Activo")
    marca_serial = models.CharField(max_length=255, verbose_name="Marca / Serial")
    
    # --- CAMBIO: Uso de GeneradorRutaArchivo ---
    # Estructura: herramientas/inventario/AÑO/MES/uuid.ext
    foto_referencia = models.ImageField(
        upload_to=GeneradorRutaArchivo('herramientas/inventario'), 
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
    
    # Estructura: herramientas/evidencias/AÑO/MES/uuid.ext
    # Esto será muy similar a lo que haremos con las fotos de actividades
    foto_evidencia = models.ImageField(
        upload_to=GeneradorRutaArchivo('herramientas/evidencias'),
        db_column='foto_ingreso_ruta',
        verbose_name="Foto Evidencia del Día",
        blank=True, null=True
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
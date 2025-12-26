"""
ImasD\catalogo\models.py

Descripcion: Este es nuestro archivo que contiene la tabla de la base de datos del catalogo de los productos de ImasD

Responsabilidad: La unica responsabilidad de este archivo es la creacion de las tablas de la base de datos
"""
from django.db import models

# --- MIXIN DE AUDITORÍA ---
# Definimos esto aquí para usarlo en todos los modelos de esta app.
# Nota: En sistemas grandes, esto suele ir en una app 'core' o 'utils'.
class ModeloBase(models.Model):
    """
    Inyecta campos de auditoría a todos los modelos que hereden de este mixin.
    """
    fecha_creacion = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")
    fecha_modificacion = models.DateTimeField(auto_now=True, verbose_name="Última modificación")

    class Meta:
        abstract = True # Esto significa que no crea una tabla en BD, solo sirve para heredar campos

# --- 1. MATERIA PRIMA (La base de todo) ---
class MateriaPrima(ModeloBase):
    """
    Representa las tablas de los ingredientes puros
    """
    codigo = models.CharField(
        max_length=50, 
        unique=True, 
        verbose_name="Código Interno (MP)",
        help_text="Ej: MP51190028"
    )
    nombre = models.CharField(max_length=200, verbose_name="Nombre Comercial")
    
    # CRÍTICO: La densidad es vital para la fórmula morada (DMU).
    # Default 1.0000 para evitar errores de división, pero debe editarse.
    densidad = models.DecimalField(
        max_digits=8, 
        decimal_places=4, 
        default=1.0000, 
        verbose_name="Densidad (g/ml)",
        help_text="Fundamental para cálculos de volumen a masa."
    )
    
    # Usamos DecimalField para alta precisión química y matematica
    costo_kilo = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0.00, 
        verbose_name="Costo por Kg"
    )
    
    # Para saber si aun se usa o no se usa
    activo = models.BooleanField(default=True, verbose_name="¿Está activo?")

    class Meta:
        verbose_name = "Materia Prima"
        verbose_name_plural = "Materias Primas"
        ordering = ['codigo']

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

# --- 2. INFORMACIÓN NUTRICIONAL (Detalle 1 a 1) ---
class InformacionNutricional(models.Model):
    """
    Tabla satélite para no saturar la tabla principal de MP.
    Relación OneToOne: Una MP tiene UNA sola ficha nutricional.
    """
    materia_prima = models.OneToOneField(
        MateriaPrima, 
        on_delete=models.CASCADE, 
        related_name='nutricional'
    )
    
    # Todos los campos se asumen por 100g de producto
    # Usamos DecimalField para alta precisión química
    sodio_mg = models.DecimalField(max_digits=10, decimal_places=3, default=0, verbose_name="Sodio (mg)")
    azucares_g = models.DecimalField(max_digits=10, decimal_places=3, default=0, verbose_name="Azúcares Totales (g)")
    azucares_anadidos_g = models.DecimalField(max_digits=10, decimal_places=3, default=0, verbose_name="Az. Añadidos (g)")
    grasa_total_g = models.DecimalField(max_digits=10, decimal_places=3, default=0, verbose_name="Grasa Total (g)")
    grasa_saturada_g = models.DecimalField(max_digits=10, decimal_places=3, default=0, verbose_name="Grasa Saturada (g)")
    proteina_g = models.DecimalField(max_digits=10, decimal_places=3, default=0, verbose_name="Proteína (g)")
    carbohidratos_g = models.DecimalField(max_digits=10, decimal_places=3, default=0, verbose_name="Carbohidratos (g)")
    
    # Puedes agregar aquí el resto de columnas del excel (Hierro, Calcio, Zinc, etc.)
    # Por ahora dejo las principales para el ejemplo.

    class Meta:
        verbose_name = "Info. Nutricional"
        verbose_name_plural = "Info. Nutricional"

    def __str__(self):
        return f"Nutrientes de {self.materia_prima.codigo}"

# --- 3. LÍMITE NORMATIVO (Para el Scraping) ---
class LimiteNormativo(ModeloBase):
    """
    Almacena los datos extraídos del PDF del Codex (CXS 192).
    Se usa para validar si una formulación cumple la norma.
    """
    codigo_ins = models.CharField(max_length=20, verbose_name="Código INS", help_text="Ej: 211")
    nombre_aditivo = models.CharField(max_length=255, verbose_name="Nombre Aditivo")
    
    # Categoría alimento que nos viene del pdf
    categoria_alimento = models.CharField(
        max_length=255, 
        verbose_name="Categoría Alimento", 
        help_text="Ej: 12.5 Sopas y caldos"
    )
    
    # El límite numérico. Si es "BPF" (Buenas Prácticas), se puede manejar con un -1 o null
    limite_maximo_ppm = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True, 
        verbose_name="Límite Máximo (ppm)"
    )
    
    # La fuente que nos viene del pdf normativo
    fuente = models.CharField(max_length=100, default="CXS 192-1995", verbose_name="Fuente Normativa")

    class Meta:
        verbose_name = "Límite Normativo"
        verbose_name_plural = "Límites Normativos (Codex)"

    def __str__(self):
        return f"{self.codigo_ins} - {self.nombre_aditivo} ({self.limite_maximo_ppm} ppm)"

class FuncionTecnologica(ModeloBase):
    """
    Catálogo dinámico de funciones (Saborizante, Colorante, etc.)
    Permite al administrador agregar nuevas funciones sin tocar código.
    """
    nombre = models.CharField(max_length=100, unique=True, verbose_name="Nombre de la Función")
    descripcion = models.TextField(blank=True, verbose_name="Descripción (Opcional)")
    
    class Meta:
        verbose_name = "Función Tecnológica"
        verbose_name_plural = "Funciones Tecnológicas"
        ordering = ['nombre']

    def __str__(self):
        return self.nombre
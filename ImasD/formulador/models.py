from django.db import models
from django.conf import settings
# Importamos la tabla de la base de datos de catalogo que se van a relacionar aqui
from catalogo.models import MateriaPrima, LimiteNormativo, FuncionTecnologica

# --- MIXIN DE AUDITORÍA ---
class ModeloBase(models.Model):
    fecha_creacion = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")
    fecha_modificacion = models.DateTimeField(auto_now=True, verbose_name="Última modificación")
    class Meta:
        abstract = True

# --- 1. CABECERA DEL PRODUCTO (LÓGICA MATEMÁTICA) ---
class Producto(ModeloBase):
    ESTADOS = [
        ('BORRADOR', 'Borrador (Edición)'),
        ('VIGENTE', 'Vigente (Aprobado)'),
        ('OBSOLETO', 'Obsoleto (Histórico)')
    ]
    
    codigo = models.CharField(max_length=20, unique=True, verbose_name="Código Ficha (PP)")
    nombre = models.CharField(max_length=200, verbose_name="Nombre del Producto")
    version_actual = models.PositiveIntegerField(default=1, verbose_name="Versión Matemática")
    estado = models.CharField(max_length=10, choices=ESTADOS, default='BORRADOR')
    
    # --- VARIABLES PARA CÁLCULOS ---
    cantidad_base_lote = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=1000.00,
        verbose_name="Base Lote (Kg)",
        help_text="Variable VERDE: Base para calcular Kgs reales."
    )
    
    densidad_teorica = models.DecimalField(
        max_digits=8, 
        decimal_places=4, 
        default=1.0000,
        verbose_name="Densidad Teórica (g/ml)",
        help_text="Variable MORADA: Si este producto se usa como ingrediente, se usa esta densidad."
    )
    
    # Auditoría
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.PROTECT, 
        related_name='productos_creados'
    )
    
    class Meta:
        verbose_name = "Producto (Ficha Técnica)"
        verbose_name_plural = "Productos"

    def __str__(self):
        return f"{self.codigo} - {self.nombre} (v{self.version_actual})"

# --- 2. INGREDIENTES Y FÓRMULA ---
class ItemFormula(ModeloBase):
    """
    Representa una fila en la tabla de formulación.
    Conecta al Padre con un Hijo (que puede ser MP o PP).
    """
    producto_padre = models.ForeignKey(
        Producto, 
        on_delete=models.CASCADE, 
        related_name='ingredientes'
    )
    
    # --- RECURSIVIDAD (EL ÁRBOL) ---
    # Un ingrediente DEBE ser Materia Prima O SubProducto. Nunca ambos.
    materia_prima = models.ForeignKey(
        MateriaPrima, 
        on_delete=models.PROTECT, 
        null=True, 
        blank=True,
        verbose_name="Ingrediente (MP)"
    )
    
    sub_producto = models.ForeignKey(
        Producto, 
        on_delete=models.PROTECT, 
        null=True, 
        blank=True, 
        related_name='usado_como_ingrediente',
        verbose_name="Ingrediente (Sub-Producto)"
    )
    
    # --- VARIABLES MATEMÁTICAS ---
    cantidad_porcentaje = models.DecimalField(
        max_digits=8, 
        decimal_places=4, 
        verbose_name="% Cantidad"
    )
    
    porcentaje_uso = models.DecimalField(
        max_digits=8, 
        decimal_places=4, 
        default=100.00, 
        verbose_name="% Uso (Cliente)",
        help_text="Variable MORADA: Dosis usada por el cliente final."
    )
    
    # --- RELACIONES DE VALIDACIÓN ---
    # Aquí usamos la NUEVA TABLA dinámica en lugar de una lista fija
    funcion = models.ForeignKey(
        FuncionTecnologica,
        on_delete=models.PROTECT,
        verbose_name="Función Tecnológica"
    )
    
    norma_asociada = models.ForeignKey(
        LimiteNormativo, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        verbose_name="Norma Codex"
    )

    class Meta:
        verbose_name = "Renglón de Fórmula"
        verbose_name_plural = "Renglones de Fórmula"

    def __str__(self):
        nombre_ingrediente = self.materia_prima.nombre if self.materia_prima else self.sub_producto.nombre
        return f"{nombre_ingrediente} ({self.cantidad_porcentaje}%) en {self.producto_padre.codigo}"

# --- 3. HISTORIAL DE ARCHIVOS (PDFs) ---
class HistorialFichas(models.Model):
    """
    Almacén de PDFs generados. La 'verdad inmutable' de lo que se entregó al cliente.
    """
    producto = models.ForeignKey(
        Producto, 
        on_delete=models.CASCADE, 
        related_name='historial_pdfs'
    )
    
    archivo_pdf = models.FileField(
        upload_to='fichas_tecnicas/%Y/%m/', 
        verbose_name="Documento PDF"
    )
    
    version = models.PositiveIntegerField(verbose_name="Versión Documental")
    
    comentario = models.TextField(
        blank=True, 
        verbose_name="Razón del cambio / Comentarios"
    )
    
    usuario_responsable = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.PROTECT
    )
    
    fecha_subida = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-version']
        verbose_name = "Archivo de Ficha Técnica"
        verbose_name_plural = "Historial de Fichas"

    def __str__(self):
        return f"PDF v{self.version} - {self.producto.codigo}"
from django.db import models
from login.models import Usuario

# --- IMPORTACIÓN DEL NÚCLEO (Refactorización 1.1) ---
# Reemplaza a las funciones locales de generación de rutas
from home.utils import GeneradorRutaArchivo

class Ubicacion(models.Model):
    """
    Catálogo maestro de Zonas Críticas sincronizado con Freshservice.
    """
    nombre = models.CharField(max_length=255, verbose_name="Nombre de la Zona")
    codigo_qr = models.CharField(max_length=100, unique=True, verbose_name="Código QR (Asset Tag)")
    ciudad = models.CharField(max_length=100, blank=True, null=True)
    freshservice_id = models.BigIntegerField(unique=True, verbose_name="ID Freshservice")
    descripcion = models.TextField(blank=True, null=True)
    activa = models.BooleanField(default=True) 
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ubicaciones'
        verbose_name = "Ubicación / Zona Crítica"
        verbose_name_plural = "Ubicaciones"

    def __str__(self):
        return f"{self.nombre} ({self.ciudad}) - {self.codigo_qr}"

class DocumentoPDF(models.Model):
    class TipoDocumento(models.TextChoices):
        DESCARGO = 'DESCARGO', 'Descargo de Responsabilidad'
        REPORTE_SALIDA = 'REPORTE_SALIDA', 'Reporte de Salida y Actividades'
        DIAGNOSTICO = 'DIAGNOSTICO', 'Diagnóstico Técnico'
        OTRO = 'OTRO', 'Otro Documento'

    usuario = models.ForeignKey(
        Usuario, 
        on_delete=models.PROTECT, 
        related_name='mis_documentos',
        verbose_name="Usuario Propietario"
    )

    # 🚨 CAMBIO APLICADO: Ruta centralizada en 'pdfs'
    archivo = models.FileField(
        upload_to=GeneradorRutaArchivo('pdfs'), 
        verbose_name="Archivo PDF",
        max_length=255
    )

    tipo = models.CharField(
        max_length=20, 
        choices=TipoDocumento.choices, 
        default=TipoDocumento.DESCARGO,
        verbose_name="Tipo de Documento"
    )
    
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    descripcion = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = 'documentos_pdf'
        verbose_name = "Documento PDF"
        verbose_name_plural = "Historial de Documentos PDF"
        ordering = ['-fecha_creacion']

    def __str__(self):
        return f"{self.tipo} - {self.usuario.first_name}"


class RegistroIngreso(models.Model):
    class EstadoOpciones(models.TextChoices):
        PENDIENTE_HERRAMIENTAS = 'Pendiente', 'Pendiente Registro Herramientas'
        EN_ZONA = 'En Zona', 'En Zona'
        FINALIZADO = 'Finalizado', 'Finalizado'

    class ModalidadOpciones(models.TextChoices):
        CON_EQUIPOS = 'CON_EQUIPOS', 'Ingreso con Equipos'
        SOLO_ACTIVIDADES = 'SOLO_ACTIVIDADES', 'Solo Actividades'
        VISITA = 'VISITA', 'Solo Visita'

    visitante = models.ForeignKey(
        Usuario, on_delete=models.PROTECT, db_column='id_visitante', related_name='ingresos_visitante'
    )
    responsable = models.ForeignKey(
        Usuario, on_delete=models.PROTECT, db_column='id_responsable', related_name='autorizaciones_responsable'
    )
    ubicacion = models.ForeignKey(
        Ubicacion, on_delete=models.PROTECT, related_name='registros_historial', verbose_name="Zona Crítica", null=True
    )

    pdf_descargo = models.ForeignKey(
        DocumentoPDF,
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name='registro_origen_entrada',
        verbose_name="PDF Descargo (Entrada)"
    )

    pdf_reporte_salida = models.ForeignKey(
        DocumentoPDF,
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name='registro_origen_salida',
        verbose_name="PDF Reporte (Salida)"
    )
    
    fecha_hora_ingreso = models.DateTimeField(auto_now_add=True)
    fecha_hora_salida = models.DateTimeField(blank=True, null=True)

    firma_visitante = models.ImageField(upload_to=GeneradorRutaArchivo('firmas/visitantes'))
    firma_responsable = models.ImageField(upload_to=GeneradorRutaArchivo('firmas/responsables'))

    acepta_descargo = models.BooleanField(default=True)
    acepta_politicas = models.BooleanField(default=True)

    modalidad = models.CharField(
        max_length=20, 
        choices=ModalidadOpciones.choices, 
        default=ModalidadOpciones.VISITA
    )
    
    estado = models.CharField(
        max_length=20, choices=EstadoOpciones.choices, default=EstadoOpciones.EN_ZONA
    )

    class Meta:
        db_table = 'registros_ingreso'
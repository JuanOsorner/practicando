from django.db import models
from login.models import Usuario
# Importamos la lógica desacoplada
from .utils import path_pdf_generator 

class DocumentoPDF(models.Model):
    class TipoDocumento(models.TextChoices):
        DESCARGO = 'DESCARGO', 'Descargo de Responsabilidad'
        DIAGNOSTICO = 'DIAGNOSTICO', 'Diagnóstico Técnico'
        OTRO = 'OTRO', 'Otro Documento'

    usuario = models.ForeignKey(
        Usuario, 
        on_delete=models.PROTECT, 
        related_name='mis_documentos',
        verbose_name="Usuario Propietario"
    )

    archivo = models.FileField(
        # Aquí referenciamos la función importada
        upload_to=path_pdf_generator, 
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
        return f"{self.tipo} - {self.usuario.nombre}"


class RegistroIngreso(models.Model):
    class EstadoOpciones(models.TextChoices):
        EN_ZONA = 'En Zona', 'En Zona'
        FINALIZADO = 'Finalizado', 'Finalizado'

    class EquiposOpciones(models.TextChoices):
        SI = 'SI', 'Sí'
        NO = 'NO', 'No'

    visitante = models.ForeignKey(
        Usuario, on_delete=models.PROTECT, db_column='id_visitante', 
        related_name='ingresos_visitante'
    )
    responsable = models.ForeignKey(
        Usuario, on_delete=models.PROTECT, db_column='id_responsable', 
        related_name='autorizaciones_responsable'
    )

    documento_asociado = models.ForeignKey(
        DocumentoPDF,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        db_column='id_documento_pdf',
        related_name='ingreso_origen',
        verbose_name="PDF Firmado"
    )

    nombre_zona = models.CharField(max_length=255)
    ciudad_zona = models.CharField(max_length=100)
    
    fecha_hora_ingreso = models.DateTimeField(auto_now_add=True)
    fecha_hora_salida = models.DateTimeField(blank=True, null=True)

    # Firmas en crudo (evidencia forense)
    firma_visitante = models.ImageField(upload_to='firmas/visitantes/%Y/%m/')
    firma_responsable = models.ImageField(upload_to='firmas/responsables/%Y/%m/')

    acepta_descargo = models.BooleanField(default=True)
    acepta_politicas = models.BooleanField(default=True)

    ingresa_equipos = models.CharField(
        max_length=5, choices=EquiposOpciones.choices, default=EquiposOpciones.NO
    )
    estado = models.CharField(
        max_length=20, choices=EstadoOpciones.choices, default=EstadoOpciones.EN_ZONA
    )

    class Meta:
        db_table = 'registros_ingreso'
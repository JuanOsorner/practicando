# zonascriticas/actividades/models.py

from django.db import models
from descargo_responsabilidad.models import RegistroIngreso
from home.utils import GeneradorRutaArchivo

class Actividad(models.Model):
    
    class EstadoActividad(models.TextChoices):
        EN_PROCESO = 'EN_PROCESO', 'En Proceso'   # Card Roja
        FINALIZADA = 'FINALIZADA', 'Finalizada'   # Card Verde
        CANCELADA = 'CANCELADA', 'Cancelada'      # Opcional, por si se arrepiente

    registro_ingreso = models.ForeignKey(
        RegistroIngreso,
        on_delete=models.CASCADE,
        related_name='actividades_registradas',
        db_column='id_registro_ingreso',
        verbose_name="Ingreso Asociado"
    )

    titulo = models.CharField(max_length=255, verbose_name="Título de la Actividad")
    
    # --- FASE 1: INICIO (Card Roja) ---
    observacion_inicial = models.TextField(verbose_name="Observación Inicial")
    foto_inicial = models.ImageField(
        upload_to=GeneradorRutaArchivo('actividades/inicio'),
        verbose_name="Evidencia Inicial"
    )
    hora_inicio = models.DateTimeField(auto_now_add=True)

    # --- FASE 2: CIERRE (Card Verde) ---
    observacion_final = models.TextField(blank=True, null=True, verbose_name="Observación Final")
    foto_final = models.ImageField(
        upload_to=GeneradorRutaArchivo('actividades/fin'),
        blank=True, null=True,
        verbose_name="Evidencia Final"
    )
    hora_fin = models.DateTimeField(blank=True, null=True)

    estado = models.CharField(
        max_length=20,
        choices=EstadoActividad.choices,
        default=EstadoActividad.EN_PROCESO
    )

    class Meta:
        db_table = 'actividades_operativas'
        verbose_name = "Actividad Operativa"
        verbose_name_plural = "Bitácora de Actividades"

    def __str__(self):
        return f"{self.titulo} ({self.estado})"
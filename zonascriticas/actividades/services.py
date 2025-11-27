# zonascriticas/actividades/services.py

from django.core.exceptions import ValidationError
from django.db import transaction
from .models import Actividad
from descargo_responsabilidad.models import RegistroIngreso

# No necesitamos importar GeneradorRutaArchivo aquí, el modelo lo maneja.

class ActividadesService:
    
    @staticmethod
    def iniciar_actividad(usuario, data, foto_inicial):
        """
        Crea una actividad en estado EN_PROCESO (Card Roja).
        """
        # 1. Validar que el usuario tenga un ingreso activo
        # Buscamos el ingreso activo (EN_ZONA)
        ingreso = RegistroIngreso.objects.filter(
            visitante=usuario,
            estado=RegistroIngreso.EstadoOpciones.EN_ZONA
        ).first()

        if not ingreso:
            raise ValidationError("No tienes un ingreso activo en zona para registrar actividades.")

        # 2. Validar Datos
        titulo = data.get('titulo')
        observacion = data.get('observacion_inicial')

        if not titulo or not foto_inicial:
            raise ValidationError("El título y la foto inicial son obligatorios.")

        # 3. Crear Actividad
        actividad = Actividad.objects.create(
            registro_ingreso=ingreso,
            titulo=titulo,
            observacion_inicial=observacion or "",
            foto_inicial=foto_inicial,
            estado=Actividad.EstadoActividad.EN_PROCESO
        )
        
        return actividad

    @staticmethod
    def finalizar_actividad(usuario, actividad_id, data, foto_final):
        """
        Cierra una actividad pasando a estado FINALIZADA (Card Verde).
        """
        # 1. Buscar la actividad asegurando que pertenezca al usuario actual
        try:
            actividad = Actividad.objects.get(
                pk=actividad_id,
                registro_ingreso__visitante=usuario
            )
        except Actividad.DoesNotExist:
            raise ValidationError("La actividad no existe o no te pertenece.")

        if actividad.estado == Actividad.EstadoActividad.FINALIZADA:
            raise ValidationError("Esta actividad ya fue finalizada.")

        # 2. Validar Evidencia de Cierre
        if not foto_final:
            raise ValidationError("La foto final es obligatoria para cerrar la actividad.")

        # 3. Actualizar
        from django.utils import timezone
        
        actividad.observacion_final = data.get('observacion_final', "")
        actividad.foto_final = foto_final
        actividad.hora_fin = timezone.now()
        actividad.estado = Actividad.EstadoActividad.FINALIZADA
        actividad.save()

        return actividad

    @staticmethod
    def listar_actividades(usuario):
        """
        Devuelve las actividades del ingreso actual del usuario.
        """
        ingreso = RegistroIngreso.objects.filter(
            visitante=usuario,
            estado=RegistroIngreso.EstadoOpciones.EN_ZONA
        ).first()

        if not ingreso:
            return []

        return Actividad.objects.filter(registro_ingreso=ingreso).order_by('-hora_inicio')
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta  
from .models import Actividad
from descargo_responsabilidad.models import RegistroIngreso

class ActividadesService:
    
    @staticmethod
    def iniciar_actividad(usuario, data, foto_inicial):
        """
        Crea una actividad en estado EN_PROCESO (Card Roja).
        """
        # 1. Validar que el usuario tenga un ingreso activo
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

    @staticmethod
    def calcular_tiempo_restante(usuario, ingreso) -> int:
        """
        Calcula los segundos restantes de la jornada del usuario basado en la HORA DE INGRESO.
        Jornada estándar = 8 horas.
        """
        DURACION_JORNADA_HORAS = 8
        
        if not ingreso:
            return 0

        # Usamos la hora actual con zona horaria
        ahora = timezone.localtime(timezone.now())
        
        # La hora de entrada ya viene con zona horaria desde la BD si USE_TZ=True
        hora_entrada = ingreso.fecha_hora_ingreso
        
        # Calcular Hora Límite
        hora_limite = hora_entrada + timedelta(hours=DURACION_JORNADA_HORAS)
        
        # Calcular diferencia en segundos
        diferencia = hora_limite - ahora
        segundos = int(diferencia.total_seconds())
        
        return max(0, segundos)
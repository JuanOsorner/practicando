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
    def forzar_salida_por_tiempo(usuario):
        """
        Cierra el ingreso, dejando las actividades en su estado actual (EN_PROCESO).
        Esto sirve de evidencia de tareas inconclusas.
        """
        ingreso = RegistroIngreso.objects.filter(
            visitante=usuario,
            estado=RegistroIngreso.EstadoOpciones.EN_ZONA
        ).first()

        if ingreso:
            ingreso.fecha_hora_salida = timezone.now()
            ingreso.estado = RegistroIngreso.EstadoOpciones.FINALIZADO 
            ingreso.observaciones_salida = "Cierre automático del sistema: Tiempo de jornada agotado."
            ingreso.save()
            return True
        return False
    
    @staticmethod
    def cerrar_ingreso_zona(usuario):
        """
        Cierra el ingreso actual del usuario (Salida Voluntaria).
        Cambia estado a FINALIZADO (o PENDIENTE_FIRMA según tu flujo).
        """
        ingreso = RegistroIngreso.objects.filter(
            visitante=usuario,
            estado=RegistroIngreso.EstadoOpciones.EN_ZONA
        ).first()

        if not ingreso:
            raise ValidationError("No hay un ingreso activo para cerrar.")

        # Validamos si hay actividades pendientes
        actividades_pendientes = Actividad.objects.filter(
            registro_ingreso=ingreso,
            estado=Actividad.EstadoActividad.EN_PROCESO
        ).exists()

        if actividades_pendientes:
            # Aquí decides tu regla de negocio:
            # Opción A: No dejar salir (raise ValidationError)
            # Opción B: Dejar salir pero advertir (retornar warning)
            # Opción C (Elegida): Permitir salir, quedan como evidencia inconclusa.
            pass 

        # Actualizamos el ingreso
        ingreso.fecha_hora_salida = timezone.now()
        # IMPORTANTE: Si tu flujo requiere firmar PDF al salir, el estado debería ser
        # algo como 'PENDIENTE_FIRMA'. Si es salida directa, usa 'FINALIZADO'.
        ingreso.estado = RegistroIngreso.EstadoOpciones.FINALIZADO 
        ingreso.save()

        return ingreso
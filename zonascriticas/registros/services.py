from django.db.models import Max, Q, Exists, OuterRef, F
from django.utils import timezone
from django.db import transaction
from descargo_responsabilidad.models import RegistroIngreso
from login.models import Usuario

class RegistrosService:

    @staticmethod
    def listar_visitantes_con_estado():
        """
        Obtiene usuarios que han ingresado al menos una vez.
        Annotates:
        - ultima_fecha: La fecha del registro más reciente.
        - esta_en_zona: Booleano, True si tiene un registro activo AHORA.
        """
        # Subquery para saber si existe un ingreso activo (Estado = EN_ZONA)
        ingreso_activo = RegistroIngreso.objects.filter(
            visitante=OuterRef('pk'),
            estado=RegistroIngreso.EstadoOpciones.EN_ZONA
        )

        # Filtramos usuarios que tengan al menos un registro de ingreso (relación inversa 'ingresos_visitante')
        visitantes = Usuario.objects.filter(
            ingresos_visitante__isnull=False
        ).annotate(
            ultima_visita=Max('ingresos_visitante__fecha_hora_ingreso'),
            tiene_ingreso_activo=Exists(ingreso_activo)
        ).select_related('empresa').order_by('-ultima_visita') # Ordenar por el que vino más reciente

        return visitantes

    @staticmethod
    def obtener_historial_usuario(usuario_id):
        """
        Obtiene TODOS los ingresos de un usuario específico para el Timeline.
        """
        return RegistroIngreso.objects.filter(
            visitante_id=usuario_id
        ).select_related(
            'ubicacion', 
            'responsable',
            'pdf_descargo',
            'pdf_reporte_salida'
        ).order_by('-fecha_hora_ingreso')

    @staticmethod
    def reactivar_ingreso_actualizando_tiempo(ingreso_id, nueva_hora_limite_str):
        """
        LÓGICA CRÍTICA: Reactiva un ingreso finalizado.
        """
        with transaction.atomic():
            ingreso = RegistroIngreso.objects.select_for_update().get(pk=ingreso_id)

            # 1. Actualizar Hora Límite en Usuario
            from datetime import datetime
            nueva_hora_time = datetime.strptime(nueva_hora_limite_str, '%H:%M').time()
            usuario = ingreso.visitante
            usuario.tiempo_limite_jornada = nueva_hora_time
            usuario.save()

            # 2. Borrar PDF de salida anterior (ya no es válido)
            if ingreso.pdf_reporte_salida:
                ingreso.pdf_reporte_salida.delete()
                ingreso.pdf_reporte_salida = None
            
            # 3. Resetear Ingreso
            ingreso.fecha_hora_ingreso = timezone.now() # Actualizamos fecha a HOY
            ingreso.fecha_hora_salida = None
            ingreso.estado = RegistroIngreso.EstadoOpciones.EN_ZONA
            
            ingreso.save()
            return ingreso
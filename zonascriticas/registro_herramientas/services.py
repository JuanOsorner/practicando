# zonascriticas/registro_herramientas/services.py

from django.core.exceptions import ValidationError
from django.db import transaction
# IMPORTANTE: Importar ProtectedError para manejar borrados seguros
from django.db.models import ProtectedError
from .models import InventarioHerramienta, HerramientaIngresada
from descargo_responsabilidad.models import RegistroIngreso

class HerramientasService:
    
    @staticmethod
    def obtener_inventario_usuario(usuario, ingreso_id):
        """
        Devuelve el inventario y marca cuáles ya han sido ingresadas HOY.
        """
        items = InventarioHerramienta.objects.filter(usuario=usuario).order_by('-fecha_creacion')
        
        # Buscamos los IDs de inventario que YA están en HerramientaIngresada para ESTE ingreso
        ids_ingresados = HerramientaIngresada.objects.filter(
            registro_ingreso_id=ingreso_id,
            estado=HerramientaIngresada.EstadoHerramienta.INGRESADO
        ).values_list('herramienta_inventario_id', flat=True)

        # Helper para formatear
        def formatear(item):
            es_ingresado = item.id in ids_ingresados
            # Si ya está ingresado, buscamos la foto de evidencia de hoy, si no, la de referencia
            foto_url = item.foto_referencia.url if item.foto_referencia else None
            
            if es_ingresado:
                # Opcional: Podrías querer mostrar la foto de evidencia del día en lugar de la de referencia
                evidencia = HerramientaIngresada.objects.filter(
                    registro_ingreso_id=ingreso_id, 
                    herramienta_inventario_id=item.id
                ).first()
                if evidencia and evidencia.foto_evidencia:
                    foto_url = evidencia.foto_evidencia.url

            return {
                'id': item.id, 
                'nombre': item.nombre, 
                'marca': item.marca_serial, 
                'foto': foto_url,
                'ingresado': es_ingresado, # FLAG IMPORTANTE
                'categoria': item.categoria # IMPORTANTE para filtros en JS
            }

        return {
            'herramientas': [
                formatear(i) for i in items 
                if i.categoria == InventarioHerramienta.CategoriaOpciones.HERRAMIENTA
            ],
            'computo': [
                formatear(i) for i in items 
                if i.categoria == InventarioHerramienta.CategoriaOpciones.COMPUTO
            ]
        }

    @staticmethod
    def crear_item_inventario(usuario, data, archivo_foto=None):
        """
        Crea un nuevo ítem en el catálogo personal del usuario.
        """
        categoria = data.get('categoria')
        nombre = data.get('nombre')
        marca_serial = data.get('marca_serial')

        if not nombre or not marca_serial:
            raise ValidationError("Nombre y Marca/Serial son obligatorios.")

        # Validamos que la categoría sea válida según el modelo
        if categoria not in [c[0] for c in InventarioHerramienta.CategoriaOpciones.choices]:
            raise ValidationError("Categoría no válida.")

        nuevo_item = InventarioHerramienta(
            usuario=usuario,
            categoria=categoria,
            nombre=nombre,
            marca_serial=marca_serial,
            foto_referencia=archivo_foto # Puede ser None si no subió foto base
        )
        nuevo_item.save()
        return nuevo_item

    @staticmethod
    def registrar_ingreso_herramienta(registro_ingreso, data, archivo_evidencia):
        """
        Registra que una herramienta del inventario está entrando AHORA a planta.
        Requiere foto de evidencia obligatoria.
        """
        id_inventario = data.get('id_inventario')
        observaciones = data.get('observaciones', '')

        if not id_inventario:
            raise ValidationError("Se requiere el ID del ítem de inventario.")
        
        if not archivo_evidencia:
            raise ValidationError("La foto de evidencia es obligatoria para el ingreso.")

        try:
            item_inventario = InventarioHerramienta.objects.get(pk=id_inventario, usuario=registro_ingreso.visitante)
        except InventarioHerramienta.DoesNotExist:
            raise ValidationError("El ítem no existe o no pertenece a este usuario.")

        # Creamos el registro transaccional
        registro = HerramientaIngresada(
            registro_ingreso=registro_ingreso,
            herramienta_inventario=item_inventario,
            observaciones=observaciones,
            foto_evidencia=archivo_evidencia,
            estado=HerramientaIngresada.EstadoHerramienta.INGRESADO
        )
        registro.save()
        return registro

    @staticmethod
    def finalizar_proceso_registro(registro_ingreso):
        """
        Cierra la etapa de registro de herramientas.
        Retorna: La URL a la que debe redirigir el frontend.
        """
        # 1. Contar cuántas herramientas metió
        conteo = HerramientaIngresada.objects.filter(
            registro_ingreso=registro_ingreso,
            estado=HerramientaIngresada.EstadoHerramienta.INGRESADO
        ).count()
        
        # 2. VALIDACIÓN ESTRICTA: 
        # Si la modalidad es CON_EQUIPOS, DEBE haber al menos 1 herramienta.
        if registro_ingreso.modalidad == RegistroIngreso.ModalidadOpciones.CON_EQUIPOS:
            if conteo == 0:
                raise ValidationError("Tu modalidad 'Con Equipos' requiere registrar al menos una herramienta antes de continuar.")

        # 3. Cambio de Estado
        # El usuario pasa a estar oficialmente "En Zona"
        registro_ingreso.estado = RegistroIngreso.EstadoOpciones.EN_ZONA
        registro_ingreso.save()

        # 4. DECISIÓN DE RUTA (El Aiguilleur Local)
        # Si vino a trabajar (Equipos o Actividades), su siguiente pantalla lógica es Actividades.
        if registro_ingreso.modalidad == RegistroIngreso.ModalidadOpciones.CON_EQUIPOS:
            return '/actividades/'  # <--- REDIRECCIÓN DIRECTA A LA NUEVA APP
        
        # Si por alguna razón extraña llegó aquí siendo solo visita (no debería), al dashboard.
        return '/dashboard/'

    @staticmethod
    def actualizar_item_inventario(usuario, item_id, data, archivo_foto=None):
        """
        Actualiza nombre, marca, categoría o foto de un ítem existente.
        """
        try:
            item = InventarioHerramienta.objects.get(pk=item_id, usuario=usuario)
        except InventarioHerramienta.DoesNotExist:
            raise ValidationError("El ítem no existe o no te pertenece.")

        # Actualización de campos
        item.nombre = data.get('nombre', item.nombre)
        item.marca_serial = data.get('marca_serial', item.marca_serial)
        
        new_cat = data.get('categoria')
        if new_cat in [c[0] for c in InventarioHerramienta.CategoriaOpciones.choices]:
            item.categoria = new_cat

        if archivo_foto:
            item.foto_referencia = archivo_foto
        
        item.save()
        return item

    @staticmethod
    def eliminar_item_inventario(usuario, item_id):
        """
        Elimina un ítem del inventario. 
        Si ya fue usado en algún ingreso, la BD lanzará ProtectedError.
        """
        try:
            item = InventarioHerramienta.objects.get(pk=item_id, usuario=usuario)
            item.delete()
            return True
        except InventarioHerramienta.DoesNotExist:
            raise ValidationError("El ítem no existe.")
        except ProtectedError:
            raise ValidationError("No se puede eliminar: Este equipo tiene historial de ingresos. Edítalo o consérvalo.")

    @staticmethod
    def remover_item_del_carrito(ingreso_pendiente, id_inventario):
        """
        Elimina la relación entre el ingreso y la herramienta (Hard Delete de la tabla intermedia).
        """
        if not id_inventario:
            raise ValidationError("ID de inventario es requerido.")

        # Usamos filter().delete() para evitar errores si el ítem ya no existe (idempotencia).
        # Devuelve una tupla (cantidad_borrada, detalle_por_tipo)
        count, _ = HerramientaIngresada.objects.filter(
            registro_ingreso=ingreso_pendiente,
            herramienta_inventario_id=id_inventario
        ).delete()

        # Retornamos True si borró algo, False si no encontró nada (pero no es error)
        return count > 0

    @staticmethod
    def agregar_item_al_carrito(ingreso_pendiente, id_inventario):
        """
        Registra un ítem en la lista de ingreso (BD) de forma inmediata.
        
        Características:
        1. Idempotente: Si el ítem ya existe, lo devuelve en lugar de dar error.
        2. Reactivo: Si el ítem estaba marcado como 'SALIO' (retirado), lo vuelve a marcar como 'INGRESADO'.
        3. Inteligente: Si existe una foto de referencia en el inventario, la usa como 
           evidencia inicial temporal. Si no, deja el campo vacío (gracias a null=True).
        """
        # 1. Validar que el ítem de inventario exista y pertenezca al usuario
        try:
            item_inventario = InventarioHerramienta.objects.get(
                pk=id_inventario, 
                usuario=ingreso_pendiente.visitante
            )
        except InventarioHerramienta.DoesNotExist:
            raise ValidationError("El ítem de inventario no existe o no te pertenece.")

        # 2. Obtener o Crear (get_or_create)
        # Esto soluciona el error 400 "Ya está en la lista".
        # Busca por (registro_ingreso + herramienta). Si no lo encuentra, lo crea con 'defaults'.
        registro, created = HerramientaIngresada.objects.get_or_create(
            registro_ingreso=ingreso_pendiente,
            herramienta_inventario=item_inventario,
            defaults={
                'estado': HerramientaIngresada.EstadoHerramienta.INGRESADO,
                'observaciones': "Ingreso rápido desde panel.",
                # LÓGICA DE FOTO:
                # Si el inventario tiene foto de referencia, la copiamos como evidencia inicial.
                # Si no, se guarda como None (ahora permitido por la BD).
                'foto_evidencia': item_inventario.foto_referencia if item_inventario.foto_referencia else None
            }
        )

        # 3. Lógica de Reactivación
        # Si el registro YA existía (created=False) pero el usuario lo había sacado de la lista 
        # (Estado SALIO o similar), lo volvemos a poner como INGRESADO para que aparezca en el carrito.
        if not created:
            if registro.estado != HerramientaIngresada.EstadoHerramienta.INGRESADO:
                registro.estado = HerramientaIngresada.EstadoHerramienta.INGRESADO
                registro.save()

        return registro

    @staticmethod
    def gestion_masiva_carrito(ingreso_pendiente, lista_ids, accion='AGREGAR'):
        """
        Procesa una lista de IDs para agregar o quitar masivamente.
        accion: 'AGREGAR' | 'REMOVER'
        """
        resultados = {'exitos': 0, 'errores': 0}
        
        # Validamos que sea una lista
        if not isinstance(lista_ids, list):
            raise ValidationError("Se esperaba una lista de IDs.")

        with transaction.atomic(): # Todo o nada (Opcional, pero recomendado)
            for item_id in lista_ids:
                try:
                    if accion == 'AGREGAR':
                        # Reutilizamos la lógica unitaria que ya es idempotente
                        HerramientasService.agregar_item_al_carrito(ingreso_pendiente, item_id)
                    elif accion == 'REMOVER':
                        HerramientasService.remover_item_del_carrito(ingreso_pendiente, item_id)
                    
                    resultados['exitos'] += 1
                except Exception:
                    resultados['errores'] += 1
                    
        return resultados
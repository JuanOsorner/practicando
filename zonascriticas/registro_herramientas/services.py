"""
Esta capa se encarga de la logica del negocio para nuestro modulo de registro de herramientas
"""
from django.core.exceptions import ValidationError
from django.db import transaction
from .models import InventarioHerramienta, HerramientaIngresada
from descargo_responsabilidad.models import RegistroIngreso

class HerramientasService:
    
    @staticmethod
    def obtener_inventario_usuario(usuario):
        """
        Devuelve el inventario del usuario separado por categorías para el Frontend.
        """
        # Traemos todo el inventario de una vez para no hacer N queries
        items = InventarioHerramienta.objects.filter(usuario=usuario).order_by('-fecha_creacion')
        
        return {
            'herramientas': [
                {
                    'id': i.id, 
                    'nombre': i.nombre, 
                    'marca': i.marca_serial, 
                    'foto': i.foto_referencia.url if i.foto_referencia else None
                } 
                for i in items if i.categoria == InventarioHerramienta.CategoriaOpciones.HERRAMIENTA
            ],
            'computo': [
                {
                    'id': i.id, 
                    'nombre': i.nombre, 
                    'serial': i.marca_serial, # En cómputo le llamamos 'serial' al frontend
                    'foto': i.foto_referencia.url if i.foto_referencia else None
                } 
                for i in items if i.categoria == InventarioHerramienta.CategoriaOpciones.COMPUTO
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
        Cierra la etapa de registro y pasa al usuario a 'EN_ZONA'.
        Valida que al menos haya registrado algo si dijo que traía equipos.
        """
        # Opcional: Validar si realmente metió herramientas
        conteo = HerramientaIngresada.objects.filter(registro_ingreso=registro_ingreso).count()
        
        if conteo == 0:
            # Decisión de negocio: ¿Dejamos pasar si no registró nada aunque dijo que sí?
            # Por seguridad, asumimos que si llegó aquí es porque DEBE registrar algo.
            # Pero si el usuario se equivocó y no traía nada, podríamos dejarlo pasar o pedirle que cancele.
            # Por ahora, permitimos finalizar (quizás se arrepintió de meter equipos).
            pass 

        # CAMBIO DE ESTADO -> El usuario ya puede entrar al Dashboard
        registro_ingreso.estado = RegistroIngreso.EstadoOpciones.EN_ZONA
        registro_ingreso.save()
        return True
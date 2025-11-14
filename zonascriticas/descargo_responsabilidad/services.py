import logging
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.utils import timezone
from django.conf import settings
from io import BytesIO
from xhtml2pdf import pisa

# Importamos modelos y utilidades
from .models import RegistroIngreso, DocumentoPDF
from .utils import decodificar_imagen_base64
from login.models import Usuario

logger = logging.getLogger(__name__)

class UsuarioService:
    """
    Encapsula la lógica de negocio relacionada con la búsqueda
    y validación de usuarios para operaciones específicas.
    """
    
    @staticmethod
    def buscar_responsable_por_documento(documento: str) -> dict:
        """
        Busca un usuario por documento y valida si puede ser "responsable".
        Retorna un DTO (diccionario) solo con la data necesaria para el frontend.
        """
        if not documento:
            raise ValidationError("El documento no puede estar vacío.")

        try:
            # 1. Búsqueda en capa de datos
            user = Usuario.objects.get(numero_documento=documento)
            
            # 2. Validaciones de Negocio
            if not user.is_active:
                raise ValidationError(f"El usuario {user.first_name} se encuentra inactivo.")
            
            # TODO: Definir una lógica más estricta si es necesario.
            # Por ahora, cualquier usuario activo que no sea el visitante puede ser responsable.
            # if user.tipo != 'Administrador':
            #     raise ValidationError("El usuario no tiene permisos para ser responsable.")

            # 3. Preparar DTO de respuesta (Datos seguros para el frontend)
            cargo_nombre = user.cargo.nombre if user.cargo else "No asignado"
            
            return {
                "nombre": user.first_name,
                "cargo": cargo_nombre,
                "numero_documento": user.numero_documento,
                "id": user.id # El frontend lo necesitará para el POST
            }
            
        except Usuario.DoesNotExist:
            # Capturamos la excepción del modelo y la relanzamos
            # como una excepción de negocio más clara.
            raise ValueError(f"No se encontró ningún usuario con el documento {documento}.")
        except ValidationError as e:
            # Capturamos nuestras propias validaciones de negocio
            raise e
        except Exception as e:
            logger.error(f"Error inesperado en buscar_responsable_por_documento: {e}")
            raise Exception("Error interno al validar el responsable.")

class ZonaService:
    """
    Encargado de validar e interpretar los códigos QR de las zonas.
    """
    @staticmethod
    def obtener_info_zona(codigo_qr):
        """
        Recibe el string del QR y busca la zona.
        NOTA: Como aún no tenemos modelo de 'Zonas', simulamos la lógica o
        puedes conectarlo a tu modelo real si ya existe.
        """
        # MOCK para simular el json que deberia llegar al front
        zonas_mock = {
            'ZONA_NORTE_01': {'nombre': 'Cuarto de Servidores A', 'ciudad': 'Medellín'},
            'ZONA_SUR_02': {'nombre': 'Planta de Producción B', 'ciudad': 'Bogotá'},
            'LAB_CALIDAD': {'nombre': 'Laboratorio de Calidad', 'ciudad': 'Cali'},
        }
        
        zona = zonas_mock.get(codigo_qr)
        
        if not zona:
            # Si el código no está en la base de datos (o mock)
            raise ValueError(f"El código QR '{codigo_qr}' no corresponde a una zona válida.")
            
        return zona

class PDFService:
    """
    Encargado de generar el archivo PDF y enviarlo por correo.
    """
    @staticmethod
    def generar_pdf_descargo(registro_ingreso):
        """
        Genera el PDF en memoria usando un template HTML.
        """
        # 1. Definimos el contexto (datos) para el template del PDF
        context = {
            'registro': registro_ingreso,
            'visitante': registro_ingreso.visitante,
            'responsable': registro_ingreso.responsable,
            'fecha': timezone.now(),
            # IMPORTANTE: xhtml2pdf necesita rutas absolutas o staticfiles configurados
            'STATIC_URL': settings.STATIC_URL, 
        }

        # 2. Renderizamos el HTML a string
        # Necesitamos crear este template: 'descargo_responsabilidad/pdf/template_pdf.html'
        html_string = render_to_string('descargo_responsabilidad/pdf/template_pdf.html', context)

        # 3. Convertimos HTML a PDF (bytes)
        pdf_file = BytesIO()
        pisa_status = pisa.CreatePDF(html_string, dest=pdf_file)

        if pisa_status.err:
            raise Exception("Error al generar el PDF con xhtml2pdf")

        # Retornamos el contenido del archivo (bytes)
        return pdf_file.getvalue()

    @staticmethod
    def enviar_correo_con_adjunto(usuario, archivo_bytes, nombre_archivo):
        """
        Envía el correo electrónico con el PDF adjunto.
        """
        asunto = "Copia de Descargo de Responsabilidad - JoliFoods"
        mensaje = f"Hola {usuario.first_name},\n\nAdjunto encontrarás la copia de tu descargo de responsabilidad firmado digitalmente para el ingreso a zona crítica.\n\nGracias."
        
        email = EmailMessage(
            asunto,
            mensaje,
            settings.DEFAULT_FROM_EMAIL, # Remitente
            [usuario.email], # Destinatario
        )
        
        # Adjuntar PDF (nombre, contenido, tipo mime)
        email.attach(nombre_archivo, archivo_bytes, 'application/pdf')
        email.send(fail_silently=False)

class DescargoService:
    """
    Orquestador principal. Recibe los datos "crudos" del frontend
    y coordina a los otros servicios.
    """
    @staticmethod
    def procesar_ingreso(data, usuario_visitante):
        """
        Procesa todo el flujo de ingreso.
        Args:
            data (dict): JSON recibido del frontend (firmas, cedula responsable, checks, etc).
            usuario_visitante (Usuario): El usuario logueado que está llenando el form.
        """
        # 1. Validar Zona (QR)
        # El frontend envía el nombre/ciudad ya resueltos, pero idealmente validaríamos el código de nuevo.
        # Por ahora confiamos en los datos enviados o usamos ZonaService si el frontend manda el código.
        
        # 2. Validar Responsable
        try:
            responsable = Usuario.objects.get(numero_documento=data.get('cedulaResponsable'))
        except Usuario.DoesNotExist:
            raise ValueError("El responsable indicado no existe en el sistema.")

        # 3. Crear el Registro de Ingreso (Transacción BD)
        registro = RegistroIngreso(
            visitante=usuario_visitante,
            responsable=responsable,
            nombre_zona=data.get('nombreZona'),
            ciudad_zona=data.get('ciudadZona'),
            acepta_descargo=data.get('aceptaDescargo'),
            acepta_politicas=data.get('aceptaPoliticas'),
            ingresa_equipos=data.get('ingresaEquipos', 'NO'),
            # Convertir Base64 a Archivos Django
            firma_visitante=decodificar_imagen_base64(data.get('firmaVisitante'), f"vis_{usuario_visitante.id}.png"),
            firma_responsable=decodificar_imagen_base64(data.get('firmaResponsable'), f"resp_{responsable.id}.png"),
        )
        registro.save() # Guardamos para tener IDs y rutas de firmas

        # 4. Generar el PDF (En memoria)
        pdf_bytes = PDFService.generar_pdf_descargo(registro)
        nombre_pdf = f"descargo_zona_{registro.id}.pdf"

        # 5. Guardar el PDF en el sistema centralizado (DocumentoPDF)
        documento = DocumentoPDF(
            usuario=usuario_visitante,
            tipo=DocumentoPDF.TipoDocumento.DESCARGO,
            descripcion=f"Ingreso a {registro.nombre_zona}"
        )
        # Guardamos el contenido binario en el FileField
        documento.archivo.save(nombre_pdf, ContentFile(pdf_bytes))
        documento.save()

        # 6. Vincular el documento al registro
        registro.documento_asociado = documento
        registro.save()

        # 7. Enviar Correo (Async idealmente, pero síncrono por ahora)
        try:
            PDFService.enviar_correo_con_adjunto(usuario_visitante, pdf_bytes, nombre_pdf)
        except Exception as e:
            # No detenemos el proceso si falla el correo, solo logueamos
            logger.error(f"Error enviando correo de descargo: {e}")

        return registro
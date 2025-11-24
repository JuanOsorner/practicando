import logging
import requests
import os
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.utils import timezone
from django.conf import settings
from django.core.files.base import ContentFile
from io import BytesIO
from xhtml2pdf import pisa

# Importamos modelos y utilidades
from .models import RegistroIngreso, DocumentoPDF
from .utils import decodificar_imagen_base64
from login.models import Usuario
from .models import Ubicacion

logger = logging.getLogger(__name__)

class FreshserviceSync:
    """
    Servicio encargado de sincronizar activos usando Paginación y Palabras Clave.
    """
    
    DOMAIN = os.getenv('FRESHSERVICE_DOMAIN')
    API_KEY = os.getenv('FRESHSERVICE_API_KEY')
    # Leemos las palabras clave y las limpiamos
    KEYWORDS_STR = os.getenv('FRESHSERVICE_KEYWORDS', '')
    # Convertimos a lista: ['datacenter', 'impresora', 'dc']
    KEYWORDS = [k.strip().lower() for k in KEYWORDS_STR.split(',') if k.strip()]

    @staticmethod
    def _obtener_valor_dinamico(diccionario, prefijo):
        if not diccionario: return None
        for key, value in diccionario.items():
            if key.startswith(prefijo): return value
        return None

    @staticmethod
    def _es_zona_critica(nombre_activo):
        """
        Algoritmo de coincidencia:
        Devuelve True si alguna palabra clave está dentro del nombre del activo.
        """
        if not nombre_activo:
            return False
        
        nombre_lower = nombre_activo.lower()
        
        for keyword in FreshserviceSync.KEYWORDS:
            # Buscamos la palabra clave dentro del nombre
            if keyword in nombre_lower:
                return True
        return False

    @classmethod
    def sincronizar_activos(cls):
        if not cls.DOMAIN or not cls.API_KEY:
            raise ValueError("Faltan credenciales en .env")
        
        if not cls.KEYWORDS:
            print("⚠️ ADVERTENCIA: No hay palabras clave definidas en FRESHSERVICE_KEYWORDS.")

        base_url = f"https://{cls.DOMAIN}/api/v2/assets"
        auth = (cls.API_KEY, 'X')
        
        # Estadísticas
        stats = {
            'total_paginas': 0,
            'total_analizados': 0,
            'importados': 0,
            'creados': 0,
            'actualizados': 0
        }

        page = 1
        continuar = True

        print(f"🔍 Iniciando búsqueda por palabras clave: {cls.KEYWORDS}")

        while continuar:
            # Petición paginada
            params = {
                'include': 'type_fields',
                'per_page': 50,  # Máximo permitido por Freshservice
                'page': page
            }
            
            try:
                print(f"⏳ Descargando página {page}...")
                response = requests.get(base_url, params=params, auth=auth)
                
                # Si falla (ej: 429 Rate Limit), lanzamos error
                response.raise_for_status()
                
                data = response.json()
                activos = data.get('assets', [])

                # SI LA LISTA ESTÁ VACÍA, TERMINAMOS EL BUCLE
                if not activos:
                    break

                stats['total_paginas'] += 1
                stats['total_analizados'] += len(activos)

                for asset in activos:
                    nombre = asset.get('name', '')
                    
                    # 1. FILTRO DE PALABRAS CLAVE 🕵️‍♂️
                    if not cls._es_zona_critica(nombre):
                        continue # Si no coincide, pasamos al siguiente
                    
                    # 2. VALIDACIÓN DE INTEGRIDAD
                    type_fields = asset.get('type_fields', {})
                    ciudad = cls._obtener_valor_dinamico(type_fields, 'ubicacin_')
                    asset_tag = asset.get('asset_tag')

                    # Si es impresora, quizás la ciudad no es obligatoria en FS, 
                    # pero para tu app sí. Tú decides. 
                    # Aquí asumimos que si tiene QR, lo importamos.
                    if not asset_tag:
                        continue

                    # 3. GUARDADO (UPSERT)
                    obj, created = Ubicacion.objects.update_or_create(
                        freshservice_id=asset.get('id'),
                        defaults={
                            'nombre': nombre,
                            'codigo_qr': asset_tag,
                            'ciudad': ciudad if ciudad else "No Definida", # Fallback por si acaso
                            'descripcion': asset.get('description', ''),
                            'activa': True
                        }
                    )

                    stats['importados'] += 1
                    if created:
                        stats['creados'] += 1
                    else:
                        stats['actualizados'] += 1

                # Preparamos siguiente iteración
                page += 1
                
                # Pausa de seguridad para no saturar la API (buena práctica en scripts masivos)
                import time
                time.sleep(0.5) 

            except requests.RequestException as e:
                logger.error(f"Error en página {page}: {e}")
                raise e

        return stats
        
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
    Encargado de validar e interpretar los códigos QR de las zonas usando la DB Local.
    """
    @staticmethod
    def obtener_info_zona(codigo_qr):
        """
        Busca la zona en la tabla sincronizada Ubicacion.
        """
        if not codigo_qr:
            raise ValueError("El código QR está vacío.")

        try:
            # CONSULTA REAL A LA BASE DE DATOS
            zona = Ubicacion.objects.get(codigo_qr=codigo_qr, activa=True)
            
            # Retornamos DTO incluyendo el ID
            return {
                'id': zona.id, # VITAL PARA LA RELACIÓN
                'nombre': zona.nombre,
                'ciudad': zona.ciudad,
                'descripcion': zona.descripcion
            }
            
        except Ubicacion.DoesNotExist:
            # Si no está en la base de datos, significa que no sincronizamos esa zona
            raise ValueError(f"El código QR '{codigo_qr}' no corresponde a una Zona Crítica válida o no ha sido sincronizada.")

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
            'STATIC_URL': settings.STATIC_URL, 
            'nombre_zona': registro_ingreso.ubicacion.nombre,
            'ciudad_zona': registro_ingreso.ubicacion.ciudad,
        }

        # 2. Renderizamos el HTML a string
        # Necesitamos crear este template: 'descargo_responsabilidad/pdf/template_pdf.html'
        html_string = render_to_string('template_pdf.html', context)

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
    Orquestador principal.
    """
    @staticmethod
    def procesar_ingreso(data, usuario_visitante):
        # 1. Validar Responsable
        try:
            id_responsable = data.get('idResponsable')
            if not id_responsable: raise ValueError("No se recibió el ID del responsable.")
            responsable = Usuario.objects.get(pk=id_responsable)
        except Usuario.DoesNotExist:
            raise ValueError("El responsable indicado no existe en el sistema.")

        # 2. Validar Ubicación (Zona)
        try:
            id_zona = data.get('idZona') 
            ubicacion = Ubicacion.objects.get(pk=id_zona)
        except Ubicacion.DoesNotExist:
            raise ValueError("La zona indicada no es válida.")

        # --- 3. DETERMINAR EL ESTADO INICIAL (Lógica de Negocio) ---
        ingresa_equipos_valor = data.get('ingresaEquipos', 'NO')
        
        # Si trae equipos, lo ponemos en PENDIENTE para que el Aiguilleur lo desvíe.
        # Si NO trae equipos, pasa directo a EN ZONA.
        if ingresa_equipos_valor == 'SI':
            estado_inicial = RegistroIngreso.EstadoOpciones.PENDIENTE_HERRAMIENTAS
        else:
            estado_inicial = RegistroIngreso.EstadoOpciones.EN_ZONA

        # 4. Crear el Registro
        registro = RegistroIngreso(
            visitante=usuario_visitante,
            responsable=responsable,
            ubicacion=ubicacion,
            acepta_descargo=data.get('aceptaDescargo'),
            acepta_politicas=data.get('aceptaPoliticas'),
            ingresa_equipos=ingresa_equipos_valor,
            estado=estado_inicial, # <--- USAMOS EL ESTADO CALCULADO
            firma_visitante=decodificar_imagen_base64(data.get('firmaVisitante'), f"vis_{usuario_visitante.id}.png"),
            firma_responsable=decodificar_imagen_base64(data.get('firmaResponsable'), f"resp_{responsable.id}.png"),
        )
        registro.save()
        
        # 5. Generar PDF y Documento
        pdf_bytes = PDFService.generar_pdf_descargo(registro)
        nombre_pdf = f"descargo_zona_{registro.id}.pdf"
        
        documento = DocumentoPDF(
            usuario=usuario_visitante,
            tipo=DocumentoPDF.TipoDocumento.DESCARGO,
            descripcion=f"Ingreso a {ubicacion.nombre}"
        )
        documento.archivo.save(nombre_pdf, ContentFile(pdf_bytes))
        documento.save()

        registro.documento_asociado = documento
        registro.save()

        try:
            PDFService.enviar_correo_con_adjunto(usuario_visitante, pdf_bytes, nombre_pdf)
        except Exception as e:
            logger.error(f"Error enviando correo de descargo: {e}")

        return registro
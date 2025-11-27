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
from home.utils import decodificar_imagen_base64
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
        context = {
            'registro': registro_ingreso,
            'visitante': registro_ingreso.visitante,
            'responsable': registro_ingreso.responsable,
            'fecha': timezone.now(),
            'STATIC_URL': settings.STATIC_URL, 
            'nombre_zona': registro_ingreso.ubicacion.nombre,
            'ciudad_zona': registro_ingreso.ubicacion.ciudad,
            'modalidad': registro_ingreso.modalidad, # Pasamos la modalidad al template
        }

        html_string = render_to_string('template_pdf.html', context)
        pdf_file = BytesIO()
        pisa_status = pisa.CreatePDF(html_string, dest=pdf_file)

        if pisa_status.err:
            raise Exception("Error al generar el PDF con xhtml2pdf")

        return pdf_file.getvalue()

    @staticmethod
    def enviar_correo_con_adjunto(usuario, archivo_bytes, nombre_archivo):
        asunto = "Copia de Descargo de Responsabilidad - JoliFoods"
        mensaje = f"Hola {usuario.first_name},\n\nAdjunto encontrarás la copia de tu descargo de responsabilidad firmado digitalmente.\n\nGracias."
        
        email = EmailMessage(
            asunto, mensaje, settings.DEFAULT_FROM_EMAIL, [usuario.email]
        )
        email.attach(nombre_archivo, archivo_bytes, 'application/pdf')
        email.send(fail_silently=False)

class DescargoService:
    """
    Orquestador principal del Ingreso.
    """
    @staticmethod
    def procesar_ingreso(data, usuario_visitante):
        # 1. Validar Responsable
        try:
            id_responsable = data.get('idResponsable')
            if not id_responsable: raise ValueError("No se recibió el ID del responsable.")
            responsable = Usuario.objects.get(pk=id_responsable)
        except Usuario.DoesNotExist:
            raise ValueError("El responsable indicado no existe.")

        # 2. Validar Ubicación
        try:
            id_zona = data.get('idZona') 
            ubicacion = Ubicacion.objects.get(pk=id_zona)
        except Ubicacion.DoesNotExist:
            raise ValueError("La zona indicada no es válida.")

        # --- 3. DETERMINAR ESTADO BASADO EN MODALIDAD (Lógica Nueva) ---
        modalidad_valor = data.get('modalidad', RegistroIngreso.ModalidadOpciones.VISITA)
        
        # Validar que la modalidad enviada exista en las opciones
        if modalidad_valor not in RegistroIngreso.ModalidadOpciones.values:
             # Fallback por seguridad
             modalidad_valor = RegistroIngreso.ModalidadOpciones.VISITA

        if modalidad_valor == RegistroIngreso.ModalidadOpciones.CON_EQUIPOS:
            estado_inicial = RegistroIngreso.EstadoOpciones.PENDIENTE_HERRAMIENTAS
        else:
            # Tanto VISITA como SOLO_ACTIVIDADES pasan directo a EN_ZONA.
            # (El router del frontend decidirá qué pantalla mostrar según la modalidad)
            estado_inicial = RegistroIngreso.EstadoOpciones.EN_ZONA

        # 4. Crear el Registro
        registro = RegistroIngreso(
            visitante=usuario_visitante,
            responsable=responsable,
            ubicacion=ubicacion,
            acepta_descargo=data.get('aceptaDescargo'),
            acepta_politicas=data.get('aceptaPoliticas'),
            modalidad=modalidad_valor, # <--- CAMBIO CRÍTICO
            estado=estado_inicial,
            firma_visitante=decodificar_imagen_base64(data.get('firmaVisitante'), f"vis_{usuario_visitante.id}.png"),
            firma_responsable=decodificar_imagen_base64(data.get('firmaResponsable'), f"resp_{responsable.id}.png"),
        )
        registro.save()
        
        # 5. Generar PDF de Entrada (Descargo)
        try:
            pdf_bytes = PDFService.generar_pdf_descargo(registro)
            nombre_pdf = f"descargo_entrada_{registro.id}.pdf"
            
            # Crear registro en DocumentoPDF
            documento = DocumentoPDF(
                usuario=usuario_visitante,
                tipo=DocumentoPDF.TipoDocumento.DESCARGO,
                descripcion=f"Ingreso a {ubicacion.nombre} ({modalidad_valor})"
            )
            documento.archivo.save(nombre_pdf, ContentFile(pdf_bytes))
            documento.save()

            # Vincular al RegistroIngreso (Campo nuevo)
            registro.pdf_descargo = documento
            registro.save()

            # Enviar correo
            PDFService.enviar_correo_con_adjunto(usuario_visitante, pdf_bytes, nombre_pdf)
            
        except Exception as e:
            logger.error(f"Error generando PDF de entrada: {e}")
            # No detenemos el flujo si falla el PDF, pero queda logueado.

        return registro

class SalidaService:
    """
    Gestiona el Check-out de la zona.
    """
    @staticmethod
    def cerrar_zona(usuario):
        # 1. Buscar el ingreso activo
        ingreso = RegistroIngreso.objects.filter(
            visitante=usuario,
            estado=RegistroIngreso.EstadoOpciones.EN_ZONA
        ).first()

        if not ingreso:
            raise ValidationError("No tienes un ingreso activo para cerrar.")

        # 2. VALIDACIÓN DE NEGOCIO: Actividades Pendientes
        # Usamos la relación inversa 'actividades_registradas' definida en el modelo Actividad
        actividades_pendientes = ingreso.actividades_registradas.filter(estado='EN_PROCESO').count()
        
        if actividades_pendientes > 0:
            raise ValidationError(f"No puedes salir. Tienes {actividades_pendientes} actividades sin finalizar (Rojas).")

        # 3. Cierre Lógico
        ingreso.fecha_hora_salida = timezone.now()
        ingreso.estado = RegistroIngreso.EstadoOpciones.FINALIZADO
        ingreso.save() # Guardamos primero para asegurar la hora de salida

        # 4. Generación de Evidencia (PDF Salida)
        try:
            pdf_bytes = PDFService.generar_reporte_salida(ingreso)
            nombre_pdf = f"reporte_salida_{ingreso.id}.pdf"

            # Crear DocumentoPDF
            documento = DocumentoPDF(
                usuario=usuario,
                tipo=DocumentoPDF.TipoDocumento.REPORTE_SALIDA, # Usamos el nuevo tipo
                descripcion=f"Reporte Salida {ingreso.ubicacion.nombre}"
            )
            documento.archivo.save(nombre_pdf, ContentFile(pdf_bytes))
            documento.save()

            # Vincular al ingreso
            ingreso.pdf_reporte_salida = documento
            ingreso.save()

            # Enviar correo
            PDFService.enviar_reporte_final(usuario, pdf_bytes, nombre_pdf)

        except Exception as e:
            # Loguear error pero no revertir la salida (el usuario ya salió)
            print(f"Error generando reporte salida: {e}")
            # Si quieres ser estricto, podrías hacer rollback aquí, 
            # pero mejor dejar salir al usuario y arreglar el PDF luego.

        return ingreso
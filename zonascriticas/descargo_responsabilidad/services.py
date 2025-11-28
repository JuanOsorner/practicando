import logging
import requests
import os
from django.core.mail import EmailMessage
from django.utils import timezone
from django.conf import settings
from django.core.files.base import ContentFile

# Importamos modelos
from .models import RegistroIngreso, DocumentoPDF
from home.utils import decodificar_imagen_base64, PDFGenerator # <-- IMPORTANTE
from login.models import Usuario
from .models import Ubicacion

logger = logging.getLogger(__name__)

class FreshserviceSync:
    DOMAIN = os.getenv('FRESHSERVICE_DOMAIN')
    API_KEY = os.getenv('FRESHSERVICE_API_KEY')
    KEYWORDS_STR = os.getenv('FRESHSERVICE_KEYWORDS', '')
    KEYWORDS = [k.strip().lower() for k in KEYWORDS_STR.split(',') if k.strip()]

    @staticmethod
    def _obtener_valor_dinamico(diccionario, prefijo):
        if not diccionario: return None
        for key, value in diccionario.items():
            if key.startswith(prefijo): return value
        return None

    @staticmethod
    def _es_zona_critica(nombre_activo):
        if not nombre_activo: return False
        nombre_lower = nombre_activo.lower()
        for keyword in FreshserviceSync.KEYWORDS:
            if keyword in nombre_lower:
                return True
        return False

    @classmethod
    def sincronizar_activos(cls):
        if not cls.DOMAIN or not cls.API_KEY:
            raise ValueError("Faltan credenciales en .env")
        
        base_url = f"https://{cls.DOMAIN}/api/v2/assets"
        auth = (cls.API_KEY, 'X')
        stats = {'total_paginas': 0, 'total_analizados': 0, 'importados': 0, 'creados': 0, 'actualizados': 0}
        page = 1
        continuar = True

        while continuar:
            params = {'include': 'type_fields', 'per_page': 50, 'page': page}
            try:
                response = requests.get(base_url, params=params, auth=auth)
                response.raise_for_status()
                data = response.json()
                activos = data.get('assets', [])
                if not activos: break

                stats['total_paginas'] += 1
                stats['total_analizados'] += len(activos)

                for asset in activos:
                    nombre = asset.get('name', '')
                    if not cls._es_zona_critica(nombre): continue
                    
                    type_fields = asset.get('type_fields', {})
                    ciudad = cls._obtener_valor_dinamico(type_fields, 'ubicacin_')
                    asset_tag = asset.get('asset_tag')
                    if not asset_tag: continue

                    obj, created = Ubicacion.objects.update_or_create(
                        freshservice_id=asset.get('id'),
                        defaults={
                            'nombre': nombre,
                            'codigo_qr': asset_tag,
                            'ciudad': ciudad if ciudad else "No Definida",
                            'descripcion': asset.get('description', ''),
                            'activa': True
                        }
                    )
                    stats['importados'] += 1
                    if created: stats['creados'] += 1
                    else: stats['actualizados'] += 1

                page += 1
                import time
                time.sleep(0.5) 
            except requests.RequestException as e:
                logger.error(f"Error en página {page}: {e}")
                raise e
        return stats

class UsuarioService:

    @staticmethod
    def buscar_responsable_por_documento(documento: str) -> dict:
        if not documento: raise ValueError("El documento no puede estar vacío.")
        try:
            user = Usuario.objects.get(numero_documento=documento)
            if not user.is_active: raise ValueError(f"Usuario inactivo.")
            return {
                "nombre": user.first_name,
                "cargo": user.cargo.nombre if user.cargo else "No asignado",
                "numero_documento": user.numero_documento,
                "id": user.id
            }
        except Usuario.DoesNotExist:
            raise ValueError(f"No encontrado: {documento}")
        except Exception as e:
            raise Exception("Error interno validando responsable.")

class ZonaService:

    @staticmethod
    def obtener_info_zona(codigo_qr):
        if not codigo_qr: raise ValueError("QR vacío.")
        try:
            zona = Ubicacion.objects.get(codigo_qr=codigo_qr, activa=True)
            return {'id': zona.id, 'nombre': zona.nombre, 'ciudad': zona.ciudad, 'descripcion': zona.descripcion}
        except Ubicacion.DoesNotExist:
            raise ValueError(f"QR '{codigo_qr}' no válido.")

class PDFService:
    """
    Servicio ligero que delega la creación a PDFGenerator (en utils).
    """
    @staticmethod
    def generar_pdf_descargo(registro):
        # Delegamos al motor centralizado
        return PDFGenerator.crear_acta_ingreso(registro)

    @staticmethod
    def generar_reporte_salida(registro):
        # Delegamos al motor centralizado
        return PDFGenerator.crear_reporte_salida(registro)

    @staticmethod
    def enviar_correo_con_adjunto(usuario, archivo_bytes, nombre_archivo):
        asunto = "Documento Zonas Críticas - JoliFoods"
        mensaje = f"Hola {usuario.first_name},\n\nAdjunto encontrarás el documento ({nombre_archivo}).\n\nGracias."
        
        email = EmailMessage(
            asunto, mensaje, settings.DEFAULT_FROM_EMAIL, [usuario.email]
        )
        if isinstance(archivo_bytes, str):
            archivo_bytes = archivo_bytes.encode('latin-1')
        elif isinstance(archivo_bytes, bytearray):
            archivo_bytes = bytes(archivo_bytes)

        email.attach(nombre_archivo, archivo_bytes, 'application/pdf')
        email.send(fail_silently=False)

    @staticmethod
    def enviar_reporte_final(usuario, archivo_bytes, nombre_archivo):
        PDFService.enviar_correo_con_adjunto(usuario, archivo_bytes, nombre_archivo)


class DescargoService:
    @staticmethod
    def procesar_ingreso(data, usuario_visitante):
        # 1. Validaciones
        try:
            responsable = Usuario.objects.get(pk=data.get('idResponsable'))
            ubicacion = Ubicacion.objects.get(pk=data.get('idZona'))
        except (Usuario.DoesNotExist, Ubicacion.DoesNotExist):
            raise ValueError("Datos inválidos (Responsable o Zona).")

        modalidad = data.get('modalidad', RegistroIngreso.ModalidadOpciones.VISITA)
        estado = RegistroIngreso.EstadoOpciones.PENDIENTE_HERRAMIENTAS if modalidad == RegistroIngreso.ModalidadOpciones.CON_EQUIPOS else RegistroIngreso.EstadoOpciones.EN_ZONA

        # 2. Crear Registro
        registro = RegistroIngreso(
            visitante=usuario_visitante,
            responsable=responsable,
            ubicacion=ubicacion,
            acepta_descargo=data.get('aceptaDescargo'),
            acepta_politicas=data.get('aceptaPoliticas'),
            modalidad=modalidad, 
            estado=estado,
            firma_visitante=decodificar_imagen_base64(data.get('firmaVisitante'), f"vis_{usuario_visitante.id}.png"),
            firma_responsable=decodificar_imagen_base64(data.get('firmaResponsable'), f"resp_{responsable.id}.png"),
        )
        registro.save()
        
        # 3. Generar PDF (Ahora es una llamada limpia)
        try:
            pdf_bytes = PDFService.generar_pdf_descargo(registro)
            nombre_pdf = f"descargo_{registro.id}.pdf"
            
            documento = DocumentoPDF(
                usuario=usuario_visitante,
                tipo=DocumentoPDF.TipoDocumento.DESCARGO,
                descripcion=f"Ingreso a {ubicacion.nombre}"
            )
            documento.archivo.save(nombre_pdf, ContentFile(pdf_bytes))
            documento.save()

            registro.pdf_descargo = documento
            registro.save()

            PDFService.enviar_correo_con_adjunto(usuario_visitante, pdf_bytes, nombre_pdf)
        except Exception as e:
            logger.error(f"Error generando PDF entrada: {e}")

        return registro

class SalidaService:
    @staticmethod
    def cerrar_zona(usuario):
        ingreso = RegistroIngreso.objects.filter(
            visitante=usuario,
            estado=RegistroIngreso.EstadoOpciones.EN_ZONA
        ).first()

        if not ingreso: raise ValueError("No hay ingreso activo.")

        # Validar actividades pendientes
        if ingreso.actividades_registradas.filter(estado='EN_PROCESO').exists():
            raise ValueError("Hay actividades pendientes (Rojas).")

        ingreso.fecha_hora_salida = timezone.now()
        ingreso.estado = RegistroIngreso.EstadoOpciones.FINALIZADO
        ingreso.save()

        try:
            # Generación limpia
            pdf_bytes = PDFService.generar_reporte_salida(ingreso)
            nombre_pdf = f"reporte_salida_{ingreso.id}.pdf"

            documento = DocumentoPDF(
                usuario=usuario,
                tipo=DocumentoPDF.TipoDocumento.REPORTE_SALIDA,
                descripcion=f"Salida {ingreso.ubicacion.nombre}"
            )
            documento.archivo.save(nombre_pdf, ContentFile(pdf_bytes))
            documento.save()

            ingreso.pdf_reporte_salida = documento
            ingreso.save()

            PDFService.enviar_reporte_final(usuario, pdf_bytes, nombre_pdf)
        except Exception as e:
            logger.error(f"Error reporte salida: {e}")

        return ingreso
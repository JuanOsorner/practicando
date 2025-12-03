import os
import uuid
import base64
import logging
from datetime import datetime, timedelta
from django.http import JsonResponse
from django.utils.deconstruct import deconstructible
from typing import Any, Optional
from django.core.files.base import ContentFile
from fpdf import FPDF
from django.utils import timezone

# Configurar logger
logger = logging.getLogger(__name__)

"""
🚨 MODULO DE UTILIDADES CENTRALIZADO 🚨
Incluye:
1. Gestión de Archivos (Rutas)
2. Respuestas API Estandarizadas
3. Motor de Generación de PDF (PDFEngine)
4. Lógica de Tiempo y Jornada (CronometroJornada)
"""

# ======================================================
# === 1. GESTIÓN DE ARCHIVOS ===
# ======================================================

@deconstructible
class GeneradorRutaArchivo:
    def __init__(self, sub_carpeta: str):
        self.sub_carpeta = sub_carpeta

    def __call__(self, instance: Any, filename: str) -> str:
        ext = filename.split('.')[-1].lower()
        nuevo_nombre = f"{uuid.uuid4()}.{ext}"
        ahora = datetime.now()
        return os.path.join(
            self.sub_carpeta,
            str(ahora.year),
            str(ahora.month),
            nuevo_nombre
        )

# ======================================================
# === 2. HELPERS API ===
# ======================================================

def api_response(data: Any = None, success: bool = True, message: str = "Operación exitosa", status_code: int = 200) -> JsonResponse:
    response_data = {
        "success": success,
        "message": message,
        "payload": data,
        "timestamp": datetime.now().isoformat()
    }
    return JsonResponse(response_data, status=status_code)

def decodificar_imagen_base64(data_uri: str, nombre_archivo: str = "archivo.png") -> Optional[ContentFile]:
    if not data_uri or not isinstance(data_uri, str):
        return None
    
    if 'base64,' in data_uri:
        try:
            _, imgstr = data_uri.split(';base64,')
        except ValueError:
            return None
    else:
        imgstr = data_uri

    try:
        decoded_file = base64.b64decode(imgstr)
    except Exception:
        return None

    return ContentFile(decoded_file, name=nombre_archivo)


# ======================================================
# === 3. MOTOR PDF ===
# ======================================================

class BrandPDF(FPDF):
    """
    Clase base con la identidad visual de Joli Foods.
    Maneja Header y Footer automáticamente.
    """
    def header(self):
        # Título Principal
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(53, 36, 96) # Color Corporativo #352460
        self.cell(0, 10, "JOLI FOODS S.A.S.", align="C", new_x="LMARGIN", new_y="NEXT")
        
        # Subtítulo
        self.set_font("Helvetica", "", 10)
        self.set_text_color(85, 85, 85) # Gris oscuro
        self.cell(0, 6, "CONTROL DE ZONAS CRÍTICAS", align="C", new_x="LMARGIN", new_y="NEXT")
        
        # Línea separadora
        self.set_draw_color(53, 36, 96)
        self.set_line_width(0.5)
        self.line(self.l_margin, self.get_y() + 2, 215.9 - self.r_margin, self.get_y() + 2)
        self.ln(8)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(128)
        self.cell(0, 10, f"Página {self.page_no()}/{{nb}} - Generado por ZonasCriticasApp", align="C")


class PDFGenerator:
    """
    Fachada estática para generar los distintos tipos de reportes.
    Aísla la lógica de 'dibujado' de la lógica de negocio.
    """

    @staticmethod
    def _crear_lienzo():
        pdf = BrandPDF(orientation="P", unit="mm", format="Letter")
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()
        return pdf

    @staticmethod
    def crear_acta_ingreso(registro) -> bytes:
        """
        Dibuja el Acta de Descargo de Responsabilidad.
        """
        pdf = PDFGenerator._crear_lienzo()
        
        # Datos
        visitante = registro.visitante
        responsable = registro.responsable
        ubicacion = registro.ubicacion
        fecha_str = registro.fecha_hora_ingreso.strftime("%d/%m/%Y %H:%M")

        # Título
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(0)
        pdf.cell(0, 10, "ACTA DE DESCARGO DE RESPONSABILIDAD E INGRESO", align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)

        # Texto Legal
        pdf.set_font("Helvetica", "", 10)
        
        texto_1 = (
            f"En la ciudad de {ubicacion.ciudad or '(No definida)'}, y con el fin de ingresar a la zona crítica "
            f"denominada '{ubicacion.nombre}', a fecha de {fecha_str}, yo, "
            f"{visitante.first_name}, identificado(a) con documento número {visitante.numero_documento}, "
            f"actuando en mi calidad de {visitante.cargo.nombre if visitante.cargo else 'Usuario'} "
            f"para la empresa {visitante.empresa.nombre_empresa if visitante.empresa else 'Joli Foods'}, "
            "declaro que he leído, comprendido y aceptado los términos y condiciones de seguridad."
        )
        pdf.multi_cell(0, 5, texto_1)
        pdf.ln(5)

        texto_2 = (
            f"Comprendo que mi ingreso se realiza bajo la autorización de {responsable.first_name}, "
            f"con documento {responsable.numero_documento}. Exonero a JOLI FOODS S.A.S. de toda responsabilidad "
            "civil o penal por cualquier incidente derivado del incumplimiento de normas."
        )
        pdf.multi_cell(0, 5, texto_2)
        pdf.ln(8)

        # Modalidad
        if registro.modalidad == 'CON_EQUIPOS':
            pdf.set_fill_color(240, 240, 240)
            pdf.set_font("Helvetica", "B", 9)
            pdf.multi_cell(0, 8, "DECLARACIÓN DE EQUIPOS: El visitante ingresa con equipos sujetos a verificación.", border=1, fill=True, align='C')
        else:
            pdf.set_font("Helvetica", "I", 9)
            pdf.cell(0, 8, "* El visitante declara NO ingresar equipos adicionales.", ln=True)
        
        pdf.ln(15)

        # Firmas
        PDFGenerator._dibujar_firmas(pdf, registro)

        return bytes(pdf.output())

    @staticmethod
    def crear_reporte_salida(registro) -> bytes:
        """
        Dibuja el Reporte de Salida y Actividades.
        """
        pdf = PDFGenerator._crear_lienzo()
        
        # Título
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 10, "REPORTE DE SALIDA Y ACTIVIDADES", align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)

        # Resumen General
        pdf.set_font("Helvetica", "", 10)
        # Usamos timezone.now() o la fecha del registro si ya se cerró
        hora_salida = datetime.now().strftime("%d/%m/%Y %H:%M") 
        if registro.fecha_hora_salida:
            hora_salida = registro.fecha_hora_salida.strftime("%d/%m/%Y %H:%M")
            
        hora_entrada = registro.fecha_hora_ingreso.strftime("%d/%m/%Y %H:%M")
        
        pdf.cell(0, 6, f"Visitante: {registro.visitante.first_name}", ln=True)
        pdf.cell(0, 6, f"Zona: {registro.ubicacion.nombre}", ln=True)
        pdf.cell(0, 6, f"Entrada: {hora_entrada}  |  Salida: {hora_salida}", ln=True)
        pdf.ln(5)

        # Tabla de Actividades
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(0, 8, "Resumen de Actividades Realizadas:", ln=True)
        
        pdf.set_fill_color(220, 220, 220)
        pdf.cell(10, 8, "#", border=1, fill=True)
        pdf.cell(120, 8, "Descripción", border=1, fill=True)
        pdf.cell(60, 8, "Estado", border=1, fill=True, ln=True)
        
        pdf.set_font("Helvetica", "", 9)
        # Accedemos a las actividades usando el related_name del modelo
        actividades = registro.actividades_registradas.all()
        
        if actividades:
            for i, act in enumerate(actividades, 1):
                estado_texto = act.get_estado_display() # Método mágico de Django para choices
                pdf.cell(10, 8, str(i), border=1)
                desc = str(act.titulo)[:65] # Usamos título en vez de descripción larga
                pdf.cell(120, 8, desc, border=1)
                pdf.cell(60, 8, estado_texto, border=1, ln=True)
        else:
            pdf.cell(0, 8, "No se registraron actividades específicas.", border=1, ln=True)

        pdf.ln(10)
        pdf.set_font("Helvetica", "I", 8)
        pdf.cell(0, 6, "Este documento certifica el cierre del ingreso y la salida del personal.", align="C")

        return bytes(pdf.output())

    @staticmethod
    def _dibujar_firmas(pdf, registro):
        """
        Helper privado para dibujar el bloque de firmas.
        """
        y_inicio = pdf.get_y()
        
        if y_inicio > 220:
            pdf.add_page()
            y_inicio = pdf.get_y()

        # Firma Visitante
        pdf.set_xy(25, y_inicio)
        if registro.firma_visitante:
            try:
                if hasattr(registro.firma_visitante, 'path'):
                    pdf.image(registro.firma_visitante.path, w=50)
            except Exception as e:
                logger.error(f"Error firma visitante: {e}")
                pdf.cell(50, 20, "[Error Imagen]", border=1)

        # Firma Responsable
        pdf.set_xy(140, y_inicio)
        if registro.firma_responsable:
            try:
                if hasattr(registro.firma_responsable, 'path'):
                    pdf.image(registro.firma_responsable.path, w=50)
            except Exception as e:
                logger.error(f"Error firma responsable: {e}")
                pdf.cell(50, 20, "[Error Imagen]", border=1)

        # Textos
        y_texto = y_inicio + 25
        pdf.set_font("Helvetica", "B", 8)
        
        pdf.set_xy(25, y_texto)
        pdf.multi_cell(50, 4, f"Firma del Declarante\n{registro.visitante.first_name}\nCC: {registro.visitante.numero_documento}", align="C")
        pdf.line(25, y_texto, 75, y_texto)

        pdf.set_xy(140, y_texto)
        pdf.multi_cell(50, 4, f"Firma del Autorizador\n{registro.responsable.first_name}\nCC: {registro.responsable.numero_documento}", align="C")
        pdf.line(140, y_texto, 190, y_texto)


# ======================================================
# === 4. LÓGICA DE TIEMPO (CRONÓMETRO) ===
# ======================================================

class CronometroJornada:
    # Configuración por defecto (Solo se usa si el usuario NO tiene hora asignada)
    DURACION_ESTANDAR_HORAS = 8 

    @staticmethod
    def get_ingreso_activo(user):
        """Busca si el usuario tiene un ingreso activo en zona."""
        from descargo_responsabilidad.models import RegistroIngreso
        return RegistroIngreso.objects.filter(
            visitante=user,
            estado=RegistroIngreso.EstadoOpciones.EN_ZONA
        ).first()

    @staticmethod
    def calcular_segundos_restantes(ingreso) -> int:
        """
        Calcula el tiempo basándose en la configuración del USUARIO.
        Prioridad:
        1. 'tiempo_limite_jornada' en la tabla Usuarios.
        2. Si es nulo, usa 8 horas desde la entrada.
        """
        if not ingreso or not ingreso.fecha_hora_ingreso:
            return 0
            
        usuario = ingreso.visitante
        
        # 1. Obtenemos hora actual con zona horaria (Colombia)
        ahora = timezone.localtime(timezone.now())
        
        # 2. Obtenemos la fecha/hora de entrada en zona horaria local
        entrada_local = timezone.localtime(ingreso.fecha_hora_ingreso)

        # 3. LÓGICA DE DECISIÓN
        if usuario.tiempo_limite_jornada:
            # CASO A: El usuario tiene hora fija de salida (ej: 19:22:00)
            hora_limite_usuario = usuario.tiempo_limite_jornada
            
            # Combinamos la FECHA de entrada con la HORA límite del usuario
            # Ejemplo: Entró hoy a las 8:00 AM, su límite es hoy a las 19:22
            limite = entrada_local.replace(
                hour=hora_limite_usuario.hour,
                minute=hora_limite_usuario.minute,
                second=hora_limite_usuario.second,
                microsecond=0
            )
            
            # Ajuste para turnos nocturnos (Cruza la medianoche):
            # Si entró a las 10 PM y su salida es a las 2 AM, 
            # al combinar fecha de hoy + 2 AM, la fecha límite quedaría en el PASADO.
            # Si límite es menor que entrada, significa que es el día siguiente.
            if limite < entrada_local:
                limite += timedelta(days=1)
                
        else:
            # CASO B: No tiene hora asignada, usamos duración estándar (8 horas)
            limite = entrada_local + timedelta(hours=CronometroJornada.DURACION_ESTANDAR_HORAS)
        
        # 4. Calcular diferencia
        diferencia = limite - ahora
        return int(diferencia.total_seconds())

    @staticmethod
    def esta_vencido(user) -> bool:
        """
        Retorna True si el tiempo se acabó.
        """
        ingreso = CronometroJornada.get_ingreso_activo(user)
        if not ingreso:
            return True 
            
        return CronometroJornada.calcular_segundos_restantes(ingreso) <= 0
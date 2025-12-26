import pdfplumber
import re
from decimal import Decimal, InvalidOperation
from django.core.management.base import BaseCommand
from catalogo.models import LimiteNormativo

class Command(BaseCommand):
    help = 'Carga normas desde el PDF CXS 192-1995 usando pdfplumber'

    def add_arguments(self, parser):
        parser.add_argument('pdf_path', type=str, help='Ruta al archivo PDF')

    def handle(self, *args, **options):
        pdf_path = options['pdf_path']
        
        self.stdout.write(self.style.WARNING(f'Iniciando lectura de: {pdf_path}'))
        
        # Contadores para el reporte final
        total_creados = 0
        errores = 0

        try:
            with pdfplumber.open(pdf_path) as pdf:
                # Iteramos por cada página
                for i, page in enumerate(pdf.pages):
                    self.stdout.write(f"Procesando página {i+1}...")
                    
                    # Extraemos la tabla de la página
                    # pdfplumber intenta detectar las líneas de la tabla automáticamente
                    tables = page.extract_tables()

                    for table in tables:
                        for row in table:
                            # VALIDACIÓN 1: Ignorar filas vacías o encabezados repetidos
                            if not row or row[0] == "Aditivo" or row[0] is None:
                                continue
                            
                            # NOTA: La estructura de columnas depende EXACTAMENTE del PDF.
                            # Asumimos una estructura común del Codex:
                            # Col 0: Aditivo / Col 1: INS / Col 2: Max Level / Col 3: Notas
                            # Esto puede variar, tendrás que ajustar los índices [0], [1] si el PDF es distinto.
                            
                            try:
                                # Limpieza de datos básica
                                nombre_aditivo = row[0].replace('\n', ' ').strip()
                                codigo_ins = row[1].replace('\n', ' ').strip() if len(row) > 1 and row[1] else "S/N"
                                limite_raw = row[2].replace('\n', ' ').strip() if len(row) > 2 and row[2] else "0"
                                categoria = "General" # El Codex a veces pone la categoría en un título aparte, esto es complejo de extraer.

                                # Lógica para convertir "2 000 mg/kg" a número 2000.00
                                limite_decimal = self.limpiar_numero(limite_raw)

                                # Si el límite es -1, significa que es BPF (Buenas Prácticas) o GMP
                                # Tú decides si guardas null o -1.
                                
                                # Guardar en Base de Datos
                                LimiteNormativo.objects.update_or_create(
                                    codigo_ins=codigo_ins,
                                    nombre_aditivo=nombre_aditivo,
                                    defaults={
                                        'limite_maximo_ppm': limite_decimal if limite_decimal >= 0 else None,
                                        'categoria_alimento': categoria,
                                        'fuente': 'CXS 192-1995 (Importado)'
                                    }
                                )
                                total_creados += 1

                            except Exception as e:
                                # Si falla una fila, no detenemos todo, solo la reportamos
                                # self.stdout.write(self.style.ERROR(f"Error en fila: {row} - {e}"))
                                errores += 1

        except FileNotFoundError:
            self.stdout.write(self.style.ERROR("No se encontró el archivo PDF."))
            return

        self.stdout.write(self.style.SUCCESS(f'PROCESO TERMINADO.'))
        self.stdout.write(self.style.SUCCESS(f'Registros creados/actualizados: {total_creados}'))
        self.stdout.write(self.style.WARNING(f'Filas ignoradas/errores: {errores}'))

    def limpiar_numero(self, texto):
        """
        Convierte textos como '2 000 mg/kg' o 'GMP' a Decimal.
        Retorna -1 si es GMP/BPF.
        """
        texto = texto.upper()
        if "GMP" in texto or "BPF" in texto or "BUENAS PRÁCTICAS" in texto:
            return Decimal("-1")
        
        # Extraer solo dígitos y puntos
        # Regex: Busca números que pueden tener espacios o puntos
        # Ej: "2 000" -> "2000"
        solo_numeros = re.sub(r'[^\d\.]', '', texto.replace(' ', ''))
        
        try:
            return Decimal(solo_numeros)
        except InvalidOperation:
            return Decimal("0")
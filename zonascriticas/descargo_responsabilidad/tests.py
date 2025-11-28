from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from io import BytesIO
from PIL import Image # Necesitamos Pillow para crear una imagen válida
import os

# Importamos tus modelos y servicios
from login.models import Usuario, Empresa, Cargo
from .models import Ubicacion, RegistroIngreso
from .services import PDFService

class PDFGenerationTestCase(TestCase):
    
    def setUp(self):
        print("\n--- INICIANDO CONFIGURACIÓN DEL TEST ---")
        
        # 1. Crear Empresa y Cargo
        self.empresa = Empresa.objects.create(nombre_empresa="Test Corp", nit="900000000")
        self.cargo = Cargo.objects.create(nombre="Tester")

        # 2. Crear Usuarios (AJUSTADO A TU MODELO REAL)
        # Eliminamos: username, last_name, password (no existen en tu modelo)
        self.visitante = Usuario.objects.create(
            first_name="Juan Perez", # Usamos first_name para el nombre completo
            numero_documento="123456789",
            email="visitante@test.com",
            empresa=self.empresa,
            cargo=self.cargo,
            tipo='Usuario',
            tipo_documento='CC'
        )
        
        self.responsable = Usuario.objects.create(
            first_name="Maria Gomez",
            numero_documento="987654321",
            email="responsable@test.com",
            cargo=self.cargo,
            tipo='Administrador',
            tipo_documento='CC'
        )

        # 3. Crear Ubicación
        self.ubicacion = Ubicacion.objects.create(
            nombre="Data Center Principal",
            codigo_qr="DC-01",
            ciudad="Bogotá",
            freshservice_id=1001,
            activa=True
        )

        # 4. Generar Imagen Falsa
        image_buffer = BytesIO()
        image = Image.new('RGB', (200, 100), color='white')
        image.save(image_buffer, 'PNG')
        self.dummy_signature = SimpleUploadedFile(
            name='firma_test.png',
            content=image_buffer.getvalue(),
            content_type='image/png'
        )

        # 5. Registro
        self.registro = RegistroIngreso.objects.create(
            visitante=self.visitante,
            responsable=self.responsable,
            ubicacion=self.ubicacion,
            modalidad=RegistroIngreso.ModalidadOpciones.VISITA,
            estado=RegistroIngreso.EstadoOpciones.EN_ZONA,
            firma_visitante=self.dummy_signature,
            firma_responsable=self.dummy_signature,
            fecha_hora_ingreso=timezone.now()
        )
        print("✅ Datos de prueba creados exitosamente.")

    def test_generacion_pdf_descargo(self):
        """
        Prueba unitaria: Llama al servicio y verifica que retorne bytes de PDF.
        """
        print("\n--- EJECUTANDO TEST DE GENERACIÓN PDF ---")
        
        try:
            # 1. Llamamos al servicio (Aquí es donde suele fallar)
            pdf_bytes = PDFService.generar_pdf_descargo(self.registro)
            
            # 2. Validaciones básicas
            self.assertIsNotNone(pdf_bytes, "El servicio retornó None en lugar de bytes.")
            self.assertIsInstance(pdf_bytes, bytes, "El retorno no es de tipo bytes.")
            self.assertTrue(pdf_bytes.startswith(b'%PDF'), "El archivo generado no tiene cabecera PDF válida.")
            
            print(f"✅ PDF generado correctamente. Tamaño: {len(pdf_bytes)} bytes.")

            # 3. GUARDADO LOCAL PARA DEBUG VISUAL
            # Guardamos el PDF generado en la raíz del proyecto para que lo puedas abrir
            ruta_salida = "debug_resultado.pdf"
            with open(ruta_salida, "wb") as f:
                f.write(pdf_bytes)
            
            print(f"📄 He guardado el PDF generado en: {os.path.abspath(ruta_salida)}")
            print("👉 Ábrelo para verificar que el diseño y las imágenes se ven bien.")

        except Exception as e:
            print("\n❌ ERROR CRÍTICO DURANTE LA GENERACIÓN:")
            print(f"Tipo de error: {type(e).__name__}")
            print(f"Mensaje: {str(e)}")
            
            # Si el error es de FPDF y rutas, esto nos dirá qué ruta intentó buscar
            if hasattr(self.registro.firma_visitante, 'path'):
                print(f"Ruta de imagen intentada: {self.registro.firma_visitante.path}")
                print(f"¿Existe el archivo?: {os.path.exists(self.registro.firma_visitante.path)}")
            
            # Hacemos fallar el test formalmente
            self.fail(f"El servicio lanzó una excepción: {e}")

    def tearDown(self):
        # Limpieza (Opcional, Django test runner suele limpiar la DB, pero los archivos quedan en /tmp)
        pass
"""
ImasD\catalogo\test\test_models.py

Descripcion: Este archivo se encarga unicamente del testing del modelo del catalogo

NOTA: Si algo falla en la aplicacion es buena practica venir aqui primero y realizar las pruebas antes

de ejecutar cualquier accion
"""
# Importamos TestCase: crea una base de datos temporal para hacer pruebas
from django.test import TestCase
# Importamos nuestro modelo para hacer un test unitario y ver que funcione correctamente
from catalogo.models import MateriaPrima, InformacionNutricional, LimiteNormativo, FuncionTecnologica

class test_models(TestCase):
    """
    Aqui corremos los test unitarios para el modelo de la materia prima
    """
    def test_crear_materia_prima(self):
        """
        Esta funcion crea una materia prima
        """
        materia_prima = MateriaPrima.objects.create(
            codigo="MP001",
            nombre="Materia Prima 1",
            densidad=1.0,
            costo_kilo=10.0,
            activo=True
        )
        # Validamos que los valores si sean los esperados
        self.assertEqual(materia_prima.codigo, "MP001")
        self.assertEqual(materia_prima.nombre, "Materia Prima 1")
        self.assertEqual(materia_prima.densidad, 1.0)
        self.assertEqual(materia_prima.costo_kilo, 10.0)
        self.assertEqual(materia_prima.activo, True)

    def test_crear_informacion_nutricional(self):
        """
        Esta funcion crea una informacion nutricional
        """
        informacion_nutricional = InformacionNutricional.objects.create(
            materia_prima=MateriaPrima.objects.create(
                codigo="MP001",
                nombre="Materia Prima 1",
                densidad=1.0,
                costo_kilo=10.0,
                activo=True
            ),
            sodio_mg=1.0,
            azucares_g=1.0,
            azucares_anadidos_g=1.0,
            grasa_total_g=1.0,
            grasa_saturada_g=1.0,
            proteina_g=1.0,
            carbohidratos_g=1.0
        )
        # Validamos que los valores si sean los esperados
        self.assertEqual(informacion_nutricional.materia_prima.codigo, "MP001")
        self.assertEqual(informacion_nutricional.materia_prima.nombre, "Materia Prima 1")
        self.assertEqual(informacion_nutricional.materia_prima.densidad, 1.0)
        self.assertEqual(informacion_nutricional.materia_prima.costo_kilo, 10.0)
        self.assertEqual(informacion_nutricional.materia_prima.activo, True)
        self.assertEqual(informacion_nutricional.sodio_mg, 1.0)
        self.assertEqual(informacion_nutricional.azucares_g, 1.0)
        self.assertEqual(informacion_nutricional.azucares_anadidos_g, 1.0)
        self.assertEqual(informacion_nutricional.grasa_total_g, 1.0)
        self.assertEqual(informacion_nutricional.grasa_saturada_g, 1.0)
        self.assertEqual(informacion_nutricional.proteina_g, 1.0)
        self.assertEqual(informacion_nutricional.carbohidratos_g, 1.0)

    def test_crear_limite_normativo(self):
        limite_normativo = LimiteNormativo.objects.create(
            codigo_ins="212",
            nombre_aditivo="Benzoato de sodio",
            categoria_alimento="12.5 Sopas y caldos",
            limite_maximo_ppm=1000,
            fuente="CXS 192-1995"
        )

        self.assertEqual(limite_normativo.codigo_ins, "212")
        self.assertEqual(limite_normativo.nombre_aditivo, "Benzoato de sodio")
        self.assertEqual(limite_normativo.limite_maximo_ppm, 1000)

    def test_crear_funcion_tecnologica(self):
        funcion_tecnologica = FuncionTecnologica.objects.create(
            nombre="Funcion Tecnologica 1",
            descripcion="Descripcion de la funcion tecnologica 1",         
        )

        self.assertEqual(funcion_tecnologica.nombre, "Funcion Tecnologica 1")
        self.assertEqual(funcion_tecnologica.descripcion, "Descripcion de la funcion tecnologica 1")
"""
El fin de este archivo es testear que las urls esten correctamente configuradas
"""

from django.test import SimpleTestCase # simpleTestCase es un tipo de test que no requiere una base de datos
from django.urls import reverse, resolve # reverse es para resolver la url y resolve es para resolver la vista
from login.views import login_view, procesar_formulario # importamos las vistas que vamos a testear

class TestUrls(SimpleTestCase):
    """
    Clase que se encarga del testing de las urls
    """
    def test_login_url_resuelve(self):
        """
        Esta funcion testea que la url de login resuelve correctamente
        apunta a la url ''
        """
        url = reverse('login:login') # Estamos usando el namespace para evitar conflictos
        self.assertEqual(resolve(url).func, login_view)

    def test_procesar_formulario_url_resuelve(self):
        """
        Esta funcion testea que la url de procesar formulario resuelve correctamente
        apunta a la url 'procesar/'
        """
        url = reverse('login:login-imasd') # Volvemos a usar el namespace
        self.assertEqual(resolve(url).func, procesar_formulario)
        
from django.test import TestCase, Client # Somulamos una base de datos y un cliente
from django.urls import reverse # Usamos reverse para obtener la url de manera dinamica
from django.contrib.auth import get_user_model # Obtenemos el modelo de usuario
import json # Usamos json para comunicarnos con js

class LoginViewsTest(TestCase):
    """
    Clase que se encarga del testing de las vistas
    """
    def setUp(self):
        """
        Esta funcion se ejecuta antes de cada test;
        define el estado inicial del test
        """
        self.client = Client() # Pasamos el objeto de cliente al self
        self.User = get_user_model() # Pasamos el objeto de usuario al self
        self.login_url = reverse('login:login') # Pasamos la url de login al self usando el namesape
        self.login_formulario = reverse('login:login-imasd') # Pasamos la url de login-imasd al self usando el namesape

        # Creamos un usuario antes de que se ejecute el test
        self.usuario = self.User.objects.create_user(
            correo='juan@loco.com',
            nombre='Juan',
            password='123',
            is_active=True
        )

        # Validamos que si se creo el usuario correctamente
        self.assertEqual(self.usuario.correo, 'juan@loco.com')
        self.assertEqual(self.usuario.nombre, 'Juan')
        self.assertTrue(self.usuario.check_password("123"))
        self.assertEqual(self.usuario.is_active, True)

    def test_login_view(self):
        """
        Esta funcion testea que la vista de login se renderiza correctamente
        """
        response = self.client.get(self.login_url) # Simulamos que el cliente envia un get a dicha url
        self.assertEqual(response.status_code, 200) # Comparamos si la respuesta es 200
        self.assertTemplateUsed(response, 'login.html') # Comparamos si la plantilla usada es login.html
    
    def test_login_formulario(self):
        """
        Esta funcion testea que la vista de login-formulario se renderiza correctamente
        """
        # SImulamos que el cliente envia un post con los siguientes datos
        respuesta = self.client.post(self.login_formulario, {
            'correo': 'juan@loco.com', 
            'password': '123'
            })
        
        self.assertEqual(respuesta.status_code, 200) # Validamos que la respuesta sea 200
        
        data = json.loads(respuesta.content) # Convertimos la respuesta a json

        self.assertTrue(data['success']) # Validamos que el usuario sea encontrado
        self.assertEqual(data['message'], 'Ingreso exitoso') # Validamos que el mensaje sea el correcto
        # Verificamos que Django efectivamente logueó al usuario en la sesión
        self.assertTrue('_auth_user_id' in self.client.session)
    
    def test_procesar_login_fallido(self):
        """Prueba login con contraseña incorrecta"""
        # Para desactivar el usuario
        self.usuario.is_active = False
        self.usuario.save()

        response = self.client.post(self.login_formulario, {
            'correo': 'juan@loco.com',
            'password': '123'
        })
        
        data = json.loads(response.content)
        self.assertFalse(data['success'])
        self.assertIn('No se pudo iniciar sesion, acerquese a un administrador para mas informacion', data['message'])
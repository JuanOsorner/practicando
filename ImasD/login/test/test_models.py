"""
ImasD\login\test\test_models.py

Este archivo se encarga unicamente del testing del modelo del login

NOTA: Si algo falla en la aplicacion es buena practica venir aqui primero y realizar las pruebas antes
de ejecutar cualquier accion
"""
# Importamos TestCase: crea una base de datos temporal para probar (No ensucia la base de datos real)
from django.test import TestCase
# Importamos get_user_model: nos ayuda a obtener el modelo de usuario activo en el proyecto
from django.contrib.auth import get_user_model 

class UsuarioModelTest(TestCase):
    """
    Clase que se encarga del testing del modelo del usuario
    """
    def setUp(self):
        """
        Esta funcion se ejecuta antes de cada test;
        define el estado inicial del test
        """
        # Devolver el modelo de usuario activo en el proyecto
        self.User = get_user_model()
    
    def test_crear_usuario(self):
        """
        Esta funcion crea un usuario nuevo 
        usando nuestra clase personalizada
        """
        # Usamos nuestro metodo persoanalizado de crear usuario
        usuario = self.User.objects.create_user(
            correo="juan@loco.com", # Pide los campos de correo
            nombre="JuanoBanano", # Pide los campos de nombre
            password="123456" # Pide los campos de contraseña
        )

        # Vamos a hacer uso de los asserts para validar si el usuario se creo correctamente
        # NOTA: Los asserts son para el proyecto exactamente donde esta fallando
        self.assertEqual(usuario.correo, "juan@loco.com") # Compara si el correo creado es el que pusimos
        self.assertEqual(usuario.nombre, "JuanoBanano") # Compara si el nombre creado es el que pusimos
        self.assertTrue(usuario.check_password("123456")) # Compara si la contraseña es la correcta
        self.assertTrue(usuario.is_active) # ¿Es verdad que esta activo?
        self.assertFalse(usuario.is_staff) # ¿Es verdad que es staff?

    def test_crear_super_usuario(self):
        """
        Vamos a probar si se crea un super usuario correctamente
        """
        # Usamos nuestro metodo personalizado de crear super usuario
        super_usuario = self.User.objects.create_superuser(
            correo="juan@loco.com", # Pide los campos de correo
            nombre="JuanoBanano", # Pide los campos de nombre
            password="123456" # Pide los campos de contraseña
        )

        self.assertEqual(super_usuario.correo, "juan@loco.com")
        self.assertEqual(super_usuario.nombre, "JuanoBanano")
        self.assertTrue(super_usuario.check_password("123456"))
        self.assertTrue(super_usuario.is_active)
        self.assertTrue(super_usuario.is_staff)
        self.assertEqual(super_usuario.tipo, "sa")
        self.assertEqual(super_usuario.cargo, "Administrador del Sistema")
        self.assertEqual(super_usuario.area, "Tecnología")

    def test_crear_usuario_sin_correo(self):
        """
        Esta funcion esta hecha para lanzar un error
        """
        with self.assertRaises(ValueError):
            self.User.objects.create_user(
                correo=None, # Pide los campos de correo
                nombre="JuanoBanano", # Pide los campos de nombre
                password="123456" # Pide los campos de contraseña
            )
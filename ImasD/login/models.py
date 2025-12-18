"""
ImasD\login\models.py

-> Este archivo es el que contiene la estructura de la tabla de nuestra base de datos

-> Este archivo debe crear la tabla cuando se hagan las migraciones

Nota: Estamos Usando AbstractBaseUser para poder personalizar la tabla de usuarios de la base
de datos, usar el sistema de autenticacion de Django para poder loguearse con el correo
"""

# Para usar AbstractBaseUser debemos importar los siguiebtes paquetes para manejar el model del manager
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
# OBSERVACION: Como estamos usando AbstractBaseUser este no sabe como crear usuarios
# Por lo que debemos crearnos un manager personalizado para que los cree
# NOTA: PermissionsMixin va a añadir las columnas a la base de datos
class UsuarioManager(BaseUserManager): # Hacemos herencia de la clase BaseUserManager

    def create_user(self, correo, nombre, password=None, **extra_fields):
        """
        Esta funcion toma el correo, nombre y contraseña del usuario
        y crea un usuario normal

        args: self (Tomamos el self para usar el manager)
        correo (El correo del usuario)
        nombre (El nombre del usuario)
        password (La contraseña del usuario)

        return usuario

        Nota: añadimos el campo de **extra_fields por motivmos de escalabilidad
        """
        # Validamos que los campos no esten vacios y enviamos errores a la consola
        # Para la vista va a llegar un error 500 (Error del backend)
        if not correo:
            raise ValueError("El campo de correo es obligatorio")

        # Normalizamos el correo (buena práctica en Django)
        correo_normalizado = self.normalize_email(correo)

        # Creamos al usuario normal
        # NOTA: heredamos todo model, lo que hace que 
        usuario = self.model(
            correo=correo_normalizado,
            nombre=nombre,
            **extra_fields
            )
        # Hasheamos la contraseña
        usuario.set_password(password)
        # Guardamos el usuario
        usuario.save(using=self._db)
        return usuario

    def create_superuser(self, correo, nombre, password=None, **extra_fields):

        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True) # Necesario por PermissionsMixin
        extra_fields.setdefault('tipo', 'sa')
        extra_fields.setdefault('cargo', 'Administrador del Sistema')
        extra_fields.setdefault('area', 'Tecnología')

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser debe tener is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser debe tener is_superuser=True.')

        return self.create_user(correo, nombre, password, **extra_fields)
# Creamos nuestra tabla de usuario (password y last_login)
class Usuario(AbstractBaseUser,PermissionsMixin):
    """
    Clase que representa al usuario
    """

    # Las opciones de tipo de usuario que vamos a manejar
    TIPOS = (
        ('sa', 'super administrador'),  # 'sa' se guarda en BD, 'super administrador' se muestra
        ('ad', 'administrador'),
        ('us', 'usuario'),
    )

    # Creamos el campo de correo personalizado
    correo = models.EmailField(
        unique=True, # El correo debe ser unico
        max_length=100, # Le damos un tamaño de 100 
        verbose_name="Correo", # Añadimos un nombre mas amigable
        blank=False, # No puede esta vacio
        null=False, # No puede ser un campo nulo
        )
    # Creamos el campo de nombre
    nombre = models.CharField(
        max_length=100, # Le damos un tamaño de 100 
        verbose_name="Nombre", # Añadimos un nombre mas amigable
        blank=False, # No puede esta vacio
        null=False, # No puede ser un campo nulo
        )
    # Creamos el campo de cargo
    cargo = models.CharField(
        max_length=100, # Le damos un tamaño de 100 
        verbose_name="Cargo", # Añadimos un nombre mas amigable
        blank=False, # No puede esta vacio
        null=False, # No puede ser un campo nulo
        )
    
    tipo = models.CharField(
        max_length=2, # Le damos un tamaño de 100 
        verbose_name="Tipo", # Añadimos un nombre mas amigable
        blank=False, # No puede esta vacio
        null=False, # No puede ser un campo nulo
        choices=TIPOS, # Usamos las opciones que definimos arriba
        default='us'
        )

    area = models.CharField(
        max_length=100,
        verbose_name="Area",
        blank=False,
        null=False,
    )

    # is_active: Indica si el usuario puede iniciar sesión.
    is_active = models.BooleanField(
        default=True,
        verbose_name="Activo"
        )
    # is_staff: Indica si el usuario puede entrar al panel de administración de Django.
    # Incluso si estan los administradores, estos no pueden ver la base de datos, 
    # solo los usuarios con el staff pueden hacerlo
    is_staff = models.BooleanField(
        default=False,
        verbose_name="Staff"
        )
    # Indicamos a esta clase que debe usar el manager (CREAMOS UNA INSTANCIA PARA QUE LO USE)
    objects = UsuarioManager()
    # NOTA: En el futuro puedes hacer user = usuario.objects.get(correo='juan@empresa.com')
    # Para buscar un usuario con ese correo
    # Le decimos a Django que para autenticarse vamos a usar el correo
    USERNAME_FIELD = 'correo'
    # Esto es por si vamos a usar el powershell para crear un usuario admin
    REQUIRED_FIELDS = ['nombre']  
    # El class Meta es para darle un nombre mas amigable a la tabla
    class Meta:
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"
    # El str es para colocar una marca a la base de datos
    # Esto sirve cuando queremos usar el shell de django
    def __str__(self):
        return self.correo
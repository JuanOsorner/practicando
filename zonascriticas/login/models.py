"""
zonascriticas/login/models.py

Este es nuestro modelo de usuario personalizado. 

Descripción: Este modelo de usuario es personalizado: no usamos contraseña porque
para ingresar unicamente pedimos la cedula del usuario

Responsabilidades: Este modelo debe crear la tabla de usuario en la base de datos con
los datos que se pueden ver a continuacion

Escrito por: Juan Esteban Osorno Duque 😎
"""
from django.db import models
from empresas.models import Empresa, Cargo 

class Usuario(models.Model):
    """
    Clase usuario personalizada para el contexto del proyecto
    """

    # 1. Creamos el ID que es la llave primaria
    id = models.AutoField(primary_key=True)
    
    # 2. Email unico con el nombre de la columna correo
    email = models.EmailField(unique=True, db_column='correo', max_length=255) 

    # 3. constante = tupla con los tipos: para nuestro contexto son 2
    TIPO = (
        ('Administrador', 'Administrador'),
        ('Usuario', 'Usuario'),
    )

    # 4. Le decimos que puede elegir de la constante tipo esas opciones pero que por defecto es usuario
    tipo = models.CharField(max_length=250, choices=TIPO, default='Usuario', db_column='tipo')

    # 5. Esta activo o inactivo (manejamos BooleanField porque su equivalente es la binaria)
    is_active = models.BooleanField(default=True, db_column='estado')

    # 6. El nomnre del usuario
    first_name = models.CharField(max_length=250, db_column='nombre')

    # 7. Los tipos de documento nuevamente en una tupla
    TIPO_DOCUMENTO = (
        ('CC', 'Cédula de Ciudadanía'),
        ('CE', 'Cédula de Extranjería'),
        ('PA', 'Pasaporte'),
    )

    # 8. Seleccionamos documentos
    tipo_documento = models.CharField(max_length=50, choices=TIPO_DOCUMENTO, db_column='tipo_documento', blank=True)

    # 9. Numero de documento que en nuestro caso es claramente un CharField
    numero_documento = models.CharField(max_length=50, unique=True, db_column='numero_documento')
    
    # 10. 🚨 Se deja el campo de token por el momento, por si la aplicacion lo necesita mas adelante
    token = models.CharField(max_length=255, blank=True, null=True, db_column='token')
    
    # 11. Campo de la imagen que le vamos a decir, le decimos que vaya a la ubicacion usuarios/
    img = models.ImageField(upload_to='usuarios/', max_length=250, blank=True, null=True, db_column='img')
    
    # 12. El tiempo limite que va a tener en la jornada
    tiempo_limite_jornada = models.TimeField(blank=True, null=True, db_column='tiempo_limite_jornada')

    # LLAVES FORANEAS QUE USAMOS PARA EL FLUJO DE DATOS

    empresa = models.ForeignKey(
        'empresas.Empresa', 
        on_delete=models.SET_NULL, 
        null=True,
        blank=True,
        related_name='empleados',
        db_column='id_empresa'
    )

    cargo = models.ForeignKey(
        'empresas.Cargo', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='usuarios',
        db_column='id_cargo'
    )

    # --- Propiedades de Compatibilidad (Arregla C009/C010) ---
    
    @property
    def is_staff(self):
        # Propiedad virtual para que 'home_view' funcione
        return self.tipo == 'Administrador'
    
    @property
    def is_anonymous(self):
        return False

    @property
    def is_authenticated(self):
        return True
    
    # Campo fantasma para que las plantillas no fallen
    @property
    def username(self):
        return self.email

    def get_full_name(self):
        return self.first_name

    def __str__(self):
        return self.email or f"Usuario {self.id}"

    class Meta:
        # Le decimos a Django que cree esta tabla
        # localmente para nosotros.
        managed = True 
        db_table = 'usuarios' # El nombre de la BD real
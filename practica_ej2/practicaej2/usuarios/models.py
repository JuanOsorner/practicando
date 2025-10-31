from django.db import models
# El modelo define la estructura de la tabla y el comportamiento de los datos.

# Creamos el modelo de usuario
class Usuario(models.Model):
    # Definimos el rol y el estado como textChoices
    class Rol(models.TextChoices):
        ADMIN = 'ADMIN', 'Administrador'
        USER = 'USER', 'Usuario'
    class Estado(models.TextChoices):
        ACTIVO = 'ACTIVO', 'Activo'
        INACTIVO = 'INACTIVO', 'Inactivo'

    #Creamos los campos en la base de datos: Django los pasa a el self
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    contraseña = models.CharField(max_length=100)
    #Llamamos los roles y los estados, establecemos un maxcimo y sus deciciones
    estado = models.CharField(max_length=10, choices=Estado.choices, default=Estado.ACTIVO)
    rol = models.CharField(max_length=10, choices=Rol.choices, default=Rol.USER)

    #Creamos un metodo propio en nuestro modelo para desactivar un usuario activo
    def activar_usuario(self):
    """Activa al usuario si está inactivo."""
    if self.estado == self.Estado.INACTIVO:
        self.estado = self.Estado.ACTIVO
        self.save()
        # 🚨IMPORTANTE Django ya pasa el valor al self por uno mismo

    def desactivar_usuario(self):
        """Desactiva al usuario si está activo."""
        if self.estado == self.Estado.ACTIVO:
            self.estado = self.Estado.INACTIVO
            self.save()

    def diccionario_datos(self):
        """
        Envia un diccionario de datos
        """
        return {
            'id': self.id,
            'nombre': self.nombre,
            'apellido': self.apellido,
            'email': self.email,
            'rol': self.rol,
            'estado': self.estado,
        }
    #EL usuari lo convertimos a texto esto es para hacer pruebas
    def __str__(self):
        return f"{self.nombre} {self.apellido}"

    #Usamos class meta para establecer condiciones para esta tabla
    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
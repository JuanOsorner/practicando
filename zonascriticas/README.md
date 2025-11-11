
# Proyecto Zonascriticas

Zonascriticas es una aplicación web desarrollada con Django que gestiona empresas, empleados y perfiles de usuario. La aplicación cuenta con un sistema de autenticación personalizado y expone varios endpoints de API para la gestión de datos.

## Características

- **Gestión de empresas y empleados:** Permite crear, actualizar y listar empresas y empleados.
- **Perfiles de usuario:** Cada usuario tiene un perfil que puede ser actualizado, incluyendo una imagen de perfil.
- **Autenticación personalizada:** Utiliza un sistema de autenticación propio en lugar del sistema de autenticación por defecto de Django.
- **API REST:** Expone endpoints de API para interactuar con los datos de la aplicación.
- **Servicio de archivos estáticos y multimedia:** Configurado para servir archivos estáticos (CSS, JavaScript) y multimedia (imágenes de perfil).

## Estructura del proyecto

El proyecto está organizado en las siguientes aplicaciones de Django:

- `login`: Gestiona la autenticación de usuarios.
- `home`: Muestra el panel de control principal de la aplicación.
- `perfil`: Gestiona los perfiles de usuario.
- `empresas`: Gestiona las empresas y los empleados.

## Endpoints de la API

La aplicación expone los siguientes endpoints de API:

- `/api/login/`: Autentica a un usuario.
- `/api/empresas/`: Lista todas las empresas.
- `/api/empresas/crear/`: Crea una nueva empresa.
- `/api/empresas/<int:empresa_id>/actualizar/`: Actualiza una empresa existente.
- `/api/empresas/<int:empresa_id>/estado/`: Actualiza el estado de una empresa.
- `/api/empresas/<int:empresa_id>/empleados/`: Lista los empleados de una empresa.
- `/api/empleados/crear/`: Crea un nuevo empleado.
- `/api/empleados/<int:empleado_id>/actualizar/`: Actualiza un empleado existente.
- `/api/empleados/<int:empleado_id>/estado/`: Actualiza el estado de un empleado.
- `/api/recursos/`: Lista los recursos disponibles.
- `/perfil/api/update/`: Actualiza el perfil de un usuario.
- `/perfil/api/update-image/`: Actualiza la imagen de perfil de un usuario.
                                                                                                        
## Puesta en marcha

1. Clonar el repositorio.
2. Instalar las dependencias: `pip install -r requirements.txt`
3. Configurar la base de datos en el archivo `.env`.
4. Ejecutar las migraciones: `python manage.py migrate`
5. Iniciar el servidor de desarrollo: `python manage.py runserver`

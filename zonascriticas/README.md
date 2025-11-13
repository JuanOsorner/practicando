# Proyecto Zonascriticas

**Zonascriticas** es una aplicación web desarrollada con Django, diseñada para la gestión de empresas, empleados y el control de zonas críticas. La aplicación cuenta con un sistema de autenticación personalizado, perfiles de usuario, y una interfaz para la administración de datos relacionados con las empresas y sus empleados.

## Características Principales

- **Autenticación Personalizada:** Sistema de inicio de sesión propio que utiliza el número de documento del usuario.
- **Perfiles de Usuario:** Los usuarios pueden ver y actualizar su información personal, incluyendo su foto de perfil.
- **Gestión de Empresas:** Permite crear, leer, actualizar y eliminar (CRUD) empresas, así como gestionar su estado (activas/inactivas).
- **Gestión de Empleados:** Funcionalidad para administrar los empleados asociados a cada empresa, incluyendo sus cargos y estado.
- **Descargo de Responsabilidad:** Presenta un descargo de responsabilidad que se adapta al dispositivo del usuario (móvil o de escritorio).
- **Roles de Usuario:** Diferencia entre usuarios de tipo `Administrador` y `Usuario`, redirigiendo a cada uno a su respectiva interfaz al iniciar sesión.

## Estructura del Proyecto

El proyecto está organizado en las siguientes aplicaciones de Django:

- `login`: Maneja la autenticación de usuarios y el modelo `Usuario`.
- `home`: Contiene la vista principal que redirige a los usuarios según su rol.
- `perfil`: Gestiona el perfil de los usuarios, permitiendo la visualización y actualización de sus datos.
- `empresas`: Contiene toda la lógica para la gestión de empresas, empleados, cargos y servicios.
- `descargo_responsabilidad`: Muestra un descargo de responsabilidad a los usuarios de tipo `Usuario`.

## Requisitos

Para ejecutar este proyecto, necesitarás tener instalado lo siguiente:

- Python 3.x
- Django
- MySQL (o la base de datos que configures en `.env`)

Las dependencias de Python se encuentran en el archivo `requirements.txt` y pueden ser instaladas con el siguiente comando:

```bash
pip install -r requirements.txt
```

## Configuración

1. **Clona el repositorio:**

   ```bash
   git clone <URL-del-repositorio>
   cd zonascriticas
   ```

2. **Crea un entorno virtual (recomendado):**

   ```bash
   python -m venv entorno_zc
   source entorno_zc/bin/activate  # En Windows: entorno_zc\Scripts\activate
   ```

3. **Instala las dependencias:**

   ```bash
   pip install -r requirements.txt
   ```

4. **Configura las variables de entorno:**

   Crea un archivo `.env` en la raíz del proyecto (junto a `manage.py`) y añade las siguientes variables:

   ```env
   SECRET_KEY=tu_secret_key
   DEBUG=True
   ALLOWED_HOSTS=127.0.0.1,localhost

   DB_ENGINE=django.db.backends.mysql
   DB_NAME=tu_base_de_datos
   DB_USER=tu_usuario
   DB_PASSWORD=tu_contraseña
   DB_HOST=localhost
   DB_PORT=3306
   ```

5. **Aplica las migraciones:**

   ```bash
   python manage.py migrate
   ```

## Uso

Para iniciar el servidor de desarrollo, ejecuta el siguiente comando:

```bash
python manage.py runserver
```

La aplicación estará disponible en `http://127.0.0.1:8000`.

- **Inicio de sesión:** Accede a la raíz del sitio para iniciar sesión con un número de documento de un usuario registrado.
- **Panel de Administrador:** Si inicias sesión como `Administrador`, serás redirigido al panel de gestión de empresas y empleados.
- **Descargo de Responsabilidad:** Si inicias sesión como `Usuario`, verás la página de descargo de responsabilidad.

## API Endpoints

La aplicación `empresas` expone varios endpoints para gestionar los datos a través de una interfaz dinámica:

- `GET /empresas/list/`: Lista todas las empresas.
- `GET /empresas/empleados/<empresa_id>/`: Lista los empleados de una empresa específica.
- `GET /empresas/recursos/`: Obtiene listas de cargos y servicios.
- `POST /empresas/create/`: Crea una nueva empresa.
- `POST /empresas/update/<empresa_id>/`: Actualiza una empresa existente.
- `POST /empresas/empleado/create/`: Crea un nuevo empleado.
- `POST /empresas/empleado/update/<empleado_id>/`: Actualiza un empleado existente.
- `POST /empresas/estado/empresa/<empresa_id>/`: Cambia el estado de una empresa.
- `POST /empresas/estado/empleado/<empleado_id>/`: Cambia el estado de un empleado.
- `POST /perfil/update/`: Actualiza el perfil del usuario.
- `POST /perfil/update-image/`: Actualiza la imagen de perfil del usuario.
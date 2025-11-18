# Proyecto Zonascriticas

**Zonascriticas** es una aplicación web Django para la gestión de empresas y empleados, con un enfoque en el control de "zonas críticas".

## Resumen del Funcionamiento

El sistema funciona con dos roles principales: **Administrador** y **Usuario**.

-   Los **Administradores** tienen acceso a un panel de control para gestionar empresas, servicios, cargos y empleados. Pueden crear, editar y cambiar el estado de cada uno de estos elementos.
-   Los **Usuarios** (empleados) inician sesión con su número de documento. Al ingresar, son dirigidos a una página de **descargo de responsabilidad** que deben aceptar. Esta página se muestra en un formato adaptado para dispositivos móviles, ya que se espera que el acceso principal sea desde campo.

El flujo principal es el siguiente:

1.  Un **Administrador** registra una **empresa** y a sus **empleados**, asignándoles un cargo.
2.  El **empleado** (Usuario) ingresa a la aplicación con su número de documento.
3.  El sistema valida al usuario y le presenta el **descargo de responsabilidad**.
4.  La interacción del usuario queda registrada, cumpliendo con el propósito de control de la aplicación.

## Características

-   **Autenticación Personalizada:** Login basado en número de documento.
-   **Gestión Administrativa (CRUD):**
    -   Empresas
    -   Empleados
    -   Cargos
    -   Servicios
-   **Perfiles de Usuario:** Los usuarios pueden actualizar su información personal y foto de perfil.
-   **Diseño Adaptativo:** La vista de descargo de responsabilidad está optimizada para móviles.
-   **Roles y Permisos:** Sistema de redirección basado en el rol del usuario (`Administrador` o `Usuario`).

## Estructura del Proyecto

-   `login`: Maneja la autenticación y el modelo `Usuario`.
-   `home`: Redirige a los usuarios según su rol.
-   `perfil`: Gestiona los perfiles de usuario.
-   `empresas`: Contiene la lógica de negocio para la gestión de empresas y empleados.
-   `descargo_responsabilidad`: Muestra el aviso de responsabilidad a los usuarios.

## Requisitos

-   Python 3.x
-   Django
-   MySQL (o la base de datos configurada en `.env`)

Instala las dependencias con:
```bash
pip install -r requirements.txt
```

## Configuración

1.  **Clona el repositorio:**
    ```bash
    git clone <URL-del-repositorio>
    cd zonascriticas
    ```
2.  **Crea un entorno virtual:**
    ```bash
    python -m venv entorno_zc
    source entorno_zc/bin/activate  # En Windows: entorno_zc\Scripts\activate
    ```
3.  **Instala las dependencias:**
    ```bash
    pip install -r requirements.txt
    ```
4.  **Configura las variables de entorno** en un archivo `.env` en la raíz del proyecto:
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
5.  **Aplica las migraciones:**
    ```bash
    python manage.py migrate
    ```

## Uso

Inicia el servidor de desarrollo:
```bash
python manage.py runserver
```
La aplicación estará disponible en `http://127.0.0.1:8000`.

## API Endpoints

La aplicación expone una serie de endpoints para la gestión dinámica de datos desde el frontend:

-   `/empresas/list/`: Lista de empresas.
-   `/empresas/empleados/<empresa_id>/`: Lista de empleados por empresa.
-   `/empresas/recursos/`: Lista de cargos y servicios.
-   `/empresas/create/`: Crear empresa.
-   `/empresas/update/<empresa_id>/`: Actualizar empresa.
-   `/empresas/empleado/create/`: Crear empleado.
-   `/empresas/empleado/update/<empleado_id>/`: Actualizar empleado.
-   `/perfil/update/`: Actualizar perfil de usuario.
-   `/perfil/update-image/`: Actualizar imagen de perfil.

## Observaciones tecnicas

1.**SISTEMA PERSONALIZADO DE MIDDLEWARE**Nuestra aplicación esta usando un sistema personalizado de middleware para poder personalizar nuestra tabla de usuarios que es nuestra tabla principal en la base de datos. Sin este sistema
no podriamos utilizar el sistema de autenticacion de Django pues este esta hecho para la tabla auth_user. **LA RAZON** Usamos esto porque nuestro proyecto no requiere campos como contraseña.

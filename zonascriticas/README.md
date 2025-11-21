# Zonascriticas

Zonascriticas es una aplicación web construida con Django que controla y monitorea el acceso a zonas críticas en una empresa. Permite gestionar la entrada y salida de empleados y visitantes, así como las herramientas y equipos que portan.

## Características

*   **Autenticación de usuarios:** Los usuarios pueden iniciar sesión en la aplicación utilizando su número de documento.
*   **Roles de usuario:** La aplicación tiene dos roles de usuario: Administrador y Usuario.
*   **Perfil de usuario:** Los usuarios pueden ver y actualizar su información de perfil.
*   **Gestión de empresas y empleados:** Los administradores pueden gestionar las empresas y sus empleados.
*   **Control de acceso a zonas críticas:** La aplicación controla el acceso a las zonas críticas a través de un descargo de responsabilidad y un código QR.
*   **Registro de herramientas y equipos:** Los usuarios pueden registrar las herramientas y equipos que ingresan a las zonas críticas.
*   **Historial de entradas y salidas:** La aplicación mantiene un registro de todas las entradas y salidas de las zonas críticas.

## Empezando

Para obtener una copia local y ponerla en funcionamiento, siga estos sencillos pasos.

### Prerrequisitos

*   Python 3.11
*   Django 4.2
*   Git

### Instalación

1.  Clona el repositorio
    ```sh
    git clone https://github.com/jfosorio/zonascriticas.git
    ```
2.  Crea un entorno virtual
    ```sh
    python -m venv entorno_zc
    ```
3.  Activa el entorno virtual
    ```sh
    entorno_zc\Scripts\activate
    ```
4.  Instala las dependencias
    ```sh
    pip install -r requirements.txt
    ```
5.  Crea las tablas de la base de datos
    ```sh
    python manage.py migrate
    ```
6.  Ejecuta el servidor de desarrollo
    ```sh
    python manage.py runserver
    ```

## Estructura del Proyecto

El proyecto se divide en las siguientes aplicaciones:

*   `descargo_responsabilidad`: Gestiona el proceso de ingreso a una zona crítica, incluyendo el descargo de responsabilidad, el código QR y las firmas del visitante y el responsable.
*   `empresas`: Gestiona las empresas y sus empleados.
*   `home`: Actúa como un enrutador para la aplicación.
*   `login`: Gestiona la autenticación de usuarios.
*   `perfil`: Gestiona el perfil del usuario.
*   `registro_herramientas`: Gestiona las herramientas y equipos que los usuarios ingresan a las zonas críticas.

## Construido con

*   [Django](https://www.djangoproject.com/) - El framework web utilizado
*   [Python](https://www.python.org/) - El lenguaje de programación utilizado
*   [SQLite](https://www.sqlite.org/index.html) - La base de datos utilizada para el desarrollo
*   [HTML](https://developer.mozilla.org/en-US/docs/Web/HTML) - El lenguaje de marcado utilizado
*   [CSS](https://developer.mozilla.org/en-US/docs/Web/CSS) - El lenguaje de hojas de estilo utilizado
*   [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) - El lenguaje de programación utilizado para el frontend

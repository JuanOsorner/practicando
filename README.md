# Repositorio de Prácticas

Este repositorio contiene varios proyectos de práctica para diferentes tecnologías.

## Proyectos

### 1. `auto_github` - Script de Python para la API de GitHub

Este proyecto es un script de Python que utiliza la API de GitHub para obtener los repositorios de un usuario.

#### Características

- Carga un token de autenticación desde un archivo `.env`.
- Realiza una solicitud a la API de GitHub para obtener los repositorios del usuario.
- Imprime los nombres de los repositorios en la consola.

#### Uso

1.  Crea un archivo `.env` en la raíz del proyecto con la siguiente variable:
    ```
    LLAVEGIT=tu_token_de_github
    ```
2.  Ejecuta el script:
    ```
    python auto_github/github_api.py
    ```

### 2. `chat_gemini` - Chatbot con Django y Gemini

Este proyecto es una aplicación de chat en tiempo real que utiliza Django como backend y la API de Gemini de Google para generar respuestas.

#### Estructura del Proyecto

- `chatbot/`: Directorio principal del proyecto Django.
- `gemini_bot/`: Aplicación de Django que contiene la lógica del chat.
  - `core/gemini_service.py`: Clase que encapsula la interacción con la API de Gemini.
  - `views.py`: Vistas que manejan las solicitudes HTTP y la comunicación con el `GeminiService`.
  - `templates/chat.html`: Plantilla HTML para la interfaz de chat.
- `requirements.txt`: Lista de dependencias de Python.

#### Uso

1.  Instala las dependencias:
    ```
    pip install -r chat_gemini/requirements.txt
    ```
2.  Configura tu clave de API de Gemini en un archivo `.env` en la raíz del proyecto `chat_gemini`.
3.  Inicia el servidor de desarrollo:
    ```
    python chat_gemini/chatbot/manage.py runserver
    ```

### 3. `practica_ej2` - Aplicación Web con Django

Este proyecto es una aplicación web desarrollada con el framework Django de Python. El objetivo principal de esta aplicación es la gestión de usuarios.

#### Estructura del Proyecto

- `practicaej2/`: Directorio principal del proyecto Django.
- `usuarios/`: Aplicación de Django dedicada a la gestión de usuarios.
  - `models.py`: Define los modelos de la base de datos para los usuarios.
  - `views.py`: Contiene la lógica de negocio y las vistas para la interacción con el usuario.
  - `templates/`: Almacena las plantillas HTML para la renderización de las páginas.
  - `urls.py`: Define las rutas (URLs) específicas de la aplicación de usuarios.
- `requirements.txt`: Lista todas las dependencias de Python necesarias para ejecutar el proyecto.

#### Uso

1.  Instala las dependencias:
    ```
    pip install -r practica_ej2/requirements.txt
    ```
2.  Configura la base de datos en `practica_ej2/practicaej2/settings.py`.
3.  Ejecuta las migraciones:
    ```
    python practica_ej2/manage.py migrate
    ```
4.  Inicia el servidor de desarrollo:
    ```
    python practica_ej2/manage.py runserver
    ```

### 4. `SpringBoot/ejemplo_api` - API REST con Spring Boot

Este proyecto es una API RESTful simple creada con el framework Spring Boot de Java.

#### Estructura del Proyecto

- `src/main/java/com/example/ejemplo_api/EjemploApiApplication.java`: Archivo principal que inicia la aplicación Spring Boot.
- `pom.xml`: Archivo de configuración de Maven que gestiona las dependencias y la construcción del proyecto.
- `src/main/resources/application.properties`: Archivo de configuración de la aplicación Spring.

#### Uso

1.  Abre el proyecto en tu IDE de Java preferido.
2.  Ejecuta la clase `EjemploApiApplication.java`.

### 5. `zonascriticas` - Aplicación Web con Django

Este proyecto es una aplicación web desarrollada con Django para la gestión de zonas críticas.

#### Características

- **Autenticación de Usuarios:** Sistema de inicio y cierre de sesión.
- **Gestión de Perfiles:** Los usuarios pueden ver su información de perfil.
- **Redirección basada en roles:** Redirige a los usuarios a diferentes páginas según su tipo.

#### Estructura del Proyecto

- `zonascriticas/`: Directorio principal del proyecto Django.
- `login/`: Aplicación de Django para la autenticación de usuarios.
- `home/`: Aplicación de Django para la página de inicio y el perfil del usuario.
- `perfil/`: Aplicación de Django para la gestión de perfiles.

#### Uso

1.  Instala las dependencias de Python.
2.  Configura la base de datos y otras variables de entorno en un archivo `.env`.
3.  Ejecuta las migraciones:
    ```
    python zonascriticas/manage.py migrate
    ```
4.  Inicia el servidor de desarrollo:
    ```
    python zonascriticas/manage.py runserver
    ```
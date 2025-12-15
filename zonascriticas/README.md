# Proyecto Zonas Críticas

## 1. Descripción General

**Zonas Críticas** es una aplicación web desarrollada en Django diseñada para gestionar y controlar el acceso a áreas restringidas o de alta seguridad dentro de la empresa Jolifoods. El sistema asegura que cada persona que ingresa a estas zonas ha leído y aceptado los protocolos de seguridad, ha registrado las actividades que va a realizar y las herramientas que va a utilizar.

El proyecto centraliza la información, proporcionando a los administradores una trazabilidad completa de todas las operaciones y personal dentro de las zonas críticas.

## 2. Características Principales

- **Gestión de Usuarios**: Sistema de autenticación y roles (Usuario Normal, Administrador).
- **Control de Acceso**: Proceso de validación mediante un descargo de responsabilidad antes de ingresar a una zona.
- **Firma Digital**: Recolección de firmas del usuario y de un responsable como prueba de conformidad.
- **Registro de Actividades**: Los usuarios deben declarar las tareas que van a desempeñar.
- **Inventario de Herramientas**: Los usuarios pueden registrar herramientas (de cómputo o generales) que ingresan a la zona.
- **Panel de Administración**: Interfaz para que los administradores monitoreen todos los registros.
- **Integración Externa**: Sincronización de datos con Freshservice mediante un comando de gestión.

## 3. Roles de Usuario

El sistema cuenta con dos roles principales:

- **Usuario Normal**: Personal que necesita acceder a una zona crítica. Su principal función es completar el formulario de acceso, declarando actividades y herramientas.
- **Administrador**: Supervisa y gestiona los registros. Tiene acceso a toda la información generada por los usuarios para llevar un control detallado.

## 4. Flujo de Trabajo

A continuación, se describe el proceso que sigue cada tipo de usuario.

### 4.1. Usuario Normal

1.  **Inicio de Sesión**: El usuario accede a la aplicación con sus credenciales.
2.  **Descargo de Responsabilidad**: Se le presenta un formulario con las políticas, términos y condiciones para el acceso a la zona.
3.  **Aceptación y Firmas**:
    -   Lee y acepta las políticas de tratamiento de datos.
    -   Proporciona su firma digital en un campo designado.
    -   Proporciona la firma digital de su responsable.
4.  **Registro de Herramientas**: Indica si ingresará con herramientas. En caso afirmativo, las registra en el sistema.
5.  **Registro de Actividades**: Describe las actividades que va a realizar dentro de la zona crítica.
6.  **Acceso a la Zona**: Una vez completado el formulario, el sistema le concede el acceso.

### 4.2. Administrador

1.  **Inicio de Sesión**: El administrador accede a la aplicación con sus credenciales de superusuario.
2.  **Panel de Administración**: Accede al panel de Django (`/admin`).
3.  **Monitoreo de Registros**:
    -   Consulta los registros de acceso, visualizando quién ha entrado, cuándo y con qué propósito.
    -   Revisa las actividades y herramientas registradas por cada usuario.
    -   Filtra y busca registros específicos para auditorías o seguimiento.
4.  **Gestión de Datos**: Puede gestionar usuarios, empresas y otros catálogos del sistema.
5.  **Sincronización de Datos**: Ejecuta comandos de gestión para sincronizar datos desde sistemas externos como Freshservice.

## 5. Arquitectura y Componentes Clave

Esta sección apunta a partes específicas del código para explicar cómo funcionan los componentes más importantes del proyecto.

### 5.1. Gestión de Usuarios (App: `login`)

-   **Modelos**: El archivo `login/models.py` define el modelo de `Usuario` personalizado, que probablemente hereda de `AbstractUser` de Django para añadir campos adicionales como el rol o la empresa.
-   **Vistas**: La lógica de autenticación (inicio y cierre de sesión) se encuentra en `login/views.py`.
-   **Decoradores**: En `login/decorators.py` se definen decoradores personalizados para restringir el acceso a ciertas vistas según el rol del usuario (ej: `@admin_required`).

### 5.2. Descargo de Responsabilidad (App: `descargo_responsabilidad`)

-   **Vistas**: El flujo principal del formulario de acceso se gestiona en `descargo_responsabilidad/views.py`. Esta vista se encarga de presentar el formulario, procesar los datos (POST request) y guardar las firmas.
-   **Modelos**: El modelo `descargo_responsabilidad/models.py` almacena la información del descargo, incluyendo las firmas y la aceptación de políticas, y lo asocia con el usuario correspondiente.
-   **Plantillas**: El formulario que el usuario ve está en `descargo_responsabilidad/templates/`.

### 5.3. Registro de Herramientas (App: `registro_herramientas`)

-   **Modelos**: En `registro_herramientas/models.py` se define el modelo `Herramienta`, con campos como `nombre`, `tipo` (cómputo/normal) y su relación con el usuario que la registra.
-   **Servicios**: Puede existir un archivo `registro_herramientas/services.py` que contenga lógica de negocio para, por ejemplo, validar o procesar el registro de una herramienta antes de guardarlo.

### 5.4. Registro de Actividades (App: `actividades`)

-   **Modelos**: `actividades/models.py` contiene el modelo que almacena la descripción de las actividades, vinculadas a un usuario y a un registro de acceso.
-   **Vistas**: Las vistas en `actividades/views.py` gestionan la creación y visualización de estas actividades.

### 5.5. Integración con Freshservice

-   **Comando de Gestión**: Dentro de alguna de las apps (posiblemente `descargo_responsabilidad` o una app `core`), existe un directorio `management/commands/`. Dentro, un archivo como `sincronizar_freshservice.py` contiene la lógica para conectarse a la API de Freshservice y actualizar la base de datos local.
-   **Ejecución**: Este comando se ejecuta manualmente a través de la terminal con `python manage.py sincronizar_freshservice`.

## 6. Instalación y Puesta en Marcha (Ejemplo)

A continuación, se describe un ejemplo de cómo configurar el entorno de desarrollo.

1.  **Clonar el repositorio**:
    ```bash
    git clone <URL-DEL-REPOSITORIO>
    cd zonascriticas
    ```

2.  **Crear y activar un entorno virtual**:
    ```bash
    python -m venv entorno_zc
    source entorno_zc/bin/activate  # En Linux/macOS
    entorno_zc\Scripts\activate  # En Windows
    ```

3.  **Instalar dependencias**:
    ```bash
    pip install -r requirements.txt
    ```

4.  **Realizar migraciones de la base de datos**:
    ```bash
    python manage.py migrate
    ```

5.  **Crear un superusuario**:
    ```bash
    python manage.py createsuperuser
    ```

6.  **Ejecutar el servidor de desarrollo**:
    ```bash
    python manage.py runserver
    ```

7.  **Acceder a la aplicación**:
    -   La aplicación estará disponible en `http://127.0.0.1:8000/`.
    -   El panel de administración se encuentra en `http://127.0.0.1:8000/admin/`.

# Proyecto Zonas Críticas

**Zonas Críticas** es una aplicación web desarrollada con Django, diseñada para gestionar y registrar el acceso de personal a áreas restringidas o "zonas críticas". El sistema garantiza que cada usuario lea y acepte un descargo de responsabilidad antes de su ingreso, generando una constancia en PDF de dicha aceptación.

## Flujo Principal de Funcionamiento

El proceso central de la aplicación se puede resumir en los siguientes pasos:

1.  **Autenticación del Usuario**: Un empleado (denominado "visitante") inicia sesión en la aplicación utilizando su número de documento. El sistema utiliza un middleware de autenticación personalizado que no requiere contraseña.
2.  **Descargo de Responsabilidad**: Una vez autenticado, el usuario es dirigido a un formulario de descargo de responsabilidad, optimizado para dispositivos móviles.
3.  **Validación de Datos**: En el formulario, el usuario debe:
    *   Escanear el **código QR** de la zona a la que desea ingresar.
    *   Ingresar el número de documento de un **empleado responsable** que autoriza el acceso.
    *   Aceptar las políticas y el descargo de responsabilidad.
    *   Proporcionar su **firma digital** directamente en la pantalla.
4.  **Registro y Generación de PDF**: Al enviar el formulario, el sistema:
    *   Crea un **registro de ingreso** en la base de datos con toda la información.
    *   Genera un **documento PDF** con los detalles del descargo, las firmas y los datos del registro.
    *   Almacena el PDF en el sistema.
5.  **Notificación por Correo**: Automáticamente, se envía una copia del PDF generado al correo electrónico del usuario "visitante" como constancia.

Adicionalmente, la aplicación cuenta con un panel de administración donde se pueden gestionar empresas, empleados, cargos y otros catálogos del sistema.

## Características Técnicas Destacadas

-   **Backend**: Django.
-   **Frontend**: Vistas renderizadas con Django Templates, con un fuerte enfoque en un formulario para móviles.
-   **Generación de PDF**: Utiliza la librería `xhtml2pdf` para convertir plantillas HTML a documentos PDF.
-   **Autenticación sin Contraseña**: Sistema de login personalizado basado en número de documento.
-   **APIs Internas**: Endpoints para validar usuarios y zonas en tiempo real desde el frontend.
-   **Servicios**: La lógica de negocio está encapsulada en clases de servicio (`DescargoService`, `PDFService`, `UsuarioService`) para una mejor organización del código.

## Instalación y Puesta en Marcha

Sigue estos pasos para configurar el entorno de desarrollo local.

1.  **Clonar el repositorio**
    ```bash
    git clone <URL-del-repositorio>
    cd zonascriticas
    ```

2.  **Crear y activar un entorno virtual**
    ```bash
    # Crear el entorno
    python -m venv entorno_zc

    # Activar en Windows
    entorno_zc\Scripts\activate

    # Activar en macOS/Linux
    source entorno_zc/bin/activate
    ```

3.  **Instalar dependencias**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configurar variables de entorno**
    Crea un archivo `.env` en la raíz del proyecto y añade las siguientes variables. Asegúrate de reemplazar los valores de ejemplo.
    ```env
    # Clave secreta de Django
    SECRET_KEY=tu_super_secreto_aqui

    # Configuración de Debug
    DEBUG=True
    ALLOWED_HOSTS=127.0.0.1,localhost

    # Configuración de la Base de Datos (ejemplo con MySQL)
    DB_ENGINE=django.db.backends.mysql
    DB_NAME=zonascriticas_db
    DB_USER=root
    DB_PASSWORD=tu_contraseña
    DB_HOST=localhost
    DB_PORT=3306

    # Configuración para envío de correos (ejemplo con Gmail)
    EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
    EMAIL_HOST=smtp.gmail.com
    EMAIL_PORT=587
    EMAIL_USE_TLS=True
    EMAIL_HOST_USER=tu_correo@gmail.com
    EMAIL_HOST_PASSWORD=tu_contraseña_de_aplicacion
    DEFAULT_FROM_EMAIL=tu_correo@gmail.com
    ```

5.  **Aplicar las migraciones de la base de datos**
    ```bash
    python manage.py migrate
    ```

6.  **Iniciar el servidor de desarrollo**
    ```bash
    python manage.py runserver
    ```
    La aplicación estará disponible en `http://127.0.0.1:8000`.
"""
zonascriticas\zonascriticas\settings.py

Descripción: Esta es la sala de operaciones de nuestro proyecto de Django
aqui es donde organizamos las constantes que necesita Django para hacer funcionar todo 
el framework de manera correcta 

"""

# Usamos las bibliotecas pathlib, os y dotenv para manejar las rutas y las variables 
# de entorno de manera correcta y proteger datos sensibles de la empresa 
# (NO REVELES NADA DE LO QUE EXISTE EN LOS .env)
from pathlib import Path
import os
from dotenv import load_dotenv

# Usamos BASE_DIR para subir hasta la ruta zonascriticas (Esta es la base url)
BASE_DIR = Path(__file__).resolve().parent.parent # Usamos parent para subir los directorios

# La variable de entorno esta un nivel arriba de zonascriticas, luego le añadirmos / .env
env_path = BASE_DIR.parent / '.env'

# Cargamos la variable de entorno que esta en la ruta que apuntamos en env_path
load_dotenv(dotenv_path=env_path)

# Esta es la llave de encriptacion de las sesiones y la cockies que usa Django
# DEBES DEJAR ESTA LLAVE EN SECRETO (NO SUBIR A NINGUN LUGAR)
SECRET_KEY = os.getenv('SECRET_KEY', 'Fallo')

# Esta es la configuracion para facilitar el DEBUG cuando no trabajamos en producción
# ESTA VARIABLE DENE ESTAR False CUANDO SE TRABAJA EN PRODUCCION
DEBUG = os.getenv('DEBUG', 'False') == 'True'

# Esta configuracion es para los dominios por los cuales podemos acceder a la base de datos
# EN DESARROLLO PUEDES USAR EN LA VARIABLE DE ENTORNO: "*" O LOS QUE DESEES
# EN UN STRING SEPARANDO POR COMAS PARA QUE EL SLIPT TE CREE LA LISTA QUE NECESITAS
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '127.0.0.1,localhost').split(',')

# Aqui las apps que tenemos instaladas y en uso
# He comentado auth, admin y contenttypes porque no estamos usando 
# en la base de datos el campo de contraseña por cuestiones de logica del negocio
INSTALLED_APPS = [
    #'django.contrib.admin',
    #'django.contrib.auth',
    #'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'login',
    'home',
    'perfil',
    'empresas',
    'descargo_responsabilidad',
    'registro_herramientas',
    'actividades',
    'registros',
]

# Nuestros middlewares: he comentado una linea porque vamos a usar una sistema persoanlizado 
# de sesiones dado que no vamos a usar las apps que esta comentadas arriba
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    #'django.contrib.auth.middleware.AuthenticationMiddleware', 
    'login.middleware.CustomAuthMiddleware', # Este es el middleware personalizado
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Esta configuracion es para nuestro enrutamiento de urls.py con la de ZONASCRITICAS
ROOT_URLCONF = 'zonascriticas.urls'

# Esta configuracion nos sirve para poder utilizar de manera adecuada el DTL: Django Templates 
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [], # DIR BUSCA LA DIRECCION DE LA CARPETA TEMPALTES
        'APP_DIRS': True, # LE DICE A DJANGO BUSCA: login/templates/login.html SI LO ENCUENTRA LO RENDERIZA
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

#  Le dice al servidor de producción (como Apache o Nginx con Gunicorn) 
# dónde está la "aplicación WSGI" de Django para poder ejecutar el proyecto.
WSGI_APPLICATION = 'zonascriticas.wsgi.application'

# Configuracion de la base de datos
# Se deja por defecto el localhost para mayor familiaridad si vienes
# de trabajar proyectos con XAMPP pero si deseas puedes usar la que 
# trae Django por defecto
DATABASES = {
    'default': {
        'ENGINE': os.getenv('DB_ENGINE', 'django.db.backends.sqlite3'),
        'NAME': os.getenv('DB_NAME', 'zonascriticas_db'),
        'USER': os.getenv('DB_USER', 'usuario_mysql'),       
        'PASSWORD': os.getenv('DB_PASSWORD', ''), 
        'HOST': os.getenv('DB_HOST', 'localhost'),       
        'PORT': os.getenv('DB_PORT', '3306'),     
    }
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

"""
# COMO NO ESTAMOS USANDO CAMPO DE CONTRASEÑA EN LA BASE DE DATOS PUEDES OLVIDARTE DE ESTO
# MIENTRAS NO SE USE

AUTH_PASSWORD_VALIDATORS = [
    {
        # UserAttributeSimilarityValidator evita que la contraseña tenga atributos del usuario
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        # MinimumLengthValidator Exige un minimo de caracteres para la contraseña
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        # Valida que la contraseña no este en una lista enorme de contraseñas inseguras
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {   
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]
"""

# AJUSTAMOS LA CONFIGURACION DE LA ZONA A COLOCAMBIA
LANGUAGE_CODE = 'es-co'  # Español de Colombia
TIME_ZONE = 'America/Bogota'  # Zona horaria de Colombia
USE_I18N = True  # Habilita internacionalización
USE_TZ = True  # Usa timezone-aware datetimes

STATIC_URL = 'static/'  # URL base para archivos estáticos
MEDIA_URL = '/media/'  # URL base para archivos multimedia subidos por usuarios

# Ruta en el sistema de archivos donde se almacenan los archivos multimedia
MEDIA_ROOT = BASE_DIR / 'media'  

# --- CONFIGURACIÓN DE CORREO (SMTP) ---
# Esto conecta Django con las variables de tu .env (Mailtrap por el momento)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.getenv('EMAIL_HOST')
EMAIL_PORT = os.getenv('EMAIL_PORT')
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')

# Conversión explícita: El .env devuelve texto, Django necesita Booleano
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS') == 'True'

DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL')

# Configuraciones de seguridad

# 1. Evita que JavaScript acceda a la cookie de sesión (Anti-XSS)
SESSION_COOKIE_HTTPONLY = True

# 2. La cookie solo se envía en conexiones HTTPS (Activar en Producción, Falso en Dev local si no tienes SSL)
# Como usas .env, lo ligamos a tu variable DEBUG. Si NO es debug, es True.
SESSION_COOKIE_SECURE = False if DEBUG else True 
CSRF_COOKIE_SECURE = False if DEBUG else True

# 3. Protección contra Cross-Site Request Forgery
SESSION_COOKIE_SAMESITE = 'Lax' 

# 4. Cierra la sesión si el usuario cierra el navegador (Opcional, pero recomendado para empresas)
SESSION_EXPIRE_AT_BROWSER_CLOSE = True

# 5. Motor de Sesión (Usaremos base de datos por defecto, es seguro)
SESSION_ENGINE = 'django.contrib.sessions.backends.db'

# CONFIGURACION PARA MANEJAR EL BLOQUEO DE IPs
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.db.DatabaseCache',
        'LOCATION': 'seguridad_cache', # AQUI COLOCAMOS EL NOMBRE DE LA TABLA
    }
}
# OBSERVACIÓN: Cuando se monte este proyecto en producción se debe ejecutar de nuevo el comando
# python manage.py createcachetable
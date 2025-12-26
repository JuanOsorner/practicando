"""

"""
import os # Importamos nuestro os para encapsular nuestras variables de entorno
from pathlib import Path
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Ubicación del .env

# Ubicamos donde esta nuestro .env
env_path = BASE_DIR.parent / '.env' # Esta un nivel por arriba

# cargamos las variables de entorno
load_dotenv(dotenv_path=env_path)

# Nuestra llave de seguridad (DEBES MANTENERLA EN SECRETO)
SECRET_KEY = os.getenv('SECRET_KEY_IMASD', 'Fallo') #Si no encuenta la llave retorna un error 

# Nuestro DEBUGING esto es para facilitar el desarrollo (EN DESARROLLO DEBE ESTAR EN TRUE)
DEBUG = os.getenv('DEBUG_IMASD', False)

# Debemos colocar todos nuestros host en la variable de entorno por seguridad
# Por defecto dejamos * para desarrollo
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS_IMASD', '*').split(',')


# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'login',
    'home',
    'formulador',
    'catalogo',
]

# Aqui nuestros middlewares
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'ImasD.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
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

WSGI_APPLICATION = 'ImasD.wsgi.application'

# CONFIGURACION A LA BASE DE DATOS

engine = os.getenv('ENGINE_IMASD', 'django.db.backends.sqlite3')

# Para desarrollo
if engine == 'django.db.backends.sqlite3':
    DATABASES = {
        'default': {
            'ENGINE': engine,
            'NAME': os.getenv('NAME_IMASD', BASE_DIR / 'db.sqlite3'),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': engine,
            'NAME': os.getenv('NAME_IMASD', ''),
            'USER': os.getenv('USER_IMASD', ''),
            'PASSWORD': os.getenv('PASSWORD_IMASD', ''),
            'HOST': os.getenv('HOST_IMASD', ''),
            'PORT': os.getenv('PUERTO_IMASD', ''),
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# CONFIGURACION DEL USUARIO (lE DECIMOS A DJANGO QUE USE LA TABLA DE USUARIO QUE CREAMOS)
AUTH_USER_MODEL = 'login.usuario'

# AJUSTAMOS LAS FECHAS A COLOMBIA

# Lenguaje
LANGUAGE_CODE = 'es-co'

# Zona Horaria
TIME_ZONE = 'America/Bogota' 

USE_I18N = True

USE_TZ = True

# Prefijo para que Django encuentre la carpeta static
STATIC_URL = '/static/'

STATICFILES_DIRS = [
    # Aqui añadimos todos nuestros archivos estaticos y media
    # BASE_DIR / 'static',
    BASE_DIR / 'media',
]

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
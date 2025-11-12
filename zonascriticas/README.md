# Zonascriticas  критические зоны

[![Python](https://img.shields.io/badge/Python-3.10+-blue?style=for-the-badge&logo=python)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-4.2-blue?style=for-the-badge&logo=django)](https://www.djangoproject.com/)
[![MySQL](https://img.shields.io/badge/MySQL-blue?style=for-the-badge&logo=mysql)](https://www.mysql.com/)
[![API REST](https://img.shields.io/badge/API_REST-blue?style=for-the-badge&logo=dependabot)](https://www.django-rest-framework.org/)

Zonascriticas es una aplicación web desarrollada con Django que se encarga de la gestión de empresas, empleados y perfiles de usuario. La aplicación cuenta con un sistema de autenticación personalizado y expone varios puntos de conexión de API para la gestión de datos.

## ✨ Características

- **Gestión de empresas y empleados:** Permite crear, actualizar y listar empresas y empleados.
- **Perfiles de usuario:** Cada usuario tiene un perfil que puede ser actualizado, incluyendo una imagen de perfil.
- **Autenticación personalizada:** Utiliza un sistema de autenticación propio en lugar del sistema de autenticación por defecto de Django.
- **API REST:** Expone puntos de conexión de API para interactuar con los datos de la aplicación.
- **Servicio de archivos estáticos y multimedia:** Configurado para servir archivos estáticos (CSS, JavaScript) y multimedia (imágenes de perfil).

## 💻 Tecnologías utilizadas

- **Backend:** Python, Django
- **Base de datos:** MySQL
- **Frontend:** HTML, CSS, JavaScript
- **Otros:** python-dotenv, Pillow

## 🔧 Puesta en marcha

Siga estos pasos para poner en marcha el proyecto en su entorno local:

### Requisitos previos

- Python 3.10 o superior
- Pip (gestor de paquetes de Python)
- MySQL

### Instalación

1. **Clone el repositorio:**

   ```bash
   git clone https://github.com/tu-usuario/zonascriticas.git
   cd zonascriticas
   ```

2. **Cree un entorno virtual:**

   ```bash
   python -m venv entorno_zc
   source entorno_zc/bin/activate  # En Windows: entorno_zc\Scripts\activate
   ```

3. **Instale las dependencias:**

   ```bash
   pip install -r requirements.txt
   ```

4. **Configure las variables de entorno:**

   Cree un archivo `.env` en la raíz del proyecto y añada las siguientes variables:

   ```env
   SECRET_KEY=tu_super_secreto
   DEBUG=True
   ALLOWED_HOSTS=127.0.0.1,localhost

   DB_ENGINE=django.db.backends.mysql
   DB_NAME=nombre_de_tu_bd
   DB_USER=tu_usuario_de_bd
   DB_PASSWORD=tu_contraseña_de_bd
   DB_HOST=localhost
   DB_PORT=3306
   ```

5. **Ejecute las migraciones:**

   ```bash
   python manage.py migrate
   ```

6. **Inicie el servidor de desarrollo:**

   ```bash
   python manage.py runserver
   ```

La aplicación estará disponible en `http://127.0.0.1:8000/`.

## 🏗️ Estructura del proyecto

El proyecto está organizado en las siguientes aplicaciones de Django:

- `login`: Gestiona la autenticación de usuarios.
- `home`: Muestra el panel de control principal de la aplicación.
- `perfil`: Gestiona los perfiles de usuario.
- `empresas`: Gestiona las empresas y los empleados.

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulte el archivo `LICENSE` para más detalles.
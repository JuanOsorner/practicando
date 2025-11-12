
# Probando PDF

[![Python](https://img.shields.io/badge/Python-3.10+-blue?style=for-the-badge&logo=python)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-5.2-blue?style=for-the-badge&logo=django)](https://www.djangoproject.com/)
[![ReportLab](https://img.shields.io/badge/ReportLab-blue?style=for-the-badge)](https://www.reportlab.com/)
[![xhtml2pdf](https://img.shields.io/badge/xhtml2pdf-blue?style=for-the-badge)](https://xhtml2pdf.readthedocs.io/)

`probando_pdf` es un proyecto Django diseñado para demostrar la generación y envío de archivos PDF por correo electrónico. La aplicación genera un informe de usuario, lo convierte a PDF y lo envía como un archivo adjunto de correo electrónico.

## ✨ Características

- **Generación de PDF a partir de plantillas HTML:** Utiliza `xhtml2pdf` para convertir plantillas HTML de Django en documentos PDF.
- **Envío de correos electrónicos con archivos adjuntos:** Envía los PDF generados como archivos adjuntos de correo electrónico utilizando las funciones de correo electrónico integradas de Django.
- **Arquitectura basada en servicios:** La lógica de negocio para la generación de PDF y el envío de correos electrónicos está separada de las vistas, promoviendo un código más limpio y modular.

## 💻 Tecnologías utilizadas

- **Backend:** Python, Django
- **Generación de PDF:** xhtml2pdf, ReportLab, PyCairo
- **Otros:** python-dotenv

## 🔧 Puesta en marcha

Siga estos pasos para poner en marcha el proyecto en su entorno local:

### Requisitos previos

- Python 3.10 o superior
- Pip (gestor de paquetes de Python)

### Instalación

1. **Clone el repositorio:**

   ```bash
   git clone https://github.com/tu-usuario/probando_pdf.git
   cd probando_pdf
   ```

2. **Cree un entorno virtual:**

   ```bash
   python -m venv entorno_pdf
   source entorno_pdf/bin/activate  # En Windows: entorno_pdf\Scripts\activate
   ```

3. **Instale las dependencias:**

   ```bash
   pip install -r requirements.txt
   ```

4. **Configure las variables de entorno:**

   Cree un archivo `.env` en la raíz del proyecto y añada las siguientes variables para la configuración del correo electrónico:

   ```env
   EMAIL_HOST=smtp.tuservidor.com
   EMAIL_PORT=587
   EMAIL_USE_TLS=True
   EMAIL_HOST_USER=tu_email@example.com
   EMAIL_HOST_PASSWORD=tu_contraseña
   ```

5. **Ejecute las migraciones:**

   ```bash
   python manage.py migrate
   ```

6. **Cree un superusuario:**

   ```bash
   python manage.py createsuperuser
   ```

7. **Inicie el servidor de desarrollo:**

   ```bash
   python manage.py runserver
   ```

## 🚀 Uso

1. Inicie el servidor de desarrollo.
2. Acceda a la URL `http://127.0.0.1:8000/reporte/<user_id>/`, reemplazando `<user_id>` con el ID de un usuario existente en la base de datos.
3. La aplicación generará un informe en PDF para el usuario especificado y lo enviará a su dirección de correo electrónico.

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulte el archivo `LICENSE` para más detalles.

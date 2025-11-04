# Comandos para el entorno virtual

## Crear un entorno virtual

Para crear un entorno virtual, puedes usar el siguiente comando. Reemplaza `entorno` con el nombre que quieras para tu entorno.

```bash
python -m venv entorno
```

## Activar el entorno virtual

Una vez creado, necesitas activar el entorno virtual. En Windows, usa el siguiente comando:

```bash
.\entorno\Scripts\activate
```

## Instalar dependencias

Para instalar todas las dependencias listadas en `requirements.txt`, usa el siguiente comando:

```bash
pip install -r requirements.txt
```

## Actualizar `requirements.txt`

Cuando instales una nueva dependencia, es importante que actualices el archivo `requirements.txt`. Puedes hacerlo con el siguiente comando:

```bash
pip freeze > requirements.txt
```

## Uso de Django

Django es un framework de alto nivel para desarrollo web en Python.

### Iniciar el servidor de desarrollo

Para iniciar el servidor de desarrollo de Django y ver tu aplicación en el navegador, usa el siguiente comando. Asegúrate de estar en el directorio que contiene `manage.py`.

```bash
python manage.py runserver
```

### Crear una nueva aplicación

Para crear una nueva aplicación dentro de tu proyecto de Django, usa el siguiente comando. Reemplaza `nombre_app` con el nombre de tu aplicación.

```bash
python manage.py startapp nombre_app
```

## Instalar paquetes individualmente

Si necesitas instalar los paquetes uno por uno, puedes usar el siguiente comando:

```bash
pip install asgiref==3.10.0 certifi==2025.10.5 charset-normalizer==3.4.4 Django==4.2.25 django-browser-reload==1.21.0 idna==3.11 mysqlclient==2.2.7 requests==2.32.5 sqlparse==0.5.3 tzdata==2025.2 urllib3==2.5.0
```

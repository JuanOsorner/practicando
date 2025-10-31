import subprocess
import os

# --- Configuración ---
# Define la ruta al directorio del proyecto.
# __file__ es la ruta de este script. os.path.dirname() nos da el directorio 'auto'.
# os.path.dirname() de nuevo nos sube al directorio padre 'practicando'.
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REQUIREMENTS_FILE = os.path.join(PROJECT_ROOT, 'practica_ej2', 'requirements.txt')

def get_installed_packages():
    """
    Devuelve un conjunto con las librerías instaladas y sus versiones.
    Devuelve un conjunto vacío si hay un error.
    """
    try:
        # Usamos subprocess.run con check=True para que lance una excepción si el comando falla.
        result = subprocess.run(
            ["pip", "freeze"],
            capture_output=True,
            text=True,
            check=True,
            encoding='utf-8' # Especificar encoding es una buena práctica
        )
        return set(result.stdout.strip().splitlines())
    except FileNotFoundError:
        print("❌ Error: El comando 'pip' no se encontró. ¿Está Python instalado y en el PATH?")
        return set()
    except subprocess.CalledProcessError as e:
        print(f"❌ Error al ejecutar 'pip freeze':\n{e.stderr}")
        return set()

def write_requirements_file(packages):
    """Escribe la lista de paquetes en el archivo requirements.txt."""
    # Nos aseguramos de que el directorio donde irá el archivo exista.
    os.makedirs(os.path.dirname(REQUIREMENTS_FILE), exist_ok=True)
    
    try:
        # Escribimos el archivo directamente con Python para mejor control y manejo de errores.
        with open(REQUIREMENTS_FILE, 'w', encoding='utf-8') as f:
            # Escribimos los paquetes ordenados alfabéticamente para consistencia.
            for package in sorted(list(packages)):
                f.write(f"{package}\n")
        print(f"✅ Archivo '{REQUIREMENTS_FILE}' actualizado correctamente.")
    except IOError as e:
        print(f"❌ Error al escribir en el archivo '{REQUIREMENTS_FILE}': {e}")

def main():
    """Función principal del script."""
    print("📦 Verificando el entorno de Python...")

    before_packages = get_installed_packages()
    if not before_packages:
        print("No se pudieron obtener los paquetes iniciales. Abortando.")
        return

    print(f"📝 Se monitoreará el archivo: {REQUIREMENTS_FILE}")
    input("➡️  Instala las librerías que necesites (ej. pip install flask) y luego presiona ENTER...")

    after_packages = get_installed_packages()
    if not after_packages:
        # Si falla después, al menos no sobreescribimos el archivo de requerimientos.
        print("No se pudieron obtener los paquetes después de la instalación. Abortando.")
        return

    new_packages = after_packages - before_packages

    if new_packages:
        print("\n🆕 Se detectaron nuevas librerías instaladas:")
        for pkg in sorted(list(new_packages)):
            print(f"   - {pkg}")
        
        print("\nActualizando el archivo de requerimientos...")
        # Escribimos la lista completa de paquetes actuales.
        write_requirements_file(after_packages)
    else:
        print("\n✅ No se detectaron cambios en las dependencias.")
        # Opcional: Preguntar si se quiere sobreescribir el archivo de todos modos.
        # Esto es útil para limpiar el archivo si hemos desinstalado paquetes manualmente.
        overwrite = input("¿Quieres sobreescribir el archivo con los paquetes actuales de todos modos? (s/N): ")
        if overwrite.lower() == 's':
            write_requirements_file(after_packages)

if __name__ == "__main__":
    main()
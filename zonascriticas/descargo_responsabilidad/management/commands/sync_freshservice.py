from django.core.management.base import BaseCommand
from descargo_responsabilidad.services import FreshserviceSync
import time

# Esta estructura es en general para comandos que van mas de la mano de la administracion
# Tareas administrativas que no deberia ver el usuario
class Command(BaseCommand):
    help = 'Sincroniza Zonas buscando palabras clave en todo el inventario'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('🚀 Iniciando escaneo masivo de Freshservice...'))
        start_time = time.time()

        try:
            res = FreshserviceSync.sincronizar_activos()
            
            duration = time.time() - start_time
            
            msg = (
                f"\n✅ PROCESO FINALIZADO en {duration:.2f}s.\n"
                f"----------------------------------------\n"
                f" 📄 Páginas consultadas: {res['total_paginas']}\n"
                f" 🔍 Total activos analizados: {res['total_analizados']}\n"
                f" 🎯 Zonas/Impresoras encontradas: {res['importados']}\n"
                f"    - Nuevas en DB: {res['creados']}\n"
                f"    - Actualizadas: {res['actualizados']}\n"
                f"----------------------------------------"
            )
            self.stdout.write(self.style.SUCCESS(msg))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error crítico: {str(e)}'))
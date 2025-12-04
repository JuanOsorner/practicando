import os
import django
from datetime import timedelta

# 1. Configurar entorno Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zonascriticas.settings')
django.setup()

from django.utils import timezone
from login.models import Usuario
from descargo_responsabilidad.models import RegistroIngreso

# --- CONFIGURACIÓN ---
# Pon aquí tu número de documento real
DOCUMENTO_A_PROBAR = '1234567891' 
# ---------------------

def depurar_tiempo():
    print("🔬 --- INICIANDO DIAGNÓSTICO DE TIEMPO ---")
    
    try:
        # ✅ CORRECCIÓN: Buscamos por numero_documento dentro del try/except
        usuario = Usuario.objects.get(numero_documento=DOCUMENTO_A_PROBAR)
        print(f"👤 Usuario encontrado: {usuario.get_full_name()} (ID: {usuario.id})")
        print(f"   Hora límite configurada: {usuario.tiempo_limite_jornada}")
    except Usuario.DoesNotExist:
        print(f"❌ Error: Usuario con documento {DOCUMENTO_A_PROBAR} no encontrado.")
        return

    # Buscar ingreso activo
    ingreso = RegistroIngreso.objects.filter(
        visitante=usuario,
        estado=RegistroIngreso.EstadoOpciones.EN_ZONA
    ).first()

    if not ingreso:
        print("⚠️ El usuario NO tiene un ingreso activo 'En Zona'.")
        print("   -> El decorador lo expulsará inmediatamente.")
        return

    # --- VARIABLES CRÍTICAS ---
    ahora = timezone.localtime(timezone.now())
    entrada_original = ingreso.fecha_hora_ingreso
    entrada_local = timezone.localtime(entrada_original)
    
    print(f"\n📅 DATOS EN BASE DE DATOS:")
    print(f"   • Hora Actual (Sistema):  {ahora}")
    print(f"   • Hora Entrada (BD):      {entrada_local}")
    
    if entrada_local.date() != ahora.date():
        print("   🚨 ALERTA ROJA: La fecha de entrada NO es hoy.")
        print(f"      Diferencia de días: {(ahora.date() - entrada_local.date()).days} días.")

    # --- SIMULACIÓN DE LÓGICA ---
    print(f"\n🧮 CÁLCULO DE LÍMITE:")
    
    limite = None
    if usuario.tiempo_limite_jornada:
        hora_limite_usuario = usuario.tiempo_limite_jornada
        print(f"   • Configuración Usuario:  {hora_limite_usuario} (Hora fija)")
        
        # Combinamos fecha de entrada con hora límite
        limite = entrada_local.replace(
            hour=hora_limite_usuario.hour,
            minute=hora_limite_usuario.minute,
            second=hora_limite_usuario.second,
            microsecond=0
        )
        
        # Ajuste nocturno (si la hora de salida es menor a la de entrada, es el día siguiente)
        # Nota: Esto asume turnos < 24h. Si entra hoy a las 8am y sale hoy a las 7pm, esto no se ejecuta.
        if limite < entrada_local:
            limite += timedelta(days=1)
            print(f"   • Ajuste Nocturno (+1d):  {limite}")
            
        print(f"   • Límite Calculado (A):   {limite}")
            
    else:
        print("   • Configuración:          8 Horas (Default)")
        limite = entrada_local + timedelta(hours=8)
        print(f"   • Límite Calculado (B):   {limite}")

    # --- RESULTADO FINAL ---
    diferencia = limite - ahora
    segundos_restantes = int(diferencia.total_seconds())

    print(f"\n📊 VEREDICTO:")
    print(f"   • Límite Final: {limite}")
    print(f"   • Ahora:        {ahora}")
    print(f"   • Restan:       {segundos_restantes} segundos")

    if segundos_restantes <= 0:
        print("\n❌ ESTADO: VENCIDO (El sistema te expulsará)")
    else:
        print("\n✅ ESTADO: ACTIVO (Tienes tiempo)")

    # --- OPCIÓN DE AUTO-CORRECCIÓN ---
    # Solo ofrecemos arreglarlo si la fecha está mal (es vieja)
    if entrada_local.date() != ahora.date():
        print("\n🛠️  ACCIONES:")
        print("¿Quieres actualizar la fecha de entrada a HOY para arreglarlo?")
        confirmacion = input("Escribe 'si' para arreglarlo: ")
        
        if confirmacion.lower() == 'si':
            # Mantenemos la hora original, pero cambiamos año/mes/día a hoy
            nueva_fecha = ahora.replace(
                hour=entrada_local.hour, 
                minute=entrada_local.minute, 
                second=entrada_local.second
            )
            ingreso.fecha_hora_ingreso = nueva_fecha
            ingreso.save()
            print("✅ Fecha actualizada correctamente. Intenta entrar al sistema ahora.")

if __name__ == '__main__':
    depurar_tiempo()
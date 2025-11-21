# login/utils.py
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)

class SecurityJail:
    """
    Gestor de Bloqueos Escalonados (Tiered Rate Limiting).
    Usa la cache de Django para almacenar contadores volátiles.
    """
    
    # Configuración de reglas
    MAX_INTENTOS_LEVES = 5          # Intentos antes del primer bloqueo
    TIEMPO_VENTANA_LEVE = 300       # 5 minutos (ventana para contar intentos)
    TIEMPO_CASTIGO_LEVE = 300       # 5 minutos (tiempo bloqueado)
    
    MAX_REINCIDENCIAS = 3           # Cuántas veces puedes ser bloqueado levemente
    TIEMPO_CASTIGO_GRAVE = 86400    # 24 horas (Bloqueo final)

    @staticmethod
    def get_client_ip(request):
        """Obtiene la IP real del cliente, incluso detrás de proxies."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    @classmethod
    def verificar_acceso(cls, request):
        """
        Retorna:
            (True, None) -> Si puede pasar.
            (False, mensaje) -> Si está bloqueado.
        """
        ip = cls.get_client_ip(request)
        
        # 1. Chequear si está en LA CARCEL DE MÁXIMA SEGURIDAD (Bloqueo Grave)
        key_grave = f"block_grave_{ip}"
        if cache.get(key_grave):
            return False, "IP bloqueada por 24 horas debido a actividad sospechosa."

        # 2. Chequear si está en EL CALABOZO (Bloqueo Leve)
        key_leve = f"block_leve_{ip}"
        if cache.get(key_leve):
            # Para compatibilidad general (Local memory), simplemente devolvemos mensaje genérico
            return False, "Demasiados intentos. Espere 5 minutos."

        return True, None

    @classmethod
    def registrar_fallo(cls, request):
        """
        Se llama cuando el usuario falla el login (documento no existe o inactivo).
        """
        ip = cls.get_client_ip(request)
        
        # Keys de cache
        key_intentos = f"attempts_{ip}"
        key_reincidencias = f"strikes_{ip}"
        
        # 1. Incrementar contador de intentos
        # get_or_set inicia en 0 si no existe, timeout define la ventana de tiempo
        intentos = cache.get_or_set(key_intentos, 0, cls.TIEMPO_VENTANA_LEVE)
        cache.incr(key_intentos)
        
        attempts_actuales = intentos + 1
        logger.warning(f"Login fallido desde {ip}. Intento {attempts_actuales}/{cls.MAX_INTENTOS_LEVES}")

        # 2. Evaluar si merece CASTIGO LEVE
        if attempts_actuales >= cls.MAX_INTENTOS_LEVES:
            # Castigado!
            key_block_leve = f"block_leve_{ip}"
            cache.set(key_block_leve, True, cls.TIEMPO_CASTIGO_LEVE)
            
            # Reseteamos los intentos para que cuando vuelva empiece de 0 (o cuente reincidencia)
            cache.delete(key_intentos)
            
            # Sumamos una REINCIDENCIA (Strike)
            strikes = cache.get_or_set(key_reincidencias, 0, 3600) # Guardamos strikes por 1 hora
            cache.incr(key_reincidencias)
            
            logger.warning(f"IP {ip} enviada al calabozo (Bloqueo Leve). Strike {strikes + 1}")

            # 3. Evaluar si merece CASTIGO GRAVE (Cárcel 24h)
            if (strikes + 1) >= cls.MAX_REINCIDENCIAS:
                key_block_grave = f"block_grave_{ip}"
                cache.set(key_block_grave, True, cls.TIEMPO_CASTIGO_GRAVE)
                logger.critical(f"IP {ip} bloqueada por 24 horas (Fuerza Bruta detectada).")
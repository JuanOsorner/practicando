"""
login/utils.py

Utilidades de seguridad para el módulo de autenticación.

Este módulo implementa un mecanismo de **rate limiting escalonado** basado en IP
(Tiered Rate Limiting) utilizando el backend de **cache de Django**. Su objetivo es
mitigar ataques de fuerza bruta durante el proceso de login mediante:

- Conteo de intentos fallidos dentro de una ventana temporal.
- Bloqueos temporales (leves) tras exceder un umbral de intentos.
- Bloqueo prolongado (grave) ante reincidencia.

Características clave
---------------------
- Diseño *stateless*: no persiste información en base de datos.
- Compatible con distintos backends de cache (memoria local, Redis, Memcached).
- Centraliza la política de seguridad para facilitar auditoría y mantenimiento.

Uso típico
----------
- Llamar a ``SecurityJail.verificar_acceso(request)`` **antes** de procesar el login.
- Llamar a ``SecurityJail.registrar_fallo(request)`` cuando el login falle.

Notas de seguridad
------------------
- El bloqueo se realiza por IP; detrás de proxies es necesario configurar
  correctamente ``X-Forwarded-For``.
- Los tiempos y umbrales deben ajustarse según el contexto de la aplicación.

Escrito por Juan Esteban Osorno Duque 😎
"""

from django.core.cache import cache
import logging
from typing import Optional, Tuple

logger = logging.getLogger(__name__)


class SecurityJail:
    """
    Gestor de bloqueos escalonados por IP.

    Esta clase encapsula la lógica de control de accesos fallidos al sistema de login.
    Utiliza la cache de Django para almacenar contadores volátiles y banderas de bloqueo.

    Flujo general:
    1. Se verifica si la IP está bloqueada (leve o grave).
    2. En caso de fallo de autenticación, se incrementan los contadores.
    3. Al superar umbrales, se aplican bloqueos temporales o prolongados.
    """

    # ------------------------------------------------------------------
    # Configuración de reglas (política de seguridad)
    # ------------------------------------------------------------------

    #: Número máximo de intentos fallidos permitidos antes del bloqueo leve.
    MAX_INTENTOS_LEVES: int = 5

    #: Ventana temporal (en segundos) para contar intentos fallidos.
    TIEMPO_VENTANA_LEVE: int = 300  # 5 minutos

    #: Duración del bloqueo leve (en segundos).
    TIEMPO_CASTIGO_LEVE: int = 300  # 5 minutos

    #: Número de reincidencias (bloqueos leves) permitidas antes del bloqueo grave.
    MAX_REINCIDENCIAS: int = 3

    #: Duración del bloqueo grave (en segundos).
    TIEMPO_CASTIGO_GRAVE: int = 86400  # 24 horas

    # ------------------------------------------------------------------
    # Métodos auxiliares
    # ------------------------------------------------------------------

    @staticmethod
    def get_client_ip(request) -> Optional[str]:
        """
        Obtiene la IP real del cliente a partir del objeto ``request``.

        Prioriza la cabecera ``HTTP_X_FORWARDED_FOR`` (común detrás de proxies)
        y, en su defecto, utiliza ``REMOTE_ADDR``.

        Parameters
        ----------
        request : HttpRequest
            Objeto request de Django.

        Returns
        -------
        str | None
            Dirección IP del cliente o ``None`` si no está disponible.
        """
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")

    # ------------------------------------------------------------------
    # API pública
    # ------------------------------------------------------------------

    @classmethod
    def verificar_acceso(cls, request) -> Tuple[bool, Optional[str]]:
        """
        Verifica si una IP tiene permitido continuar con el proceso de login.

        Parameters
        ----------
        request : HttpRequest
            Objeto request de Django.

        Returns
        -------
        (bool, str | None)
            - ``(True, None)`` si el acceso está permitido.
            - ``(False, mensaje)`` si la IP está bloqueada.
        """
        ip = cls.get_client_ip(request)

        if not ip:
            # En caso extremo, permitimos el acceso pero dejamos trazabilidad
            logger.error("No se pudo determinar la IP del cliente.")
            return True, None

        # 1. Bloqueo grave (24h)
        key_grave = f"block_grave_{ip}"
        if cache.get(key_grave):
            return False, "IP bloqueada por 24 horas debido a actividad sospechosa."

        # 2. Bloqueo leve
        key_leve = f"block_leve_{ip}"
        if cache.get(key_leve):
            return False, "Demasiados intentos. Espere 5 minutos."

        return True, None

    @classmethod
    def registrar_fallo(cls, request) -> None:
        """
        Registra un intento fallido de autenticación.

        Este método debe llamarse **únicamente** cuando el login ha fallado
        (usuario inexistente, credenciales inválidas o usuario inactivo).

        Parameters
        ----------
        request : HttpRequest
            Objeto request de Django.
        """
        ip = cls.get_client_ip(request)

        if not ip:
            logger.error("Intento fallido sin IP identificable.")
            return

        # Keys de cache
        key_intentos = f"attempts_{ip}"
        key_reincidencias = f"strikes_{ip}"

        # 1. Incrementar contador de intentos dentro de la ventana
        intentos = cache.get_or_set(
            key_intentos,
            0,
            timeout=cls.TIEMPO_VENTANA_LEVE,
        )
        cache.incr(key_intentos)

        attempts_actuales = intentos + 1
        logger.warning(
            "Login fallido desde %s. Intento %s/%s",
            ip,
            attempts_actuales,
            cls.MAX_INTENTOS_LEVES,
        )

        # 2. Evaluar bloqueo leve
        if attempts_actuales >= cls.MAX_INTENTOS_LEVES:
            key_block_leve = f"block_leve_{ip}"
            cache.set(key_block_leve, True, cls.TIEMPO_CASTIGO_LEVE)

            # Reiniciamos el contador de intentos
            cache.delete(key_intentos)

            # Registrar reincidencia (strike)
            strikes = cache.get_or_set(key_reincidencias, 0, timeout=3600)
            cache.incr(key_reincidencias)

            logger.warning(
                "IP %s enviada a bloqueo leve. Strike %s/%s",
                ip,
                strikes + 1,
                cls.MAX_REINCIDENCIAS,
            )

            # 3. Evaluar bloqueo grave
            if (strikes + 1) >= cls.MAX_REINCIDENCIAS:
                key_block_grave = f"block_grave_{ip}"
                cache.set(key_block_grave, True, cls.TIEMPO_CASTIGO_GRAVE)
                logger.critical(
                    "IP %s bloqueada por 24 horas (posible fuerza bruta).",
                    ip,
                )

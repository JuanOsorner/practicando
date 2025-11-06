# gemini_bot/core/gemini_service.py

import os
import google.generativeai as genai
from dotenv import load_dotenv
import time  # Importamos la librería time
from google.api_core import exceptions as google_exceptions # Importamos las excepciones

class GeminiService:
    """
    Clase que encapsula la lógica de negocio y la comunicación
    con la API de Google Gemini.
    """

    def __init__(self):
        """
        Constructor. Carga la configuración inicial,
        la API key y configura el modelo.
        """
        # Cargar variables de entorno
        load_dotenv()

        self.api_key = os.getenv('LLAVEGEMINI')
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY no encontrada. Asegúrate de crear un archivo .env")

        # Configura la API key
        genai.configure(api_key=self.api_key)

        # Inicializa el modelo
        try:
            self.model = genai.GenerativeModel('gemini-pro-latest')
            print("Modelo Gemini (gemini-pro-latest) inicializado exitosamente.")
        except Exception as e:
            print(f"Error al inicializar el modelo Gemini: {e}")
            raise

    def get_response(self, user_prompt: str) -> str:
        """
        Envía un prompt del usuario a Gemini y obtiene una respuesta.
        Ahora incluye reintentos automáticos si se excede la cuota.
        """
        if not user_prompt:
            return "Por favor, introduce un mensaje."

        # --- [DEFINICIÓN DE VARIABLES DE REINTENTO] ---
        # Estas eran las líneas que faltaban
        max_retries = 3
        base_wait_time = 5  
        # -----------------------------------------------
        
        for attempt in range(max_retries):
            try:
                # Enviar el prompt al modelo.
                response = self.model.generate_content(user_prompt)
                return response.text # Si tiene éxito, devuelve la respuesta

            except google_exceptions.ResourceExhausted as e:
                # ¡Error de Cuota (429)!
                print(f"Error de Cuota (429) detectado. Intento {attempt + 1} de {max_retries}.")
                
                if attempt + 1 == max_retries:
                    # Si es el último intento, relanza la excepción
                    print(f"Límite de reintentos alcanzado. {e}")
                    raise e 
                
                # Calcular tiempo de espera (5s, 10s, 20s)
                wait_time = base_wait_time * (2 ** attempt)
                
                print(f"Esperando {wait_time} segundos antes de reintentar...")
                time.sleep(wait_time)

            except Exception as e:
                # Capturar cualquier otro error y relanzarlo
                print(f"Error al generar respuesta de Gemini: {e}")
                raise e 
        
        # Fallback por si el bucle termina (no debería)
        raise Exception("No se pudo procesar la solicitud después de varios intentos.")
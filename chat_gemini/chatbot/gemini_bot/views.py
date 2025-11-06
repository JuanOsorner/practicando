from django.shortcuts import render
from django.http import JsonResponse, HttpRequest
from django.views.decorators.csrf import csrf_exempt
import json

# Importamos nuestro "cerebro" OOP
from .core.gemini_service import GeminiService

# [NUEVO] Importamos las excepciones específicas de Google
from google.api_core import exceptions as google_exceptions

# --- Patrón Singleton ---
# Instanciamos el servicio UNA SOLA VEZ cuando el servidor arranca.
try:
    gemini_service = GeminiService()
except Exception as e:
    print(f"Error FATAL al inicializar GeminiService: {e}")
    gemini_service = None
# --------------------------

def chat_view(request: HttpRequest):
    """
    Vista que renderiza la página HTML principal del chat.
    
    [CORREGIDO] Esta es la función que tenía el error de indentación.
    El 'return' debe estar indentado para pertenecer a la función.
    """
    return render(request, 'chat.html')


@csrf_exempt  # Necesario para permitir peticiones POST desde JavaScript
def chat_api(request: HttpRequest):
    """
    Este es nuestro endpoint de API.
    Maneja la lógica de recibir un prompt y devolver una respuesta.
    
    [ACTUALIZADO] Ahora captura excepciones del 'core' y
    devuelve los códigos de estado HTTP correctos.
    """
    if gemini_service is None:
        # Falla si el servicio no pudo arrancar
        return JsonResponse({'error': 'El servicio de chat no está disponible.'}, status=500)

    if request.method == 'POST':
        try:
            # Leer el JSON enviado desde el frontend
            data = json.loads(request.body)
            user_prompt = data.get('prompt')

            if not user_prompt:
                return JsonResponse({'error': 'No se recibió ningún prompt.'}, status=400)

            # --- Refactorización Clave ---
            # Envolvemos la llamada al 'core' en un try/except
            try:
                # 1. Intentamos obtener la respuesta del "cerebro"
                bot_response = gemini_service.get_response(user_prompt)
                
                # 2. Si todo OK, devolvemos 200 OK con la respuesta
                return JsonResponse({'response': bot_response})
            
            except google_exceptions.ResourceExhausted as e:
                # 3. Si el "cerebro" lanza error de Cuota (429)...
                print(f"Error 429 (Cuota) capturado en la vista: {e.message}")
                return JsonResponse({
                    'error': 'Límite de cuota excedido. Por favor, espera 30 segundos.'
                }, status=429) # <-- Devolvemos el estado 429
            
            except Exception as e:
                # 4. Si el "cerebro" lanza cualquier OTRO error...
                print(f"Error 500 (Interno) capturado en la vista: {e}")
                return JsonResponse({'error': str(e)}, status=500) # <-- Devolvemos 500
            # --- Fin de la Refactorización ---
            
        except json.JSONDecodeError:
            # Error si el JS envía un JSON malformado
            return JsonResponse({'error': 'JSON inválido.'}, status=400)

    # Si no es POST, no permitimos el método
    return JsonResponse({'error': 'Método no permitido.'}, status=405)
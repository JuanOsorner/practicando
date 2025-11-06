// gemini_bot/static/js/main.js

document.addEventListener("DOMContentLoaded", () => {
    
    // Seleccionamos los elementos clave del HTML
    const chatForm = document.getElementById("chat-form");
    const messageInput = document.getElementById("message-input");
    const chatWindow = document.getElementById("chat-window");

    // 'Escuchamos' el evento 'submit'
    chatForm.addEventListener("submit", async (e) => {
        
        // 1. Prevenir que el formulario recargue la página
        e.preventDefault();

        // 2. Obtener el texto del usuario y limpiarlo
        const userMessage = messageInput.value.trim();
        if (userMessage === "") {
            return; // No enviar mensajes vacíos
        }

        // 3. Mostrar el mensaje del usuario en la ventana
        addMessageToWindow(userMessage, "user");

        // 4. Limpiar el input
        messageInput.value = "";
        
        // 5. Mostrar un indicador de "escribiendo..."
        const loadingMessage = addMessageToWindow("...", "loading");

        try {
            // --- [INICIO DE LA CORRECCIÓN] ---
            // Aquí es donde faltaba el código.
            // Le decimos a fetch que use 'POST' y enviamos el JSON.
            const response = await fetch('/api/chat/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    'prompt': userMessage 
                })
            });
            // --- [FIN DE LA CORRECCIÓN] ---

            // Leemos el JSON de la respuesta
            const data = await response.json();

            if (!response.ok) {
                // Si la respuesta NO fue 200 (ej. 405, 429, 500)
                let errorMessage = data.error || `Error del servidor: ${response.status}`;
                
                // Manejo especial para el error 429
                if (response.status === 429) {
                    errorMessage = "Demasiadas solicitudes. Por favor, espera un minuto.";
                }
                
                throw new Error(errorMessage);
            }

            // Si todo fue OK (200), reemplazamos el "..."
            if (data.response) {
                loadingMessage.innerText = data.response;
                loadingMessage.classList.remove("loading");
                loadingMessage.classList.add("bot");
            } else if (data.error) {
                throw new Error(data.error);
            }

        } catch (error) {
            // El bloque 'catch' ahora recibirá el error personalizado
            loadingMessage.innerText = `Error: ${error.message}`;
            loadingMessage.classList.remove("loading");
            loadingMessage.classList.add("error");
            console.error("Error en la llamada a la API:", error);
        }
        
        // Hacer scroll automático al final
        chatWindow.scrollTop = chatWindow.scrollHeight;
    });

    /**
     * Función helper para añadir un nuevo mensaje a la ventana de chat.
     */
    function addMessageToWindow(message, sender) {
        const messageDiv = document.createElement("div");
        messageDiv.classList.add("message", sender);
        
        const messageParagraph = document.createElement("p");
        messageParagraph.innerText = message;
        
        messageDiv.appendChild(messageParagraph);
        chatWindow.appendChild(messageDiv);
        
        chatWindow.scrollTop = chatWindow.scrollHeight;
        
        return messageParagraph;
    }
});
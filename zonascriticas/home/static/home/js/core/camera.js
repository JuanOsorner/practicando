/**
 * home/static/home/js/core/camera.js
 * Módulo para controlar la cámara nativa del dispositivo.
 */

export class CameraController {
    
    constructor(videoElement) {
        this.videoElement = videoElement;
        this.stream = null;
    }

    /**
     * Inicia la cámara.
     * @param {string} facingMode - 'environment' (trasera) o 'user' (frontal)
     */
    async start(facingMode = 'environment') {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Tu navegador no soporta acceso a la cámara.");
        }

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: facingMode,
                    width: { ideal: 1280 }, // Resolución ideal HD
                    height: { ideal: 720 }
                },
                audio: false
            });
            
            this.videoElement.srcObject = this.stream;
            // Esperar a que el video esté listo para reproducir
            return new Promise((resolve) => {
                this.videoElement.onloadedmetadata = () => {
                    this.videoElement.play();
                    resolve(true);
                };
            });

        } catch (error) {
            console.error("Error cámara:", error);
            if (error.name === 'NotAllowedError') {
                throw new Error("Permiso de cámara denegado. Por favor actívalo en tu navegador.");
            }
            throw error;
        }
    }

    /**
     * Captura el frame actual y lo devuelve como Blob.
     */
    takePhoto() {
        if (!this.stream) throw new Error("La cámara no está iniciada.");

        const canvas = document.createElement('canvas');
        // Ajustar canvas al tamaño real del video
        canvas.width = this.videoElement.videoWidth;
        canvas.height = this.videoElement.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.videoElement, 0, 0);

        return new Promise((resolve) => {
            // Devolver JPEG calidad media por defecto (luego usaremos image.js para comprimir más)
            canvas.toBlob(resolve, 'image/jpeg', 0.9);
        });
    }

    /**
     * Detiene la transmisión y libera la cámara (IMPORTANTE para no gastar batería).
     */
    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.videoElement.srcObject = null;
            this.stream = null;
        }
    }
}
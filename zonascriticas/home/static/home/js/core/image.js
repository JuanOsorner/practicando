/**
 * home/static/home/js/core/image.js
 * Módulo para manipulación, compresión y conversión de imágenes.
 */

export const imageUtils = {

    /**
     * Comprime y redimensiona una imagen (File o Blob)
     * @param {File} file - El archivo original
     * @param {number} maxWidth - Ancho máximo permitido (ej: 1024px)
     * @param {number} quality - Calidad JPEG (0.0 a 1.0, ej: 0.7)
     * @returns {Promise<Blob>} - Promesa con el Blob comprimido
     */
    compress: (file, maxWidth = 1024, quality = 0.7) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                
                img.onload = () => {
                    // 1. Calcular nuevas dimensiones manteniendo aspecto
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }

                    // 2. Crear Canvas en memoria
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // 3. Exportar a Blob (JPEG comprimido)
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error("Error al comprimir la imagen en Canvas."));
                        }
                    }, 'image/jpeg', quality);
                };
                
                img.onerror = (err) => reject(new Error("La imagen no es válida o está corrupta."));
            };
            
            reader.onerror = (err) => reject(new Error("Error al leer el archivo."));
        });
    },

    /**
     * Convierte un Blob/File a Base64 (Para previsualizar en <img>)
     */
    toBase64: (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    },

    /**
     * Convierte Base64 a File (Para enviar al backend si es necesario)
     */
    base64ToFile: (dataurl, filename) => {
        let arr = dataurl.split(','),
            mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]), 
            n = bstr.length, 
            u8arr = new Uint8Array(n);
            
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, {type:mime});
    }
};
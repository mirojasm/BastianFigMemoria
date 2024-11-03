const API_URL = "http://localhost:3001/api";

const preguntasService = {
    getPregunta: async (id, token) => {
        try {
            const response = await fetch(`${API_URL}/preguntas/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Error al obtener la pregunta');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error en getPregunta:', error);
            throw error;
        }
    },

    checkRespuesta: async (preguntaId, token) => {
        try {
            const response = await fetch(`${API_URL}/respuestas-individuales/check/${preguntaId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Error al verificar la respuesta');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error en checkRespuesta:', error);
            throw error;
        }
    },

    createRespuesta: async (preguntaId, respuesta, token) => {
        try {
            const response = await fetch(`${API_URL}/respuestas-individuales`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    preguntaId: parseInt(preguntaId), // Asegurarse de que sea un número
                    respuesta
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al guardar la respuesta');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error en createRespuesta:', error);
            throw error;
        }
    }
};

// Exponer el servicio globalmente
window.preguntasService = preguntasService;

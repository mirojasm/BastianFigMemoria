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
            // Obtener tiempo de inicio del localStorage
            const tiempoInicio = localStorage.getItem(`inicio_pregunta_${preguntaId}`);
            const tiempoFin = new Date().toISOString();
            
            // Calcular tiempo de respuesta en segundos
            const tiempoRespuesta = tiempoInicio ? 
                Math.floor((new Date(tiempoFin) - new Date(tiempoInicio)) / 1000) : 
                null;

            const datosRespuesta = {
                preguntaId: parseInt(preguntaId),
                respuesta,
                tiempoRespuesta,
                inicioRespuesta: tiempoInicio,
                finRespuesta: tiempoFin
            };

            console.log('Enviando datos:', datosRespuesta);

            const response = await fetch(`${API_URL}/respuestas-individuales`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(datosRespuesta)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al guardar la respuesta');
            }
            
            // Limpiar el tiempo de inicio del localStorage
            localStorage.removeItem(`inicio_pregunta_${preguntaId}`);
            
            return await response.json();
        } catch (error) {
            console.error('Error en createRespuesta:', error);
            throw error;
        }
    }
};

// Exponer el servicio globalmente
window.preguntasService = preguntasService;

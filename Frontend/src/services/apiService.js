// Frontend/src/services/apiService.js
const API_URL = "http://localhost:3001/api";

export const colaboracionService = {
	crearPareja: async (user1Id, user2Id, roomId, token) => {
		try {
			const response = await fetch(`${API_URL}/colaboraciones/parejas`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ user1Id, user2Id, roomId }),
			});

			if (!response.ok) {
				throw new Error("Error al crear pareja");
			}

			return await response.json();
		} catch (error) {
			console.error("Error en crearPareja:", error);
			throw error;
		}
	},

	/* guardarMensaje: async (chatId, userId, contenido, token) => {
		try {
			const response = await fetch(`${API_URL}/chats/mensaje`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ chatId, userId, contenido }),
			});

			if (!response.ok) {
				throw new Error("Error al guardar mensaje");
			}

			return await response.json();
		} catch (error) {
			console.error("Error en guardarMensaje:", error);
			throw error;
		}
	}, */
	guardarMensaje: async (chatId, userId, contenido, token) => {
		try {
			const response = await fetch(`${API_URL}/chats/mensaje`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					chat_colaborativo_id: chatId,
					usuario_id: userId, // Asegurarse de que este es el ID real del usuario
					contenido: contenido,
					timestamp: new Date().toISOString()
				}),
			});
	
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Error al guardar mensaje");
			}
	
			return await response.json();
		} catch (error) {
			console.error("Error en guardarMensaje:", error);
			throw error;
		}
	},
	guardarRespuesta: async (collaborationId, preguntaId, respuesta, token) => {
		try {
			console.log("Enviando respuesta final:", {
				collaborationId,
				preguntaId,
				respuesta,
			});

			const response = await fetch(`${API_URL}/chats/respuesta-final`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					pareja_colaboracion_id: parseInt(collaborationId),
					pregunta_id: parseInt(preguntaId),
					respuesta_final: respuesta,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				console.error("Error response:", errorData);
				throw new Error(
					errorData.message || "Error al guardar respuesta"
				);
			}

			const result = await response.json();
			console.log("Respuesta guardada exitosamente:", result);
			return result;
		} catch (error) {
			console.error("Error en guardarRespuesta:", error);
			throw error;
		}
	},
};

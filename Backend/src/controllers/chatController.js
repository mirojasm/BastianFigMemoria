import prisma from "../config/database.js";

export const createChatColaborativo = async (req, res, next) => {
	try {
		const { pareja_colaboracion_id, pregunta_id } = req.body;
		const nuevoChat = await prisma.chats_colaborativos.create({
			data: {
				pareja_colaboracion: {
					connect: { id: pareja_colaboracion_id },
				},
				pregunta: { connect: { id: pregunta_id } },
			},
		});
		res.status(201).json(nuevoChat);
	} catch (error) {
		next(error);
	}
};

export const getChatColaborativo = async (req, res, next) => {
	try {
		const { id } = req.params;
		const chat = await prisma.chats_colaborativos.findUnique({
			where: { id: Number(id) },
			include: {
				pareja_colaboracion: true,
				pregunta: true,
				mensajes_chat: {
					include: {
						usuario: true,
					},
				},
			},
		});
		if (!chat) {
			return res
				.status(404)
				.json({ message: "Chat colaborativo no encontrado" });
		}
		res.json(chat);
	} catch (error) {
		next(error);
	}
};

export const addMensajeChat = async (req, res, next) => {
	try {
		const { chat_colaborativo_id, usuario_id, contenido } = req.body;

		const nuevoMensaje = await prisma.mensajes_chat.create({
			data: {
				chat_colaborativo_id: parseInt(chat_colaborativo_id),
				usuario_id: parseInt(usuario_id),
				contenido,
				timestamp: new Date(),
			},
			include: {
				usuarios: true,
			},
		});

		res.status(201).json(nuevoMensaje);
	} catch (error) {
		console.error("Error al crear mensaje:", error);
		next(error);
	}
};

export const submitRespuestaFinal = async (req, res, next) => {
	try {
		const { pareja_colaboracion_id, pregunta_id, respuesta_final } =
			req.body;

		console.log("Recibiendo respuesta final:", {
			pareja_colaboracion_id,
			pregunta_id,
			respuesta_final,
		});

		const nuevaRespuesta = await prisma.respuestas_finales.create({
			data: {
				pareja_colaboracion_id: parseInt(pareja_colaboracion_id),
				pregunta_id: parseInt(pregunta_id),
				respuesta_final,
				timestamp: new Date(),
			},
			include: {
				parejas_colaboracion: true,
				preguntas: true,
			},
		});

		res.status(201).json(nuevaRespuesta);
	} catch (error) {
		console.error("Error al crear respuesta final:", error);
		next(error);
	}
};

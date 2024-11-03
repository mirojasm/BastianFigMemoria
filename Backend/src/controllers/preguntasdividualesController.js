import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getPregunta = async (req, res) => {
    try {
        const preguntaId = parseInt(req.params.id);
        const pregunta = await prisma.preguntas.findUnique({
            where: { id: preguntaId }
        });

        if (!pregunta) {
            return res.status(404).json({ error: 'Pregunta no encontrada' });
        }

        res.json(pregunta);
    } catch (error) {
        console.error('Error al obtener pregunta:', error);
        res.status(500).json({ error: 'Error al obtener la pregunta' });
    }
};

export const checkRespuesta = async (req, res) => {
    try {
        const preguntaId = parseInt(req.params.preguntaId);
        const userId = req.usuario.id;

        const respuesta = await prisma.respuestas_individuales.findFirst({
            where: {
                pregunta_id: preguntaId,  // cambio de preguntaId a pregunta_id
                usuario_id: userId        // cambio de usuarioId a usuario_id
            }
        });

        res.json({
            existeRespuesta: !!respuesta,
            respuesta: respuesta ? respuesta.respuesta : null
        });
    } catch (error) {
        console.error('Error al verificar respuesta:', error);
        res.status(500).json({ error: 'Error al verificar la respuesta' });
    }
};

export const createRespuesta = async (req, res) => {
    try {
        const { preguntaId, respuesta } = req.body;
        const userId = req.usuario.id;

        const nuevaRespuesta = await prisma.respuestas_individuales.create({
            data: {
                usuarios: {  // cambio de usuario a usuarios según el schema
                    connect: { id: userId }
                },
                preguntas: {  // cambio de pregunta a preguntas según el schema
                    connect: { id: parseInt(preguntaId) }
                },
                respuesta: respuesta,
                timestamp: new Date()
            }
        });

        res.status(201).json(nuevaRespuesta);
    } catch (error) {
        console.error('Error al crear respuesta:', error);
        res.status(500).json({ error: 'Error al guardar la respuesta: ' + error.message });
    }
};
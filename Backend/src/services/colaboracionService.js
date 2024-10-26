// Backend/src/services/colaboracionService.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();


const buscarPareja = async (user1Id, user2Id) => {
    try {
        // Buscar la pareja en ambas direcciones posibles
        const pareja = await prisma.parejas_colaboracion.findFirst({
            where: {
                OR: [
                    {
                        AND: [
                            { usuario1_id: parseInt(user1Id) },
                            { usuario2_id: parseInt(user2Id) }
                        ]
                    },
                    {
                        AND: [
                            { usuario1_id: parseInt(user2Id) },
                            { usuario2_id: parseInt(user1Id) }
                        ]
                    }
                ]
            }
        });
        return pareja;
    } catch (error) {
        console.error('Error al buscar pareja:', error);
        return null;
    }
};

const crearPareja = async (user1Id, user2Id, roomId) => {
    try {
        // Validar que ambos IDs sean números válidos
        const id1 = parseInt(user1Id);
        const id2 = parseInt(user2Id);

        if (isNaN(id1) || isNaN(id2)) {
            throw new Error('IDs de usuario inválidos');
        }
        console.log('Creando/actualizando pareja con:', {
            user1Id: id1,
            user2Id: id2,
            roomId
        });

        // Primero buscar si ya existe la pareja
        const parejaExistente = await buscarPareja(id1, id2);
        
        if (parejaExistente) {
            console.log('Pareja existente encontrada:', parejaExistente);
            // Actualizar el room_id de la pareja existente
            return await prisma.parejas_colaboracion.update({
                where: {
                    id: parejaExistente.id
                },
                data: {
                    room_id: roomId // Cambiado de room a room_id
                }
            });
        }

        // Si no existe, crear una nueva pareja
        return await prisma.parejas_colaboracion.create({
            data: {
                usuario1_id: id1,
                usuario2_id: id2,
                room_id: roomId
            }
        });
    } catch (error) {
        console.error('Error al crear/actualizar pareja:', error);
        throw error;  // Propagar el error para mejor debugging
    }
};

const guardarMensaje = async (chatId, userId, contenido) => {
    try {
        return await prisma.mensajes_chat.create({
            data: {
                chat_colaborativo_id: parseInt(chatId),
                usuario_id: parseInt(userId),
                contenido,
                timestamp: new Date()
            }
        });
    } catch (error) {
        console.error('Error al guardar mensaje:', error);
        return null;
    }
};

const guardarRespuesta = async (collaborationId, preguntaId, respuesta) => {
    try {
        return await prisma.respuestas_finales.create({
            data: {
                pareja_colaboracion_id: parseInt(collaborationId),
                pregunta_id: parseInt(preguntaId),
                respuesta_final: respuesta,
                timestamp: new Date()
            }
        });
    } catch (error) {
        console.error('Error al guardar respuesta:', error);
        return null;
    }
};

export { crearPareja, guardarMensaje, guardarRespuesta };
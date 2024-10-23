// src/controllers/socketController.js
import prisma from '../config/database.js';

// Almacenamiento en memoria para el estado de las salas
const activeRooms = new Map();
const userConnections = new Map();

export const socketController = (io) => {
  io.on('connection', async (socket) => {
    console.log('Usuario conectado:', socket.id);

    // Función para encontrar o crear un chat colaborativo
    async function getOrCreateChatColaborativo(parejaId, preguntaId) {
      let chat = await prisma.chats_colaborativos.findFirst({
        where: {
          pareja_colaboracion_id: parejaId,
          pregunta_id: preguntaId
        }
      });

      if (!chat) {
        chat = await prisma.chats_colaborativos.create({
          data: {
            pareja_colaboracion_id: parejaId,
            pregunta_id: preguntaId
          }
        });
      }

      return chat;
    }

    socket.on('connect-user', async ({ userId, nivel }) => {
      try {
        // Buscar la pareja de colaboración del usuario
        const pareja = await prisma.parejas_colaboracion.findFirst({
          where: {
            OR: [
              { usuario1_id: parseInt(userId) },
              { usuario2_id: parseInt(userId) }
            ]
          },
          include: {
            usuario1: true,
            usuario2: true
          }
        });

        if (!pareja) {
          socket.emit('error', { message: 'No se encontró una pareja asignada' });
          return;
        }

        // Guardar la conexión del usuario
        userConnections.set(socket.id, {
          userId: parseInt(userId),
          parejaId: pareja.id,
          compañeroId: pareja.usuario1_id === parseInt(userId) ? 
                      pareja.usuario2_id : pareja.usuario1_id
        });

        socket.emit('pareja-info', {
          parejaId: pareja.id,
          compañero: pareja.usuario1_id === parseInt(userId) ? 
                    pareja.usuario2 : pareja.usuario1
        });

      } catch (error) {
        console.error('Error al conectar usuario:', error);
        socket.emit('error', { message: 'Error al establecer conexión' });
      }
    });

    socket.on('create-room', async ({ nivel }) => {
      try {
        const userInfo = userConnections.get(socket.id);
        if (!userInfo) {
          socket.emit('error', { message: 'Usuario no conectado' });
          return;
        }

        // Obtener pregunta actual según el nivel
        const pregunta = await prisma.preguntas.findFirst({
          where: { 
            nivel: parseInt(nivel),
            orden: 1 // O la lógica que determines para seleccionar la pregunta
          }
        });

        if (!pregunta) {
          socket.emit('error', { message: 'No se encontró la pregunta para este nivel' });
          return;
        }

        // Crear o encontrar chat colaborativo
        const chat = await getOrCreateChatColaborativo(userInfo.parejaId, pregunta.id);
        
        const roomId = `sala_${userInfo.parejaId}_${pregunta.id}`;
        
        // Configurar sala activa
        activeRooms.set(roomId, {
          parejaId: userInfo.parejaId,
          preguntaId: pregunta.id,
          chatId: chat.id,
          connectedUsers: [userInfo.userId],
          pregunta: pregunta
        });

        socket.join(roomId);
        socket.emit('room-created', { 
          roomId,
          pregunta: pregunta
        });

      } catch (error) {
        console.error('Error al crear sala:', error);
        socket.emit('error', { message: 'Error al crear la sala' });
      }
    });

    socket.on('join-room', async ({ roomId }) => {
      try {
        const userInfo = userConnections.get(socket.id);
        if (!userInfo) {
          socket.emit('error', { message: 'Usuario no conectado' });
          return;
        }

        const room = activeRooms.get(roomId);
        if (!room) {
          socket.emit('error', { message: 'Sala no encontrada' });
          return;
        }

        if (room.parejaId !== userInfo.parejaId) {
          socket.emit('error', { message: 'No tienes acceso a esta sala' });
          return;
        }

        // Unir usuario a la sala
        socket.join(roomId);
        room.connectedUsers.push(userInfo.userId);

        // Cargar mensajes previos
        const mensajesPrevios = await prisma.mensajes_chat.findMany({
          where: { chat_colaborativo_id: room.chatId },
          include: { usuario: true },
          orderBy: { timestamp: 'asc' }
        });

        io.to(roomId).emit('activity-started', {
          pregunta: room.pregunta,
          mensajes: mensajesPrevios
        });

      } catch (error) {
        console.error('Error al unirse a la sala:', error);
        socket.emit('error', { message: 'Error al unirse a la sala' });
      }
    });

    socket.on('send-message', async ({ roomId, message }) => {
      try {
        const userInfo = userConnections.get(socket.id);
        const room = activeRooms.get(roomId);

        if (!userInfo || !room) return;

        const nuevoMensaje = await prisma.mensajes_chat.create({
          data: {
            chat_colaborativo_id: room.chatId,
            usuario_id: userInfo.userId,
            contenido: message
          },
          include: { usuario: true }
        });

        io.to(roomId).emit('new-message', {
          id: nuevoMensaje.id,
          contenido: nuevoMensaje.contenido,
          usuario: nuevoMensaje.usuario,
          timestamp: nuevoMensaje.timestamp
        });

      } catch (error) {
        console.error('Error al enviar mensaje:', error);
        socket.emit('error', { message: 'Error al enviar el mensaje' });
      }
    });

    socket.on('submit-respuesta', async ({ roomId, respuesta }) => {
      try {
        const userInfo = userConnections.get(socket.id);
        const room = activeRooms.get(roomId);

        if (!userInfo || !room) return;

        await prisma.respuestas_finales.create({
          data: {
            pareja_colaboracion_id: room.parejaId,
            pregunta_id: room.preguntaId,
            respuesta_final: respuesta
          }
        });

        io.to(roomId).emit('respuesta-submitted');

      } catch (error) {
        console.error('Error al guardar respuesta:', error);
        socket.emit('error', { message: 'Error al guardar la respuesta' });
      }
    });

    // Manejo de desconexión
    socket.on('disconnect', () => {
      const userInfo = userConnections.get(socket.id);
      if (userInfo) {
        // Notificar a las salas donde estaba el usuario
        for (const [roomId, room] of activeRooms.entries()) {
          if (room.connectedUsers.includes(userInfo.userId)) {
            room.connectedUsers = room.connectedUsers.filter(id => id !== userInfo.userId);
            io.to(roomId).emit('user-disconnected', { userId: userInfo.userId });
          }
        }
        userConnections.delete(socket.id);
      }
    });
  });
};
// Invocar a express
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Setear los datos para capturar los datos de los formularios
app.use(express.urlencoded({extended:false}));
app.use(express.json());

// Invocar a dotenv variables de entorno
const dotenv = require('dotenv');
dotenv.config({path:'./env/.env'});

// Directorio public
app.use('/resources', express.static('public'));
app.use('/resources', express.static(__dirname + '/public'));
console.log(__dirname);

// Configuración específica para Socket.IO
app.use('/socket.io', express.static(__dirname + '/node_modules/socket.io/client-dist'));

// Motor de plantillas 
app.set('view engine', 'ejs');

// Invocamos a bcryptjs
const bcryptjs = require('bcryptjs');

// Variables de session
const session = require('express-session');
app.use(session({
    secret:'secret',
    resave:true,
    saveUninitialized:true
}));

// Rutas
app.get('/',(req,res)=>{
    res.render('login/login')
})

app.get('/login',(req,res)=>{
    res.render('login/login')
})

app.get('/levels',(req,res)=>{
    res.render('levels/niveles')
})

// Nueva ruta para la página de selección de sala
app.get('/seleccionar-sala', (req, res) => {
    res.render('actividad/seleccionar-sala');
});

// Objeto para almacenar las salas y sus participantes
const rooms = {};
const connectedUsers = new Map();
const currentActivity = {};
const readyUsers = {};

// Función para obtener el número de participantes en una sala
function getRoomParticipants(roomId) {
    return rooms[roomId] ? rooms[roomId].size : 0;
}

// Ruta para la primera actividad colaborativa
app.get('/actividad/:roomId', (req, res) => {
    const roomId = req.params.roomId;
    if (rooms[roomId] && rooms[roomId].size <= 2) {
        res.render('actividad/actividad', { roomId: roomId });
    } else {
        res.redirect('/seleccionar-sala');
    }
});

// Nueva ruta para la segunda actividad
app.get('/actividad2/:roomId', (req, res) => {
    const roomId = req.params.roomId;
    if (rooms[roomId] && rooms[roomId].size <= 2) {
        res.render('actividad/actividad2', { roomId: roomId });
    } else {
        res.redirect('/seleccionar-sala');
    }
});

// Lógica de Socket.IO para las actividades colaborativas
io.on('connection', (socket) => {
    console.log('Un usuario se ha conectado', socket.id);
    connectedUsers.set(socket.id, { room: null, userId: socket.id });
    
    socket.on('create-room', () => {
        const roomId = Math.random().toString(36).substring(7);
        rooms[roomId] = new Set([socket.id]);
        socket.join(roomId);
        connectedUsers.get(socket.id).room = roomId;
        console.log(`Sala creada: ${roomId}, Participantes: ${getRoomParticipants(roomId)}`);
        socket.emit('room-created', roomId);
    });

    socket.on('join-room', (roomId) => {
        console.log(`Intento de unirse a la sala: ${roomId}`);
        if (rooms[roomId] && rooms[roomId].size < 2) {
            rooms[roomId].add(socket.id);
            socket.join(roomId);
            connectedUsers.get(socket.id).room = roomId;
            console.log(`Usuario ${socket.id} unido a la sala ${roomId}. Participantes: ${getRoomParticipants(roomId)}`);
            
            if (rooms[roomId].size === 1) {
                socket.emit('waiting-for-partner', roomId);
            } else if (rooms[roomId].size === 2) {
                console.log(`Actividad lista para iniciar en la sala ${roomId}`);
                io.to(roomId).emit('activity-ready', roomId);
            }
        } else {
            console.log(`Sala ${roomId} llena o no existe. Participantes actuales: ${getRoomParticipants(roomId)}`);
            socket.emit('room-full');
        }
    });

    socket.on('start-activity', (roomId) => {
        if (rooms[roomId] && rooms[roomId].size === 2) {
            console.log(`Actividad iniciada en la sala ${roomId}`);
            currentActivity[roomId] = 1; // Iniciar con la primera actividad
            io.to(roomId).emit('activity-started');
        }
    });

    socket.on('chat-message', (data) => {
        const roomId = connectedUsers.get(socket.id).room;
        if (roomId) {
            console.log(`Mensaje recibido de ${socket.id} en sala ${roomId}: ${data.message}`);
            socket.to(roomId).emit('chat-message', { userId: socket.id, message: data.message });
        }
    });

    socket.on('typing', ({ roomId }) => {
        console.log(`Usuario ${socket.id} está escribiendo en la sala ${roomId}`);
        socket.to(roomId).emit('typing');
    });

    socket.on('stop-typing', ({ roomId }) => {
        console.log(`Usuario ${socket.id} dejó de escribir en la sala ${roomId}`);
        socket.to(roomId).emit('stop-typing');
    });

    socket.on('ready-for-next-activity', (data) => {
        const roomId = data.roomId;
        const userId = socket.id;

        if (!readyUsers[roomId]) {
            readyUsers[roomId] = new Set();
        }

        readyUsers[roomId].add(userId);
        console.log(`Usuario ${userId} listo en sala ${roomId}`);

        // Aquí puedes agregar lógica para guardar la respuesta en una base de datos si es necesario

        if (readyUsers[roomId].size === rooms[roomId].size) {
            console.log(`Todos los usuarios en la sala ${roomId} están listos`);
            
            if (!currentActivity[roomId]) {
                currentActivity[roomId] = 1;
            }

            if (currentActivity[roomId] === 1) {
                currentActivity[roomId] = 2;
                const nextActivityUrl = `/actividad2/${roomId}`;
                io.to(roomId).emit('all-ready-next-activity', { nextActivityUrl });
            } else {
                io.to(roomId).emit('activities-completed');
            }

            // Limpiar el conjunto de usuarios listos para esta sala
            delete readyUsers[roomId];
        }
    });

    socket.on('update-final-answer', (data) => {
        const roomId = connectedUsers.get(socket.id).room;
        if (roomId) {
            console.log(`Actualización de respuesta final recibida de ${socket.id} en sala ${roomId}`);
            io.to(roomId).emit('final-answer-updated', { 
                content: data.content, 
                cursorPosition: data.cursorPosition,
                userId: socket.id
            });
        }
    });

    socket.on('editing-final-answer', (data) => {
        const roomId = connectedUsers.get(socket.id).room;
        if (roomId) {
            console.log(`Usuario ${socket.id} ${data.isEditing ? 'está editando' : 'dejó de editar'} la respuesta final en sala ${roomId}`);
            socket.to(roomId).emit('partner-editing-final-answer', data.isEditing);
        }
    });

    socket.on('disconnect', (reason) => {
        console.log(`Usuario desconectado: ${socket.id}, Razón: ${reason}`);
        const userInfo = connectedUsers.get(socket.id);
        if (userInfo && userInfo.room) {
            const roomId = userInfo.room;
            if (rooms[roomId]) {
                rooms[roomId].delete(socket.id);
                console.log(`Usuario removido de la sala ${roomId}. Participantes restantes: ${getRoomParticipants(roomId)}`);
                if (rooms[roomId].size > 0) {
                    socket.to(roomId).emit('partner-disconnected');
                }
            }
        }
        connectedUsers.delete(socket.id);

        // Eliminar al usuario de la lista de listos si se desconecta
        Object.keys(readyUsers).forEach(roomId => {
            if (readyUsers[roomId] && readyUsers[roomId].has(socket.id)) {
                readyUsers[roomId].delete(socket.id);
                console.log(`Usuario ${socket.id} eliminado de la lista de listos en la sala ${roomId}`);
            }
        });
    });

    socket.on('reconnect-to-room', (roomId) => {
        if (rooms[roomId] && rooms[roomId].size < 2) {
            rooms[roomId].add(socket.id);
            socket.join(roomId);
            connectedUsers.get(socket.id).room = roomId;
            console.log(`Usuario ${socket.id} reconectado a la sala ${roomId}. Participantes: ${getRoomParticipants(roomId)}`);
            io.to(roomId).emit('partner-reconnected');
        } else {
            socket.emit('room-not-available');
        }
    });

    socket.on('check-room', (roomId) => {
        const participants = getRoomParticipants(roomId);
        console.log(`Verificación de sala ${roomId}: ${participants} participantes`);
        socket.emit('room-status', { roomId, participants, exists: !!rooms[roomId] });
    });

    socket.on('heartbeat', (roomId) => {
        console.log(`Heartbeat recibido de ${socket.id} en la sala ${roomId}`);
    });
});

// Configuración adicional de Socket.IO
io.engine.on("connection_error", (err) => {
    console.log(`Connection error: ${err.message}`);
});

// Cambiar app.listen por http.listen
http.listen(3000, () => {
    console.log('Servidor ya escuchando en el 3000 http://localhost:3000');
});
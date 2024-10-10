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
const roomTimers = {};
const connectedUsers = new Set();

// Función para obtener el número de participantes en una sala
function getRoomParticipants(roomId) {
    return rooms[roomId] ? rooms[roomId].length : 0;
}

// Función para programar la eliminación de una sala
function scheduleRoomDeletion(roomId) {
    console.log(`Programando eliminación de la sala ${roomId} en 5 minutos`);
    clearTimeout(roomTimers[roomId]);
    roomTimers[roomId] = setTimeout(() => {
        if (rooms[roomId] && rooms[roomId].length === 0) {
            delete rooms[roomId];
            delete roomTimers[roomId];
            console.log(`Sala ${roomId} eliminada después de 5 minutos de inactividad`);
        }
    }, 5 * 60 * 1000);
}

// Ruta para la actividad colaborativa
app.get('/actividad/:roomId', (req, res) => {
    const roomId = req.params.roomId;
    if (rooms[roomId] && rooms[roomId].length <= 2) {
        res.render('actividad/actividad', { roomId: roomId });
    } else {
        res.redirect('/seleccionar-sala');
    }
});

// Lógica de Socket.IO para la actividad colaborativa
io.on('connection', (socket) => {
    console.log('Un usuario se ha conectado', socket.id);
    connectedUsers.add(socket.id);
    
    let currentRoom = null;

    // Manejar reconexiones
    socket.on('reconnect_attempt', () => {
        console.log(`Intento de reconexión para el usuario ${socket.id}`);
    });

    socket.on('reconnect', (attemptNumber) => {
        console.log(`Usuario ${socket.id} reconectado después de ${attemptNumber} intentos`);
    });

    socket.on('reconnect_error', (error) => {
        console.log(`Error de reconexión para el usuario ${socket.id}:`, error);
    });

    socket.on('create-room', () => {
        const roomId = Math.random().toString(36).substring(7);
        rooms[roomId] = [socket.id];
        socket.join(roomId);
        currentRoom = roomId;
        console.log(`Sala creada: ${roomId}, Participantes: ${getRoomParticipants(roomId)}`);
        socket.emit('room-created', roomId);
    });

    socket.on('join-room', (roomId) => {
        console.log(`Intento de unirse a la sala: ${roomId}`);
        if (rooms[roomId] && rooms[roomId].length < 2) {
            rooms[roomId].push(socket.id);
            socket.join(roomId);
            currentRoom = roomId;
            clearTimeout(roomTimers[roomId]);
            console.log(`Usuario ${socket.id} unido a la sala ${roomId}. Participantes: ${getRoomParticipants(roomId)}`);
            
            if (rooms[roomId].length === 1) {
                socket.emit('waiting-for-partner', roomId);
            } else if (rooms[roomId].length === 2) {
                console.log(`Actividad lista para iniciar en la sala ${roomId}`);
                io.to(roomId).emit('activity-ready', roomId);
            }
        } else {
            console.log(`Sala ${roomId} llena o no existe. Participantes actuales: ${getRoomParticipants(roomId)}`);
            socket.emit('room-full');
        }
    });

    socket.on('start-activity', (roomId) => {
        if (rooms[roomId] && rooms[roomId].length === 2) {
            console.log(`Actividad iniciada en la sala ${roomId}`);
            io.to(roomId).emit('activity-started', roomId);
        }
    });

    socket.on('update-answer', (data) => {
        if (currentRoom) {
            socket.to(currentRoom).emit('partner-update', data.answer);
        }
    });

    socket.on('disconnect', (reason) => {
        console.log(`Usuario desconectado: ${socket.id}, Razón: ${reason}`);
        connectedUsers.delete(socket.id);
        
        if (currentRoom) {
            const roomId = currentRoom;
            const index = rooms[roomId].indexOf(socket.id);
            if (index !== -1) {
                rooms[roomId].splice(index, 1);
                console.log(`Usuario removido de la sala ${roomId}. Participantes restantes: ${getRoomParticipants(roomId)}`);
                if (rooms[roomId].length === 0) {
                    scheduleRoomDeletion(roomId);
                } else {
                    io.to(roomId).emit('partner-disconnected');
                }
            }
        }
    });

    socket.on('check-room', (roomId) => {
        const participants = getRoomParticipants(roomId);
        console.log(`Verificación de sala ${roomId}: ${participants} participantes`);
        socket.emit('room-status', { roomId, participants, exists: !!rooms[roomId] });
    });

    socket.on('heartbeat', (roomId) => {
        // Manejar el heartbeat si es necesario
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
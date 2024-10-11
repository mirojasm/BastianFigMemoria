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

// Función para obtener el número de participantes en una sala
function getRoomParticipants(roomId) {
    return rooms[roomId] ? rooms[roomId].size : 0;
}

// Ruta para la actividad colaborativa
app.get('/actividad/:roomId', (req, res) => {
    const roomId = req.params.roomId;
    if (rooms[roomId] && rooms[roomId].size <= 2) {
        res.render('actividad/actividad', { roomId: roomId });
    } else {
        res.redirect('/seleccionar-sala');
    }
});

// Lógica de Socket.IO para la actividad colaborativa
io.on('connection', (socket) => {
    console.log('Un usuario se ha conectado', socket.id);
    connectedUsers.set(socket.id, { room: null });
    
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
            io.to(roomId).emit('activity-started', roomId);
        }
    });

    socket.on('update-answer', (data) => {
        const roomId = connectedUsers.get(socket.id).room;
        if (roomId) {
            socket.to(roomId).emit('partner-update', data.answer);
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
                // No eliminamos la sala aquí para permitir reconexiones
            }
        }
        connectedUsers.delete(socket.id);
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
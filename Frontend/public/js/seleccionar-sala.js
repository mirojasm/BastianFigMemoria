document.addEventListener('DOMContentLoaded', () => {

    let userInfo;
    try {
        userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const token = localStorage.getItem('token');
        if (!userInfo || !token) {
            console.log('No hay información de usuario o token');
            window.location.href = '/login';
            return;
        }
        console.log('Información del usuario recuperada:', userInfo);
        const socket = io({
            auth: {
                token: token,
                userInfo: userInfo
            },
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
        });
        const createRoomBtn = document.getElementById('create-room');
        const joinRoomBtn = document.getElementById('join-room');
        const roomIdInput = document.getElementById('room-id');
        const message = document.getElementById('message');
        
        // Evento para crear sala
        createRoomBtn.addEventListener('click', () => {
            if (!userInfo || !token) {
                message.textContent = 'Por favor, inicia sesión nuevamente';
                window.location.href = '/login';
                return;
            }

            if (socket.connected) {
                socket.emit('create-room');
            } else {
                message.textContent = 'No se puede crear sala. Reconectando...';
                socket.connect();
            }
        });
        // Evento para unirse a sala
        joinRoomBtn.addEventListener('click', () => {
            if (!userInfo || !token) {
                message.textContent = 'Por favor, inicia sesión nuevamente';
                window.location.href = '/login';
                return;
            }

            const roomId = roomIdInput.value.trim();
            if (roomId) {
                if (socket.connected) {
                    socket.emit('join-room', roomId);
                } else {
                    message.textContent = 'No se puede unir a la sala. Reconectando...';
                    socket.connect();
                }
            } else {
                message.textContent = 'Por favor, ingresa un ID de sala válido.';
            }
        });
        // Eventos del socket
        socket.on('connect', () => {
            console.log('Conectado al servidor con userInfo:', userInfo);
            message.textContent = 'Conectado al servidor';
            createRoomBtn.disabled = false;
            joinRoomBtn.disabled = false;
        });
        socket.on('disconnect', (reason) => {
            console.log('Desconectado del servidor:', reason);
            message.textContent = 'Desconectado del servidor. Intentando reconectar...';
            createRoomBtn.disabled = true;
            joinRoomBtn.disabled = true;
        });
    
        socket.on('room-created', (roomId) => {
            console.log('Room created:', roomId);
            message.textContent = `Sala creada con ID: ${roomId}. Redirigiendo a la actividad...`;
            setTimeout(() => {
                window.location.href = `/actividad/${roomId}`;
            }, 2000);
        });
    
        socket.on('waiting-for-partner', (roomId) => {
            message.textContent = `Te has unido a la sala ${roomId}. Redirigiendo a la actividad...`;
            setTimeout(() => {
                window.location.href = `/actividad/${roomId}`;
            }, 2000);
        });
    
        socket.on('activity-ready', (roomId) => {
            message.textContent = `¡Compañero encontrado! Redirigiendo a la actividad...`;
            setTimeout(() => {
                window.location.href = `/actividad/${roomId}`;
            }, 2000);
        });
    
        socket.on('room-full', () => {
            message.textContent = 'La sala está llena. Por favor, intenta con otra sala.';
        });
    
        socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            message.textContent = 'Error de conexión. Intentando reconectar...';
        });
    } catch (error) {
        console.error('Error al procesar la información del usuario:', error);
        window.location.href = '/login';
    }
    // cambio gasta la 2.51

    // Verificar si tenemos la información necesaria
    // esto es con cluade el if


    
});


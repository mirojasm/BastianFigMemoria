document.addEventListener('DOMContentLoaded', () => {
    const socket = io({
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

    createRoomBtn.addEventListener('click', () => {
        if (socket.connected) {
            socket.emit('create-room');
        } else {
            message.textContent = 'No se puede crear sala. Reconectando...';
            socket.connect();
        }
    });

    joinRoomBtn.addEventListener('click', () => {
        const roomId = roomIdInput.value.trim();
        if (roomId) {
            if (socket.connected) {
                socket.emit('check-room', roomId);
            } else {
                message.textContent = 'No se puede unir a la sala. Reconectando...';
                socket.connect();
            }
        } else {
            message.textContent = 'Por favor, ingresa un ID de sala válido.';
        }
    });

    socket.on('connect', () => {
        console.log('Conectado al servidor');
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

    socket.on('reconnect_attempt', (attemptNumber) => {
        console.log('Intento de reconexión #', attemptNumber);
        message.textContent = `Intentando reconectar (intento ${attemptNumber})...`;
    });

    socket.on('reconnect', (attemptNumber) => {
        console.log('Reconectado al servidor después de', attemptNumber, 'intentos');
        message.textContent = 'Reconectado al servidor';
        createRoomBtn.disabled = false;
        joinRoomBtn.disabled = false;
    });

    socket.on('reconnect_error', (error) => {
        console.log('Error de reconexión:', error);
        message.textContent = 'Error al intentar reconectar. Intentando de nuevo...';
    });

    socket.on('reconnect_failed', () => {
        console.log('Falló la reconexión');
        message.textContent = 'No se pudo reconectar al servidor. Por favor, recarga la página.';
    });

    socket.on('room-created', (roomId) => {
        console.log('Room created:', roomId);
        message.textContent = `Sala creada con ID: ${roomId}. Esperando a otro participante...`;
    });

    socket.on('room-status', (data) => {
        if (data.exists) {
            if (data.participants < 2) {
                socket.emit('join-room', data.roomId);
            } else {
                message.textContent = 'La sala está llena. Por favor, intenta con otra sala.';
            }
        } else {
            message.textContent = 'La sala no existe o ha expirado. Por favor, crea una nueva sala.';
        }
    });

    socket.on('waiting-for-partner', (roomId) => {
        message.textContent = `Te has unido a la sala ${roomId}. Esperando a otro participante...`;
    });

    socket.on('activity-ready', (roomId) => {
        message.textContent = `¡Compañero encontrado! La actividad comenzará en breve...`;
        setTimeout(() => {
            socket.emit('start-activity', roomId);
        }, 3000); // Espera 3 segundos antes de iniciar la actividad
    });

    socket.on('activity-started', (roomId) => {
        console.log('Activity started in room:', roomId);
        message.textContent = `¡La actividad ha comenzado!`;
        setTimeout(() => {
            window.location.href = `/actividad/${roomId}`;
        }, 2000);
    });

    socket.on('room-full', () => {
        message.textContent = 'La sala está llena. Por favor, intenta con otra sala.';
    });

    socket.on('partner-disconnected', () => {
        message.textContent = 'Tu compañero se ha desconectado. Volviendo a la selección de sala...';
        setTimeout(() => {
            window.location.href = '/seleccionar-sala';
        }, 3000);
    });

    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        message.textContent = 'Error de conexión. Intentando reconectar...';
    });
});


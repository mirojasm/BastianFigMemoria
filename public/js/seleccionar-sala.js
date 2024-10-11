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
                socket.emit('join-room', roomId);
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
});


document.addEventListener('DOMContentLoaded', () => {
    const roomOptions = document.querySelector('.room-options');
    const message = document.getElementById('message');
    
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
        console.log('ID del usuario actual:', userInfo.id); // Para debugging

        if (roomOptions) {
            roomOptions.innerHTML = '';
            
            // Usando los mismos rangos que en los event listeners
            if (userInfo.id >= 1 && userInfo.id <= 3) {
                roomOptions.innerHTML = `
                    <button id="create-room">Crear Nueva Sala</button>
                `;
            } else if (userInfo.id > 3 && userInfo.id <= 6) {
                roomOptions.innerHTML = `
                    <div class="join-room">
                        <input type="text" id="room-id" placeholder="Ingresa el ID de la sala">
                        <button id="join-room">Unirse a Sala</button>
                    </div>
                `;
            } else {
                roomOptions.innerHTML = `
                    <p>No tienes permisos para acceder a las salas.</p>
                `;
                return;
            }
        }

        const createRoomBtn = document.getElementById('create-room');
        const joinRoomBtn = document.getElementById('join-room');
        const roomIdInput = document.getElementById('room-id');

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

        // Las mismas condiciones que arriba
        if (userInfo.id >= 1 && userInfo.id <= 3 && createRoomBtn) {
            createRoomBtn.addEventListener('click', () => {
                if (socket.connected) {
                    socket.emit('create-room');
                } else {
                    message.textContent = 'No se puede crear sala. Reconectando...';
                    socket.connect();
                }
            });
        }

        if (userInfo.id > 3 && userInfo.id <= 6 && joinRoomBtn && roomIdInput) {
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
        }

        // El resto de los eventos del socket permanecen igual
        socket.on('connect', () => {
            console.log('Conectado al servidor con userInfo:', userInfo);
            message.textContent = 'Conectado al servidor';
        });

        socket.on('disconnect', (reason) => {
            console.log('Desconectado del servidor:', reason);
            message.textContent = 'Desconectado del servidor. Intentando reconectar...';
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
});

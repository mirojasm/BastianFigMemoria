const socket = io();

const roomId = document.getElementById('room-id').textContent;
const waitingMessage = document.getElementById('waiting-message');
const activityContent = document.getElementById('activity-content');
const playerAnswer = document.getElementById('player-answer');
const partnerAnswer = document.getElementById('partner-answer');
const finalAnswer = document.getElementById('final-answer');
const submitButton = document.getElementById('submit-answer');
const activityImage = document.getElementById('activity-image');

socket.on('connect', () => {
    console.log('Conectado al servidor');
    socket.emit('join-room', roomId);
});

socket.on('disconnect', (reason) => {
    console.log('Desconectado del servidor:', reason);
    waitingMessage.textContent = 'Desconectado del servidor. Intentando reconectar...';
    waitingMessage.style.display = 'block';
    activityContent.style.display = 'none';
});

socket.on('reconnect', () => {
    console.log('Reconectado al servidor');
    socket.emit('reconnect-to-room', roomId);
});

socket.on('waiting-for-partner', () => {
    waitingMessage.textContent = 'Esperando a tu compañero...';
    waitingMessage.style.display = 'block';
    activityContent.style.display = 'none';
});

socket.on('activity-ready', () => {
    waitingMessage.textContent = '¡Compañero encontrado! La actividad comenzará en breve...';
    setTimeout(() => {
        socket.emit('start-activity', roomId);
    }, 3000);
});

socket.on('activity-started', () => {
    waitingMessage.style.display = 'none';
    activityContent.style.display = 'block';
    
    // Determinar qué parte de la imagen mostrar
    const isPlayer1 = Math.random() < 0.5;
    activityImage.style.clipPath = isPlayer1 ? 'inset(0 50% 0 0)' : 'inset(0 0 0 50%)';
});

playerAnswer.addEventListener('input', () => {
    socket.emit('update-answer', { roomId, answer: playerAnswer.value });
});

socket.on('partner-update', (answer) => {
    partnerAnswer.value = answer;
});

submitButton.addEventListener('click', () => {
    console.log('Respuesta final:', finalAnswer.value);
    socket.emit('submit-final-answer', { roomId, answer: finalAnswer.value });
    alert('Respuesta enviada con éxito!');
});

socket.on('partner-disconnected', () => {
    waitingMessage.textContent = 'Tu compañero se ha desconectado. Esperando reconexión...';
    waitingMessage.style.display = 'block';
    activityContent.style.display = 'none';
});

socket.on('partner-reconnected', () => {
    waitingMessage.style.display = 'none';
    activityContent.style.display = 'block';
});

socket.on('room-not-available', () => {
    alert('La sala ya no está disponible. Por favor, vuelve a la selección de sala.');
    window.location.href = '/seleccionar-sala';
});

// Mantener la conexión activa
setInterval(() => {
    if (socket.connected) {
        socket.emit('heartbeat', roomId);
    }
}, 30000);

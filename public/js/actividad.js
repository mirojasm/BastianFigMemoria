const socket = io();

const roomId = document.getElementById('room-id').textContent;
const waitingMessage = document.getElementById('waiting-message');
const activityContent = document.getElementById('activity-content');
const playerAnswer = document.getElementById('player-answer');
const partnerAnswer = document.getElementById('partner-answer');
const finalAnswer = document.getElementById('final-answer');
const submitButton = document.getElementById('submit-answer');
const activityImage = document.getElementById('activity-image');

// Unirse a la sala al cargar la página
socket.emit('join-room', roomId);

socket.on('waiting-for-partner', () => {
    waitingMessage.textContent = 'Esperando a tu compañero...';
    waitingMessage.style.display = 'block';
    activityContent.style.display = 'none';
});

socket.on('activity-ready', () => {
    waitingMessage.textContent = '¡Compañero encontrado! La actividad comenzará en breve...';
    setTimeout(() => {
        socket.emit('start-activity', roomId);
    }, 3000); // Espera 3 segundos antes de iniciar la actividad
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
    alert('Tu compañero se ha desconectado. Por favor, vuelve a la selección de sala.');
    window.location.href = '/seleccionar-sala';
});

socket.on('connect_error', (error) => {
    console.error('Error de conexión:', error);
    alert('Error de conexión. Por favor, recarga la página.');
});

// Mantener la conexión activa
setInterval(() => {
    socket.emit('heartbeat', roomId);
}, 30000);

// Manejar reconexiones
socket.on('reconnect', (attemptNumber) => {
    console.log('Reconectado al servidor después de', attemptNumber, 'intentos');
    socket.emit('join-room', roomId); // Volver a unirse a la sala después de reconectar
});

socket.on('reconnecting', (attemptNumber) => {
    console.log('Intentando reconectar...', attemptNumber);
});

socket.on('reconnect_error', (error) => {
    console.error('Error de reconexión:', error);
});

socket.on('reconnect_failed', () => {
    console.error('Falló la reconexión');
    alert('No se pudo reconectar al servidor. Por favor, recarga la página.');
});

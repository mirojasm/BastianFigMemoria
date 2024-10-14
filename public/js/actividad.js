const socket = io();

const roomId = document.getElementById('room-id').textContent;
const waitingMessage = document.getElementById('waiting-message');
const activityContent = document.getElementById('activity-content');
const activityImage = document.getElementById('activity-image');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendMessageButton = document.getElementById('send-message');
const finalAnswer = document.getElementById('final-answer');
const submitButton = document.getElementById('submit-answer');

let myUserId;

socket.on('connect', () => {
    console.log('Conectado al servidor');
    myUserId = socket.id;
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

function addMessageToChat(userId, message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message');
    
    const authorElement = document.createElement('div');
    authorElement.classList.add('message-author');
    
    if (userId === myUserId) {
        messageElement.classList.add('own-message');
        authorElement.textContent = 'Tú';
    } else {
        messageElement.classList.add('partner-message');
        authorElement.textContent = 'Compañero';
    }
    
    const contentElement = document.createElement('div');
    contentElement.textContent = message;
    
    messageElement.appendChild(authorElement);
    messageElement.appendChild(contentElement);
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

sendMessageButton.addEventListener('click', () => {
    const message = chatInput.value.trim();
    if (message) {
        socket.emit('chat-message', { roomId, message });
        addMessageToChat(myUserId, message);
        chatInput.value = '';
    }
});

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessageButton.click();
    }
});

socket.on('chat-message', (data) => {
    addMessageToChat(data.userId, data.message);
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

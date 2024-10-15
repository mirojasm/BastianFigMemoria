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
const collaborativeEditingIndicator = document.getElementById('collaborative-editing-indicator');

let myUserId;
let typingTimer;
const typingTimeout = 1000; // 1 segundo

// Crear el elemento para mostrar "escribiendo..."
const typingIndicator = document.createElement('div');
typingIndicator.className = 'typing-indicator';
typingIndicator.textContent = 'El compañero está escribiendo...';
typingIndicator.style.display = 'none';
chatMessages.after(typingIndicator);

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
    scrollChatToBottom();
}

function scrollChatToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendMessage() {
    const message = chatInput.value.trim();
    if (message) {
        socket.emit('chat-message', { roomId, message });
        addMessageToChat(myUserId, message);
        chatInput.value = '';
        chatInput.focus();
        socket.emit('stop-typing', { roomId });
    }
}

sendMessageButton.addEventListener('click', sendMessage);

chatInput.addEventListener('input', () => {
    socket.emit('typing', { roomId });
    
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        socket.emit('stop-typing', { roomId });
    }, typingTimeout);
});

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

socket.on('chat-message', (data) => {
    addMessageToChat(data.userId, data.message);
});

socket.on('typing', () => {
    typingIndicator.style.display = 'block';
});

socket.on('stop-typing', () => {
    typingIndicator.style.display = 'none';
});

submitButton.addEventListener('click', () => {
    const answer = finalAnswer.value.trim();
    if (answer) {
        console.log('Respuesta final:', answer);
        socket.emit('submit-final-answer', { roomId, answer });
        alert('Respuesta enviada con éxito!');
        finalAnswer.value = '';
    } else {
        alert('Por favor, escribe una respuesta antes de enviar.');
    }
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

// Ajustar el scroll del chat cuando se redimensiona la ventana
window.addEventListener('resize', scrollChatToBottom);

// Nuevo código para edición colaborativa
let isEditingFinalAnswer = false;

finalAnswer.addEventListener('input', () => {
    const content = finalAnswer.value;
    const cursorPosition = finalAnswer.selectionStart;
    socket.emit('update-final-answer', { roomId, content, cursorPosition });
});

finalAnswer.addEventListener('focus', () => {
    isEditingFinalAnswer = true;
    socket.emit('editing-final-answer', { roomId, isEditing: true });
});

finalAnswer.addEventListener('blur', () => {
    isEditingFinalAnswer = false;
    socket.emit('editing-final-answer', { roomId, isEditing: false });
});

socket.on('final-answer-updated', ({ content, cursorPosition, userId }) => {
    if (userId !== myUserId) {
        const currentCursorPosition = finalAnswer.selectionStart;
        finalAnswer.value = content;
        if (!isEditingFinalAnswer) {
            finalAnswer.setSelectionRange(cursorPosition, cursorPosition);
        } else {
            finalAnswer.setSelectionRange(currentCursorPosition, currentCursorPosition);
        }
    }
});

socket.on('partner-editing-final-answer', (isEditing) => {
    if (isEditing) {
        finalAnswer.style.border = '2px solid #ff9800';
        collaborativeEditingIndicator.style.display = 'block';
    } else {
        finalAnswer.style.border = '1px solid #3f87a6';
        collaborativeEditingIndicator.style.display = 'none';
    }
});

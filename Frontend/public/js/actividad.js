const userInfo = JSON.parse(localStorage.getItem('userInfo'));
const token = localStorage.getItem('token');
const socket = io({
    auth: {
        token: token,
        userInfo
    }
});

const roomId = document.getElementById('room-id').textContent;
const waitingOverlay = document.getElementById('waiting-overlay');
const waitingMessage = document.querySelector('.waiting-message');
const activityContent = document.getElementById('activity-content');
const activityImage1 = document.getElementById('activity-image-1');
const activityImage2 = document.getElementById('activity-image-2');
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
    showWaitingMessage('Desconectado del servidor. Intentando reconectar...');
});

socket.on('reconnect', () => {
    console.log('Reconectado al servidor');
    socket.emit('reconnect-to-room', roomId);
});

socket.on('waiting-for-partner', () => {
    showWaitingMessage('Esperando a tu compañero...');
});

socket.on('activity-ready', () => {
    showWaitingMessage('¡Compañero encontrado! La actividad comenzará en breve...');
    setTimeout(() => {
        socket.emit('start-activity', roomId);
    }, 3000);
});

socket.on('activity-started', (data) => {
    hideWaitingMessage();
    activityContent.style.display = 'block';
    
    // Mostrar la imagen correspondiente según la asignación del servidor
    if (data.imageNumber === 1) {
        activityImage1.style.display = 'block';
        activityImage2.style.display = 'none';
    } else {
        activityImage1.style.display = 'none';
        activityImage2.style.display = 'block';
    }
    // Mostrar el contenido de la actividad
    document.querySelector('.activity-info').style.display = 'block';
    document.querySelector('.final-answer-container').style.display = 'block';
    document.querySelector('.chat-sidebar').style.display = 'block';
});

function showWaitingMessage(message) {
    waitingMessage.textContent = message;
    waitingOverlay.style.display = 'flex';
    if (activityContent) {
        activityContent.style.opacity = '0.5';
    }
}

function hideWaitingMessage() {
    waitingOverlay.style.display = 'none';
    if (activityContent) {
        activityContent.style.display = 'flex';
        activityContent.style.opacity = '1';
    }
}

// Modificar la función addMessageToChat para mostrar los nombres
function addMessageToChat(data) {
    // Verificar si el mensaje es duplicado considerando el contenido Y el autor
    const existingMessages = chatMessages.querySelectorAll('.chat-message');
    const isDuplicate = Array.from(existingMessages).some(msg => {
        const content = msg.querySelector('.message-content').textContent;
        const author = msg.querySelector('.message-author').textContent;
        const currentAuthor = data.userId === socket.id ? 'Tú' : (data.userName || 'Compañero');
        
        return content === data.message && author === currentAuthor;
    });

    if (isDuplicate) {
        console.log('Mensaje duplicado detectado, ignorando...');
        return;
    }

    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message');
    
    const authorElement = document.createElement('div');
    authorElement.classList.add('message-author');
    
    if (data.userId === socket.id) {
        messageElement.classList.add('own-message');
        authorElement.textContent = 'Tú';
    } else {
        messageElement.classList.add('partner-message');
        authorElement.textContent = data.userName || 'Compañero';
    }
    
    const contentElement = document.createElement('div');
    contentElement.classList.add('message-content');
    contentElement.textContent = data.message;
    // Agregar timestamp al mensaje
    const timestampElement = document.createElement('div');
    timestampElement.classList.add('message-timestamp');
    const messageTime = new Date().toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    timestampElement.textContent = messageTime;
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
        socket.emit('chat-message', { roomId, message, timestamp: new Date().toISOString() });
        
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
// Remover cualquier listener existente para evitar duplicados
socket.off('chat-message');

socket.on('chat-message', (data) => {
    console.log('Mensaje recibido:', data); // Para debug
    addMessageToChat(data);
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
        socket.emit('ready-for-next-activity', { roomId, answer });
        submitButton.disabled = true;
        showWaitingMessage('Esperando a que tu compañero esté listo...');
    } else {
        alert('Por favor, escribe una respuesta antes de enviar.');
    }
});

socket.on('all-ready-next-activity', (data) => {
    console.log('Todos listos para la siguiente actividad');
    showWaitingMessage('Tu compañero está listo. Preparando la siguiente actividad...');
    setTimeout(() => {
        console.log('Redirigiendo a:', data.loadingUrl);
        window.location.href = data.loadingUrl;
    }, 1000);
});

socket.on('partner-disconnected', () => {
    showWaitingMessage('Tu compañero se ha desconectado. Esperando reconexión...');
});

socket.on('partner-reconnected', () => {
    hideWaitingMessage();
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

// Código para edición colaborativa
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

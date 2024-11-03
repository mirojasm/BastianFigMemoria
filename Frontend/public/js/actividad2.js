const userInfo = JSON.parse(localStorage.getItem("userInfo"));
const token = localStorage.getItem("token");
const socket = io({
	auth: {
		token: token,
		userInfo,
	},
});

const roomId = document.getElementById("room-id").textContent;
const activityContent = document.getElementById("activity-content");
const activityText = document.getElementById("activity-text");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const sendMessageButton = document.getElementById("send-message");
const finalAnswer = document.getElementById("final-answer");
const submitButton = document.getElementById("submit-answer");
const collaborativeEditingIndicator = document.getElementById(
	"collaborative-editing-indicator"
);
const waitingMessage = document.getElementById("waiting-message");

let myUserId;
let typingTimer;
const typingTimeout = 1000;

// Configuración del indicador de escritura
const typingIndicator = document.createElement("div");
typingIndicator.className = "typing-indicator";
typingIndicator.textContent = "El compañero está escribiendo...";
typingIndicator.style.display = "none";
chatMessages.after(typingIndicator);

// Inicialización
if (waitingMessage) {
	waitingMessage.style.display = "none";
}
activityContent.style.display = "block";

// Gestión de conexión
socket.on("connect", () => {
    console.log("Conectado al servidor en actividad 2");
    myUserId = socket.id;
    
    // Intentar reconectar a la actividad 2
    socket.emit("reconnect-to-activity2", {
        roomId,
        token,
        userInfo
    });
});

socket.on("activity2-user-connected", (data) => {
	console.log(`Usuario ${data.userName} conectado a la actividad 2`);
	hideWaitingMessage();
	initializeActivity2();
});
socket.on("activity2-ready", (data) => {
    console.log("Actividad 2 lista para comenzar");
    hideWaitingMessage();
    initializeActivity2();
});
socket.on("disconnect", (reason) => {
	console.log("Desconectado del servidor:", reason);
	showWaitingMessage("Desconectado del servidor. Intentando reconectar...");
});

socket.on("reconnect", () => {
	console.log("Reconectado al servidor");
	socket.emit("reconnect-to-activity2", roomId);
});

// Funciones de UI
function showWaitingMessage(message) {
	if (waitingMessage) {
		waitingMessage.textContent = message;
		waitingMessage.style.display = "block";
		activityContent.style.opacity = "0.5";
	}
}

// Función mejorada para mostrar mensajes
function showMessage(message) {
    const messageElement = document.createElement("div");
    messageElement.className = "status-message";
    messageElement.textContent = message;
    document.querySelector(".activity-info").appendChild(messageElement);
    
    // Remover el mensaje después de 5 segundos
    setTimeout(() => {
        messageElement.remove();
    }, 5000);
}

function hideWaitingMessage() {
	if (waitingMessage) {
		waitingMessage.style.display = "none";
		activityContent.style.display = "block";
		activityContent.style.opacity = "1";
	}
}

function initializeActivity2() {
	activityContent.style.display = "block";
	// Aquí puedes agregar la lógica específica de inicialización de la actividad 2
	// Por ejemplo, cargar el texto de la actividad
	activityText.textContent = "Texto de la actividad 2..."; // Personaliza según necesites
}

// Gestión del chat
function addMessageToChat(data) {
	const messageElement = document.createElement("div");
	messageElement.classList.add("chat-message");

	const authorElement = document.createElement("div");
	authorElement.classList.add("message-author");

	if (data.userId === socket.id) {
		messageElement.classList.add("own-message");
		authorElement.textContent = "Tú";
	} else {
		messageElement.classList.add("partner-message");
		authorElement.textContent = data.userName || "Compañero";
	}

	const contentElement = document.createElement("div");
	contentElement.classList.add("message-content");
	contentElement.textContent = data.message;

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
		socket.emit("chat-message", {
			roomId,
			message,
			timestamp: new Date().toISOString(),
		});

		chatInput.value = "";
		chatInput.focus();
		socket.emit("stop-typing", { roomId });
	}
}

// Event Listeners
sendMessageButton.addEventListener("click", sendMessage);

chatInput.addEventListener("input", () => {
	socket.emit("typing", { roomId });
	clearTimeout(typingTimer);
	typingTimer = setTimeout(() => {
		socket.emit("stop-typing", { roomId });
	}, typingTimeout);
});

chatInput.addEventListener("keypress", (e) => {
	if (e.key === "Enter" && !e.shiftKey) {
		e.preventDefault();
		sendMessage();
	}
});

// Socket event handlers para el chat
socket.on("chat-message", (data) => {
	console.log("Mensaje recibido:", data);
	addMessageToChat(data);
});

socket.on("typing", () => {
	typingIndicator.style.display = "block";
});

socket.on("stop-typing", () => {
	typingIndicator.style.display = "none";
});

// Gestión de respuesta final
submitButton.addEventListener("click", () => {
    const answer = finalAnswer.value.trim();
    if (answer) {
        socket.emit("activity2-complete", { roomId, answer });
        submitButton.disabled = true;
        showWaitingMessage("Guardando respuesta...");
    } else {
        alert("Por favor, escribe una respuesta antes de enviar.");
    }
});

socket.on("redirect-to-completion", () => {
    showWaitingMessage("¡Actividades completadas! Redirigiendo...");
    // Usar una redirección del lado del servidor
    setTimeout(() => {
        // Primero destruir la conexión del socket
        socket.disconnect();
        // Luego redirigir
        window.location.replace("/completion");
    }, 2000);
});

// Gestión de conexión de compañeros
socket.on("partner-disconnected", () => {
	showWaitingMessage(
		"Tu compañero se ha desconectado. Esperando reconexión..."
	);
});

socket.on("partner-reconnected", () => {
	hideWaitingMessage();
});

socket.on("room-not-available", () => {
	alert("La sala ya no está disponible. Volviendo a la selección de sala.");
	window.location.href = "/seleccionar-sala";
});

// Edición colaborativa
let isEditingFinalAnswer = false;

finalAnswer.addEventListener("input", () => {
	const content = finalAnswer.value;
	const cursorPosition = finalAnswer.selectionStart;
	socket.emit("update-final-answer", { roomId, content, cursorPosition });
});

finalAnswer.addEventListener("focus", () => {
	isEditingFinalAnswer = true;
	socket.emit("editing-final-answer", { roomId, isEditing: true });
});

finalAnswer.addEventListener("blur", () => {
	isEditingFinalAnswer = false;
	socket.emit("editing-final-answer", { roomId, isEditing: false });
});

socket.on("final-answer-updated", ({ content, cursorPosition, userId }) => {
	if (userId !== socket.id) {
		const currentCursorPosition = finalAnswer.selectionStart;
		finalAnswer.value = content;
		if (!isEditingFinalAnswer) {
			finalAnswer.setSelectionRange(cursorPosition, cursorPosition);
		} else {
			finalAnswer.setSelectionRange(
				currentCursorPosition,
				currentCursorPosition
			);
		}
	}
});

socket.on("partner-editing-final-answer", (isEditing) => {
	if (isEditing && !isEditingFinalAnswer) {
		collaborativeEditingIndicator.style.display = "block";
		finalAnswer.style.border = "2px solid #ff9800";
	} else {
		collaborativeEditingIndicator.style.display = "none";
		finalAnswer.style.border = "1px solid #3f87a6";
	}
});

// Mantener conexión activa
setInterval(() => {
	if (socket.connected) {
		socket.emit("heartbeat", roomId);
	}
}, 30000);

// Ajustar scroll del chat al redimensionar
window.addEventListener("resize", scrollChatToBottom);

const userInfo = JSON.parse(localStorage.getItem("userInfo"));
const token = localStorage.getItem("token");
const socket = io({
	auth: {
		token: token,
		userInfo,
	},
});
let startTime; // Para guardar cuando el usuario comienza a responder
let endTime; // Para guardar cuando el usuario termite de responder
const roomId = document.getElementById("room-id").textContent;
const waitingOverlay = document.getElementById("waiting-overlay");
const waitingMessage = document.querySelector(".waiting-message");
const activityContent = document.getElementById("activity-content");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const sendMessageButton = document.getElementById("send-message");
const finalAnswer = document.getElementById("final-answer");
const submitButton = document.getElementById("submit-answer");
const collaborativeEditingIndicator = document.getElementById(
	"collaborative-editing-indicator"
);
// aca modificare lo nuevo pipipi
const individualAnswer = document.getElementById("individual-answer");
const combinedPreview = document.getElementById("combined-preview");
let studentContents = {
    student1: "",
    student2: ""
};
let lastEmittedContent = ""; // Para evitar emisiones duplicadas
let syncTimeout = null;
let myStudentNumber = null;
let myUserId;
let typingTimer;
const typingTimeout = 1000; // 1 segundo
let hasSubmitted = false;
// Crear el elemento para mostrar "escribiendo..."
const typingIndicator = document.createElement("div");
typingIndicator.className = "typing-indicator";
typingIndicator.textContent = "El compañero está escribiendo...";
typingIndicator.style.display = "none";
chatMessages.after(typingIndicator);

socket.on("connect", () => {
	console.log("Conectado al servidor");
	myUserId = socket.id;
	socket.emit("join-room", roomId);
});

socket.on("disconnect", (reason) => {
	console.log("Desconectado del servidor:", reason);
	showWaitingMessage("Desconectado del servidor. Intentando reconectar...");
});

socket.on("reconnect", () => {
    console.log("Reconectado al servidor");
    socket.emit("reconnect-to-room", roomId);
    
    // Si el usuario estaba respondiendo, mantener el tiempo de inicio
    if (startTime && !endTime) {
        socket.emit("sync-response-time", {
            roomId,
            startTime: startTime.toISOString()
        });
    }
});

// Evento para número de usuario
/* socket.on("user-number", (number) => {
    console.log("Recibido número de usuario:", number);
    myStudentNumber = number;
    
    // Mostrar texto correspondiente
    if (number === 1) {
        document.getElementById("text-part-1").style.display = "block";
        document.getElementById("text-part-2").style.display = "none";
    } else {
        document.getElementById("text-part-1").style.display = "none";
        document.getElementById("text-part-2").style.display = "block";
    }
}); */
socket.on("user-number", (number) => {
    console.log("Recibido número de usuario:", number);
    myStudentNumber = number;
    
    // Mostrar texto correspondiente
    if (number === 1) {
        document.getElementById("text-part-1").style.display = "block";
        document.getElementById("text-part-2").style.display = "none";
        // Mostrar el botón solo al usuario 1
        document.getElementById("submit-button-container").style.display = "block";
    } else {
        document.getElementById("text-part-1").style.display = "none";
        document.getElementById("text-part-2").style.display = "block";
        // Ocultar el botón para el usuario 2
        document.getElementById("submit-button-container").style.display = "none";
        
        // Agregar mensaje informativo para el usuario 2
        const infoMessage = document.createElement('div');
        infoMessage.className = 'info-message';
        infoMessage.textContent = 'Tu compañero será quien envíe la respuesta final';
        document.querySelector('.combined-answer').appendChild(infoMessage);
    }
});
// Agregar nuevo evento para sincronizar el tiempo en caso de reconexión
socket.on("sync-time-data", (timeData) => {
    if (timeData.startTime) {
        startTime = new Date(timeData.startTime);
    }
});


socket.on("waiting-for-partner", () => {
	showWaitingMessage("Esperando a tu compañero...");
});

socket.on("activity-ready", () => {
	console.log("Actividad lista para comenzar");
	showWaitingMessage(
		"¡Compañero encontrado! La actividad comenzará en breve..."
	);
	setTimeout(() => {
		hideWaitingMessage();
		initializeActivity();
	}, 3000);
});
function initializeActivity() {
    console.log("Inicializando actividad");
    // Mostrar el contenido de la actividad
    activityContent.style.display = "flex";
    document.querySelector(".activity-info").style.display = "block";
    document.querySelector(".text-container").style.display = "block";

    // Determinar qué parte del texto mostrar basado en el orden de conexión
    socket.emit("get-user-number", roomId);
}

socket.on("user-number", (number) => {
    console.log("Recibido número de usuario:", number);
    if (number === 1) {
        document.getElementById("text-part-1").style.display = "block";
        document.getElementById("text-part-2").style.display = "none";
    } else {
        document.getElementById("text-part-1").style.display = "none";
        document.getElementById("text-part-2").style.display = "block";
    }
});

// Manejar cambios en respuesta individual
/* individualAnswer.addEventListener("input", () => {
    const content = individualAnswer.value;
    const studentKey = myStudentNumber === 1 ? 'student1' : 'student2';
    
    // Actualizar contenido local
    studentContents[studentKey] = content;
    
    // Emitir al otro estudiante
    socket.emit("individual-answer-update", {
        roomId,
        content,
        studentNumber: myStudentNumber
    });
    
    // Actualizar respuesta conjunta
    updateFinalAnswer();
}); */
// Función mejorada para actualizar el contador
function updateWordCounter(content, studentKey) {
    const wordCount = content.trim().length;
    const countDisplay = document.getElementById(`word-count-${studentKey}`);
    
    if (countDisplay) {
        countDisplay.textContent = `Caracteres: ${wordCount}/200`;
        countDisplay.style.color = wordCount >= 10 && wordCount <= 200 ? '#00aa00' : '#ff0000';
    }
    
    return wordCount;
}
individualAnswer.addEventListener("input", (e) => {
    const content = e.target.value;
    const studentKey = myStudentNumber === 1 ? 'student1' : 'student2';
    
    // Limitar a 100 caracteres
    if (content.length > 200) {
        e.target.value = content.slice(0, 200);
        return;
    }
    
    // Actualizar contenido local
    studentContents[studentKey] = e.target.value;
    
    // Actualizar contador local inmediatamente
    updateWordCounter(content, studentKey);
    
    // Throttle las emisiones del socket para evitar sobrecarga
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        if (content !== lastEmittedContent) {
            lastEmittedContent = content;
            socket.emit("individual-answer-update", {
                roomId,
                content: content,
                studentNumber: myStudentNumber
            });
        }
    }, 300); // Delay de 300ms para throttling
    
    // Actualizar vista previa
    updateFinalAnswer();
});

// Escuchar actualizaciones del compañero
socket.on("individual-answer-updated", (data) => {
    const studentKey = data.studentNumber === 1 ? 'student1' : 'student2';
    const content = data.content;
    
    // Actualizar solo si el contenido es diferente
    if (studentContents[studentKey] !== content) {
        studentContents[studentKey] = content;
        
        // Si soy el otro estudiante, actualizar el contador
        if (myStudentNumber !== data.studentNumber) {
            updateWordCounter(content, studentKey);
            updateFinalAnswer();
        }
    }
});
function updateFinalAnswer() {
    const student1Content = studentContents.student1.trim();
    const student2Content = studentContents.student2.trim();
    
    const student1Valid = student1Content.length >= 10 && student1Content.length <= 200;
    const student2Valid = student2Content.length >= 10 && student2Content.length <= 200;
    
    // Actualizar contadores para ambos estudiantes
    updateWordCounter(student1Content, 'student1');
    updateWordCounter(student2Content, 'student2');
    
    if (student1Valid && student2Valid) {
        finalAnswer.value = `${student1Content}\n\n${student2Content}`;
        submitButton.disabled = false;
    } else {
        finalAnswer.value = student1Content.length === 0 && student2Content.length === 0 ? 
            "Esperando respuestas..." : 
            "Ambos estudiantes deben escribir entre 10 y 200 caracteres, para que se muestren en la casilla";
        submitButton.disabled = true;
    }
}
function updateCombinedPreview() {
    // Actualizar secciones de vista previa
    document.querySelector("#student1-content .content").textContent = studentContents.student1;
    document.querySelector("#student2-content .content").textContent = studentContents.student2;
    
    // Combinar respuestas para vista previa final
    finalAnswer.value = `${studentContents.student1}\n\n${studentContents.student2}`.trim();
}

socket.on("activity-started", (data) => {
    hideWaitingMessage();
    activityContent.style.display = "block";

    // Mostrar el texto correspondiente según la asignación del servidor
    if (data.textNumber === 1) {
        document.getElementById("text-part-1").style.display = "block";
        document.getElementById("text-part-2").style.display = "none";
    } else {
        document.getElementById("text-part-1").style.display = "none";
        document.getElementById("text-part-2").style.display = "block";
    }
    
    // Mostrar el contenido de la actividad
    document.querySelector(".activity-info").style.display = "block";
    document.querySelector(".final-answer-container").style.display = "block";
    document.querySelector(".chat-sidebar").style.display = "block";
});


function showWaitingMessage(message) {
	waitingMessage.textContent = message;
	waitingOverlay.style.display = "flex";
	if (activityContent) {
		activityContent.style.opacity = "0.5";
	}
}

function hideWaitingMessage() {
	waitingOverlay.style.display = "none";
	if (activityContent) {
		activityContent.style.display = "flex";
		activityContent.style.opacity = "1";
	}
}


// En actividad.js - Modificar addMessageToChat
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

    // Agregar el ID real del usuario como atributo de datos
    messageElement.dataset.realUserId = data.realUserId;
    messageElement.dataset.timestamp = new Date().getTime();
    messageElement.dataset.author = data.userId;

    const contentElement = document.createElement("div");
    contentElement.classList.add("message-content");
    contentElement.textContent = data.message;

    const timestampElement = document.createElement("div");
    timestampElement.classList.add("message-timestamp");
    const messageTime = new Date().toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
    });
    timestampElement.textContent = messageTime;

    messageElement.appendChild(authorElement);
    messageElement.appendChild(contentElement);
    messageElement.appendChild(timestampElement);

    chatMessages.appendChild(messageElement);
    scrollChatToBottom();
}
function scrollChatToBottom() {
	requestAnimationFrame(() => {
        chatMessages.scrollTo({
            top: chatMessages.scrollHeight,
            behavior: 'smooth'
        });
    });
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

// Modificar el evento focus del textarea para capturar el inicio
finalAnswer.addEventListener("focus", () => {
    if (!startTime) {
        startTime = new Date();
        // Emitir el evento de edición existente
        isEditingFinalAnswer = true;
        socket.emit("editing-final-answer", { roomId, isEditing: true });
        collaborativeEditingIndicator.style.display = "none";
    }
});

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
// Remover cualquier listener existente para evitar duplicados
socket.off("chat-message");

socket.on("chat-message", (data) => {
	console.log("Mensaje recibido:", data); // Para debug
	addMessageToChat(data);
});

socket.on("typing", () => {
	typingIndicator.style.display = "block";
});

socket.on("stop-typing", () => {
	typingIndicator.style.display = "none";
});

submitButton.addEventListener("click", () => {
    const student1Length = studentContents.student1.trim().length;
    const student2Length = studentContents.student2.trim().length;
    
    if (student1Length >= 10 && student1Length <= 200 && 
        student2Length >= 10 && student2Length <= 200) {
        
        const combinedAnswer = finalAnswer.value;
        
        if (combinedAnswer.trim()) {
            submitButton.disabled = true;
            socket.emit("ready-for-next-activity", {
                roomId,
                answer: combinedAnswer,
                individualAnswers: studentContents,
                activityNumber: 1
            });
            
            showWaitingMessage("Respuesta enviada. Esperando a tu compañero...");
        }
    } else {
        if (student1Length < 10 || student2Length < 10) {
            alert("Ambos estudiantes deben escribir al menos 10 caracteres.");
        } else {
            alert("Las respuestas no deben exceder los 200 caracteres.");
        }
    }
});

// Agregar nuevo evento para manejar cuando el compañero está listo
/* socket.on("partner-ready", (data) => {
    showMessage(`${data.userName} ha enviado su respuesta.`);
}); */

// Agregar nuevos event listeners para la transición
socket.on("user-ready", (data) => {
	console.log(`${data.readyCount} de ${data.totalNeeded} usuarios listos`);
	showWaitingMessage(
		`Esperando a los demás usuarios... (${data.readyCount}/${data.totalNeeded})`
	);
});

socket.on("start-activity-transition", (data) => {
	console.log("Iniciando transición a siguiente actividad:", data);
	showWaitingMessage("Preparando siguiente actividad...");

	// Redirigir a la página de carga
	setTimeout(() => {
		window.location.href = `/loading/${data.roomId}`;
	}, 1000);
});

socket.on("all-ready-next-activity", (data) => {
	console.log("Todos listos para la siguiente actividad");
	showWaitingMessage(
		"Tu compañero está listo. Preparando la siguiente actividad..."
	);
	setTimeout(() => {
		console.log("Redirigiendo a:", data.loadingUrl);
		window.location.href = data.loadingUrl;
	}, 1000);
});

socket.on("partner-disconnected", () => {
	showWaitingMessage(
		"Tu compañero se ha desconectado. Esperando reconexión..."
	);
});

socket.on("partner-reconnected", () => {
	hideWaitingMessage();
});

socket.on("room-not-available", () => {
	alert(
		"La sala ya no está disponible. Por favor, vuelve a la selección de sala."
	);
	window.location.href = "/seleccionar-sala";
});

// Mantener la conexión activa
setInterval(() => {
	if (socket.connected) {
		socket.emit("heartbeat", roomId);
	}
}, 30000);

// Ajustar el scroll del chat cuando se redimensiona la ventana
window.addEventListener("resize", scrollChatToBottom);

// Código para edición colaborativa
let isEditingFinalAnswer = false;
let lastContent = "";
let updateTimeout = null;

// Función para manejar cambios en el contenido
function handleContentChange() {
	const content = finalAnswer.value;
	const cursorPosition = finalAnswer.selectionStart;

	// Evitar actualizaciones innecesarias si el contenido no ha cambiado
	if (content !== lastContent) {
		lastContent = content;

		// Limpiar el timeout anterior si existe
		if (updateTimeout) {
			clearTimeout(updateTimeout);
		}

		// Establecer un nuevo timeout para throttling
		updateTimeout = setTimeout(() => {
			socket.emit("update-final-answer", {
				roomId,
				content,
				cursorPosition,
			});
		}, 100); // Pequeño delay para evitar sobrecarga
	}
}

// Eventos para el textarea
finalAnswer.addEventListener("input", handleContentChange);
finalAnswer.addEventListener("keyup", handleContentChange);
finalAnswer.addEventListener("paste", handleContentChange);
finalAnswer.addEventListener("focus", () => {
	isEditingFinalAnswer = true;
	socket.emit("editing-final-answer", { roomId, isEditing: true });
	collaborativeEditingIndicator.style.display = "none";
});

finalAnswer.addEventListener("blur", () => {
	isEditingFinalAnswer = false;
	socket.emit("editing-final-answer", { roomId, isEditing: false });
});
// Manejar las actualizaciones recibidas
socket.on("final-answer-updated", ({ content, cursorPosition, userId }) => {
	if (userId !== socket.id) {
		// Solo actualizar si el cambio viene de otro usuario
		const currentPosition = finalAnswer.selectionStart;

		// Guardar la posición actual del cursor
		const currentCursorPosition = finalAnswer.selectionStart;

		// Actualizar el contenido
		finalAnswer.value = content;
		lastContent = content;

		// Restaurar la posición del cursor según el estado de edición
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

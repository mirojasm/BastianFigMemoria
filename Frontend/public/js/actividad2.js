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
const myText = document.getElementById("my-text");
const partnerText = document.getElementById("partner-text");
const mySectionTitle = document.getElementById("my-section");
const partnerSectionTitle = document.getElementById("partner-section");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const sendMessageButton = document.getElementById("send-message");
const finalAnswer = document.getElementById("final-answer");
const submitButton = document.getElementById("submit-answer");
const collaborativeEditingIndicator = document.getElementById("collaborative-editing-indicator");
const waitingMessage = document.getElementById("waiting-message");
const individualAnswer = document.getElementById("individual-answer");

let myUserId;
let myRole = null;
let myStudentNumber = null;
let studentContents = {
    student1: "",
    student2: ""
};
let typingTimer;
const typingTimeout = 1000;
// Variables globales mejoradas para manejo de conteo
let lastEmittedContent = "";
let syncTimeout = null;

// Función para actualizar el contador de palabras
function updateWordCounter(content, studentKey) {
    const wordCount = content.trim().length;
    const countDisplay = document.getElementById(`word-count-${studentKey}`);
    
    if (countDisplay) {
        countDisplay.textContent = `Caracteres: ${wordCount}/100`;
        countDisplay.style.color = wordCount >= 10 && wordCount <= 100 ? '#00aa00' : '#ff0000';
    }
    
    return wordCount;
}
// El texto completo y su división
const fullText = `Había una vez una Rana que quería ser una Rana auténtica, y
todos los días se esforzaba en ello.
Al principio se compró un espejo en el que se miraba largamente
buscando su ansiada autenticidad.
Unas veces parecía encontrarla y otras no, según el humor de
ese día o de la hora, hasta que se cansó de esto y guardó el espejo
en un baúl.
Por fin pensó que la única forma de conocer su propio valor estaba en la opinión de la gente, y comenzó a peinarse y a vestirse y a
desvestirse (cuando no le quedaba otro recurso) para saber si los
demás la aprobaban y reconocían que era una Rana auténtica.
Un día observó que lo que más admiraban de ella era su cuerpo,
especialmente sus piernas, de manera que se dedicó a hacer sentadillas y a saltar para tener unas ancas cada vez mejores, y sentía
que todos la aplaudían.
Y así seguía haciendo esfuerzos hasta que, dispuesta a cualquier cosa para lograr que la consideraran una Rana auténtica, se
dejaba arrancar las ancas, y los otros se las comían, y ella todavía
alcanzaba a oír con amargura cuando decían que qué buena Rana,
que parecía Pollo. `;

const halfLength = Math.ceil(fullText.length / 2);
const firstHalf = fullText.slice(0, halfLength);
const secondHalf = fullText.slice(halfLength);

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

// Gestión de conexión
socket.on("connect", () => {
    console.log("Conectado al servidor en actividad 2");
    myUserId = socket.id;
    socket.emit("reconnect-to-activity2", {
        roomId,
        token,
        userInfo
    });
});

// Variable para controlar quién se conectó primero
let isFirstUser = null;

/* socket.on("activity2-user-connected", (data) => {
    console.log(`Usuario ${data.userName} conectado a la actividad 2`);
    hideWaitingMessage();
    // Determinar el número de estudiante
    socket.emit("get-user-number", roomId);
    activityContent.style.display = "block";
    // Determinar si es el primer usuario en conectarse
    if (isFirstUser === null) {
        isFirstUser = data.userCount === 1;
        myRole = isFirstUser ? 'first' : 'second';
        
        // Asignar el texto correspondiente
        if (myRole === 'first') {
            myText.textContent = firstHalf;
            partnerText.textContent = "Esperando a tu compañero...";
            mySectionTitle.textContent = "Tu parte (Primera mitad):";
            partnerSectionTitle.textContent = "Parte de tu compañero (Segunda mitad):";
        } else {
            myText.textContent = secondHalf;
            partnerText.textContent = firstHalf;
            mySectionTitle.textContent = "Tu parte (Segunda mitad):";
            partnerSectionTitle.textContent = "Parte de tu compañero (Primera mitad):";
        }
    }
    
    activityContent.style.display = "block";
}); */
socket.on("activity2-user-connected", (data) => {
    console.log(`Usuario ${data.userName} conectado a la actividad 2`);
    hideWaitingMessage();
    
    if (isFirstUser === null) {
        isFirstUser = data.userCount === 1;
        myRole = isFirstUser ? 'first' : 'second';
        myStudentNumber = myRole === 'first' ? 1 : 2;
        
        if (myRole === 'first') {
            myText.textContent = firstHalf;
            partnerText.textContent = "Esperando a tu compañero...";
            mySectionTitle.textContent = "Tu parte (Primera mitad):";
            partnerSectionTitle.textContent = "Parte de tu compañero (Segunda mitad):";
        } else {
            myText.textContent = secondHalf;
            partnerText.textContent = firstHalf;
            mySectionTitle.textContent = "Tu parte (Segunda mitad):";
            partnerSectionTitle.textContent = "Parte de tu compañero (Primera mitad):";
        }

        // Inicializar el contenido y contador del estudiante actual
        const studentKey = `student${myStudentNumber}`;
        studentContents[studentKey] = individualAnswer.value || '';
        updateWordCounter(individualAnswer.value || '', studentKey);
        
        if (individualAnswer.value) {
            socket.emit("individual-answer-update", {
                roomId,
                content: individualAnswer.value,
                studentNumber: myStudentNumber
            });
        }
    }
    
    activityContent.style.display = "block";
});
socket.on("activity2-ready", (data) => {
    console.log("Actividad 2 lista para comenzar");
    hideWaitingMessage();
    
    // Mostrar el texto del compañero si somos el segundo usuario
    if (myRole === 'second') {
        partnerText.textContent = firstHalf;
    } else {
        partnerText.textContent = secondHalf;
    }
});
// Evento para número de usuario
// Al recibir el número de estudiante, inicializar su contenido
/* socket.on("user-number", (number) => {
    console.log("Recibido número de usuario:", number);
    myStudentNumber = number;
    
    // Inicializar el contenido del estudiante actual
    const studentKey = myStudentNumber === 1 ? 'student1' : 'student2';
    studentContents[studentKey] = individualAnswer.value;
    updateFinalAnswer();
}); */
// Modificar el evento user-number para que solo actualice si no tenemos número asignado
socket.on("user-number", (number) => {
    console.log("Recibido número de usuario:", number);
    if (!myStudentNumber) {  // Solo actualizar si no tenemos número asignado
        myStudentNumber = number;
        const studentKey = `student${myStudentNumber}`;
        studentContents[studentKey] = individualAnswer.value || '';
    }
});
// Manejar cambios en respuesta individual
// Manejar cambios en respuesta individual
individualAnswer.addEventListener("input", (e) => {
    const content = e.target.value;
    const studentKey = myStudentNumber === 1 ? 'student1' : 'student2';
    
    // Limitar a 100 caracteres
    if (content.length > 100) {
        e.target.value = content.slice(0, 100);
        return;
    }
    
    // Actualizar contenido local
    studentContents[studentKey] = e.target.value;
    
    // Actualizar contador local inmediatamente
    updateWordCounter(content, studentKey);
    
    // Throttle las emisiones del socket
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
    }, 300); // Delay de 300ms
    
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

/* function updateFinalAnswer() {
    // Asegurarse de que cada parte mantenga su orden
    let combinedContent = '';
    
    // Siempre mantener el orden: student1 primero, student2 segundo
    if (studentContents.student1 || studentContents.student2) {
        combinedContent = [studentContents.student1, studentContents.student2]
            .filter(content => content) // Eliminar contenidos vacíos
            .join('\n\n');
    }
    
    finalAnswer.value = combinedContent.trim();
} */
    function updateFinalAnswer() {
        const student1Content = studentContents.student1.trim();
        const student2Content = studentContents.student2.trim();
        
        const student1Valid = student1Content.length >= 10 && student1Content.length <= 100;
        const student2Valid = student2Content.length >= 10 && student2Content.length <= 100;
        
        // Actualizar contadores para ambos estudiantes
        updateWordCounter(student1Content, 'student1');
        updateWordCounter(student2Content, 'student2');
        
        if (student1Valid && student2Valid) {
            finalAnswer.value = `${student1Content}\n\n${student2Content}`;
            submitButton.disabled = false;
        } else {
            finalAnswer.value = student1Content.length === 0 && student2Content.length === 0 ? 
                "Esperando respuestas..." : 
                "Ambos estudiantes deben escribir entre 10 y 100 caracteres...";
            submitButton.disabled = true;
        }
    }
// Funciones de UI
function showWaitingMessage(message) {
    if (waitingMessage) {
        waitingMessage.textContent = message;
        waitingMessage.style.display = "block";
        activityContent.style.opacity = "0.5";
    }
    if (activityContent) {
        activityContent.style.opacity = "0.5";
    }
}
// funciona todo menos el boton xdxd
function showMessage(message) {
    const messageElement = document.createElement("div");
    messageElement.className = "status-message";
    messageElement.textContent = message;
    document.querySelector(".activity-info").appendChild(messageElement);
    
    setTimeout(() => {
        messageElement.remove();
    }, 5000);
}

function hideWaitingMessage() {
    if (waitingMessage) {
        waitingMessage.style.display = "none";
    }
    if (activityContent) {
        activityContent.style.display = "block";
        activityContent.style.opacity = "1";
    }
}

// Gestión del chat
/* function addMessageToChat(data) {
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

    // Agregar timestamp al mensaje
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
} */
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
    
        // Agregar el ID real del usuario y timestamp como atributos de datos
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
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

/* function sendMessage() {
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
} */
// Modificar la función sendMessage para incluir información adicional del usuario
function sendMessage() {
    const message = chatInput.value.trim();
    if (message) {
        // Obtener la información del usuario del localStorage
        const userInfo = JSON.parse(localStorage.getItem("userInfo"));
        
        socket.emit("chat-message", {
            roomId,
            message,
            timestamp: new Date().toISOString(),
            userName: userInfo.nombre,
            realUserId: userInfo.id // Incluir el ID real del usuario
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

/* // Socket event handlers para el chat
socket.on("chat-message", (data) => {
    console.log("Mensaje recibido:", data);
    addMessageToChat(data);
}); */
// Modificar el event listener del chat-message
socket.on("chat-message", (data) => {
    console.log("Mensaje recibido:", data);
    // Asegurarse de que los datos incluyan toda la información necesaria
    const messageData = {
        ...data,
        realUserId: data.realUserId || data.userId // Asegurarse de que siempre haya un ID de usuario
    };
    addMessageToChat(messageData);
});
socket.on("typing", () => {
    typingIndicator.style.display = "block";
});

socket.on("stop-typing", () => {
    typingIndicator.style.display = "none";
});

// Gestión de eventos de desconexión/reconexión
socket.on("disconnect", (reason) => {
    console.log("Desconectado del servidor:", reason);
    showWaitingMessage("Desconectado del servidor. Intentando reconectar...");
});

socket.on("partner-disconnected", () => {
    showWaitingMessage("Tu compañero se ha desconectado. Esperando reconexión...");
});

socket.on("partner-reconnected", () => {
    hideWaitingMessage();
});

// Gestión de respuesta final
// Gestión de respuesta final
submitButton.addEventListener("click", () => {
    const student1Content = studentContents.student1.trim();
    const student2Content = studentContents.student2.trim();
    
    const student1Length = student1Content.length;
    const student2Length = student2Content.length;
    
    if (student1Length >= 10 && student1Length <= 100 && 
        student2Length >= 10 && student2Length <= 100) {
        
        const combinedAnswer = finalAnswer.value;
        
        if (combinedAnswer.trim()) {
            submitButton.disabled = true;
            showWaitingMessage("Enviando respuesta...");
            
            localStorage.setItem('activity2Response', combinedAnswer);
            
            socket.emit("activity2-complete", {
                roomId,
                answer: combinedAnswer,
                individualAnswers: {
                    student1: student1Content,
                    student2: student2Content
                }
            });
        }
    } else {
        if (student1Length < 10 || student2Length < 10) {
            alert("Ambos estudiantes deben escribir al menos 10 caracteres.");
        } else {
            alert("Las respuestas no deben exceder los 100 caracteres.");
        }
    }
});



socket.on("redirect-to-completion", () => {
    showWaitingMessage("¡Actividad completada! Redirigiendo...");
    
    // Asegurar que la redirección ocurra
    const redirectTimeout = setTimeout(() => {
        window.location.href = "/completion";
    }, 2000);

    // Backup por si el timeout falla
    window.addEventListener('beforeunload', () => {
        clearTimeout(redirectTimeout);
    });
});
// Agregar manejo de errores
socket.on("error", (data) => {
    alert(data.message);
    submitButton.disabled = false;
    hideWaitingMessage();
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
            finalAnswer.setSelectionRange(currentCursorPosition, currentCursorPosition);
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

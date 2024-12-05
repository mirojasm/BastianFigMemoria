// Importaciones ES modules
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";
import session from "express-session";
import { colaboracionService } from "./src/services/apiService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const http = createServer(app);
const io = new Server(http);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
dotenv.config();

app.use("/resources", express.static("public"));
app.use("/resources", express.static(join(__dirname, "public")));
app.use(
	"/socket.io",
	express.static(join(__dirname, "node_modules/socket.io/client-dist"))
);

app.set("view engine", "ejs");
app.use(
	session({
		secret: "secret",
		resave: true,
		saveUninitialized: true,
	})
);

const rooms = {};
const connectedUsers = new Map();
const currentActivity = {};
const readyUsers = {};
const userImages = new Map();
// Nuevo objeto para manejar el estado de las respuestas
const userResponses = {};


// Función auxiliar para manejar el estado de la sala
const getRoomState = (roomId) => {
    if (!rooms[roomId]) {
        rooms[roomId] = {
            users: new Set(),
            collaborationId: null,
            currentActivity: 1,
            responses: new Map(), // Almacena las respuestas de los usuarios
            bothUsersSubmitted: false
        };
    }
    return rooms[roomId];
};
// Función auxiliar para manejar el estado de la sala
const getRoomState2 = (roomId) => {
    if (!rooms[roomId]) {
        rooms[roomId] = {
            users: new Set(),
            collaborationId: null,
            currentActivity: 2,
            responses: new Map(), // Almacena las respuestas de los usuarios
            bothUsersSubmitted: false
        };
    }
    return rooms[roomId];
};

io.on("connection", async (socket) => {
	console.log("Un usuario se ha conectado", socket.id);
	console.log("Auth info recibida:", socket.handshake.auth);

	const authInfo = socket.handshake.auth;
	let userData = null;

	if (!authInfo || !authInfo.token || !authInfo.userInfo) {
		console.log("Conexión sin autenticación válida");
		socket.emit("auth_error", {
			message: "No se proporcionó información de autenticación",
		});
		return;
	}

	try {
		userData =
			typeof authInfo.userInfo === "string"
				? JSON.parse(authInfo.userInfo)
				: authInfo.userInfo;

		if (!userData || !userData.id) {
			console.log("Información de usuario inválida");
			socket.emit("auth_error", {
				message: "Información de usuario inválida",
			});
			return;
		}

		// Guardar información del usuario y token
		connectedUsers.set(socket.id, {
			room: null,
			userId: parseInt(userData.id),
			nombre: userData.nombre || "Usuario Anónimo",
			establecimiento: userData.establecimiento,
			token: authInfo.token, // Guardamos el token aquí
		});

		console.log("Usuario autenticado correctamente:", {
			socketId: socket.id,
			userId: userData.id,
			nombre: userData.nombre,
		});
	} catch (error) {
		console.error("Error al procesar la información del usuario:", error);
		socket.emit("auth_error", {
			message: "Error al procesar la información de usuario",
		});
		return;
	}

	socket.on("create-room", () => {
		const roomId = (Math.random().toString(36) + 'A0').slice(2,4).toUpperCase();
		rooms[roomId] = {
			users: new Set([socket.id]),
			collaborationId: null,
		};
		socket.join(roomId);
		connectedUsers.get(socket.id).room = roomId;
		userImages.set(socket.id, 1);
		console.log(`Sala creada: ${roomId}`);
		socket.emit("room-created", roomId);
	});

	socket.on("join-room", async (roomId) => {
		try {
			const userInfo = connectedUsers.get(socket.id);
			if (!userInfo.userId) {
				socket.emit("error", { message: "Usuario no autenticado" });
				return;
			}

			if (rooms[roomId] && rooms[roomId].users.size < 2) {
				rooms[roomId].users.add(socket.id);
				socket.join(roomId);
				connectedUsers.get(socket.id).room = roomId;
				userImages.set(socket.id, rooms[roomId].users.size);

				if (rooms[roomId].users.size === 2) {
					const users = Array.from(rooms[roomId].users)
						.map((id) => connectedUsers.get(id))
						.filter((user) => user && user.userId);

					if (users.length === 2) {
						try {
							const collaboration =
								await colaboracionService.crearPareja(
									users[0].userId,
									users[1].userId,
									roomId,
									userInfo.token // Usamos el token guardado
								);

							if (collaboration) {
								rooms[roomId].collaborationId =
									collaboration.id;
								io.to(roomId).emit("activity-ready", roomId);
							} else {
								socket.emit("error", {
									message:
										"Error al establecer la colaboración",
								});
							}
						} catch (error) {
							console.error("Error al crear pareja:", error);
							socket.emit("error", {
								message:
									"Error al crear la pareja de colaboración",
							});
						}
					}
				} else {
					socket.emit("waiting-for-partner", roomId);
				}
			} else {
				socket.emit("room-full");
			}
		} catch (error) {
			console.error("Error en join-room:", error);
			socket.emit("error", { message: "Error al unirse a la sala" });
		}
	});
	// esto es para lo nuevoo aa SOLO PARA ACTIVIDAD 1 ME SIRVE
	socket.on("individual-answer-update", (data) => {
		const roomId = data.roomId;
		if (rooms[roomId]) {
			socket.to(roomId).emit("individual-answer-updated", {
				content: data.content,
				studentNumber: data.studentNumber
			});
		}
	});

	socket.on("get-user-number", (roomId) => {
		if (rooms[roomId] && rooms[roomId].users.has(socket.id)) {
			const userNumber = userImages.get(socket.id);
			socket.emit("user-number", userNumber);
		}
	});

	
	/* socket.on("chat-message", async (data) => {
		const userInfo = connectedUsers.get(socket.id);
		const roomId = userInfo.room;
	
		if (roomId && rooms[roomId]) {
			console.log(`Mensaje recibido de ${userInfo.nombre} en sala ${roomId}`);
	
			if (rooms[roomId].collaborationId) {
				try {
					// Asegurarse de enviar el ID del usuario real, no el socket.id
					await colaboracionService.guardarMensaje(
						rooms[roomId].collaborationId,
						userInfo.userId, // Usar el ID real del usuario
						data.message,
						userInfo.token
					);
	
					const messageData = {
						userId: socket.id,
						userName: userInfo.nombre,
						message: data.message,
						timestamp: new Date().toISOString(),
						realUserId: userInfo.userId // Agregar el ID real del usuario
					};
	
					io.to(roomId).emit("chat-message", messageData);
				} catch (error) {
					console.error("Error al guardar mensaje:", error);
					socket.emit("error", {
						message: "Error al guardar el mensaje"
					});
				}
			}
		}
	}); */
socket.on("chat-message", async (data) => {
    const userInfo = connectedUsers.get(socket.id);
    const roomId = userInfo?.room;

    if (!roomId || !rooms[roomId]) {
        socket.emit("error", { message: "Sala no encontrada" });
        return;
    }

    const messageData = {
        userId: socket.id,
        userName: userInfo.nombre,
        message: data.message,
        timestamp: new Date().toISOString()
    };

    io.to(roomId).emit("chat-message", messageData);
});
	socket.on("update-final-answer", (data) => {
		const roomId = data.roomId;
		if (rooms[roomId]) {
			socket.to(roomId).emit("final-answer-updated", {
				content: data.content,
				cursorPosition: data.cursorPosition,
				userId: socket.id,
			});
		}
	});

	socket.on("editing-final-answer", (data) => {
		const roomId = data.roomId;
		if (rooms[roomId]) {
			socket
				.to(roomId)
				.emit("partner-editing-final-answer", data.isEditing);
		}
	});

	// Modificar el evento ready-for-next-activity
socket.on("ready-for-next-activity", async (data) => {
    const userInfo = connectedUsers.get(socket.id);
    const roomId = data.roomId;
    const answer = data.answer;
    const roomState = getRoomState(roomId);

    // Guardar la respuesta del usuario actual
    if (!userResponses[roomId]) {
        userResponses[roomId] = new Map();
    }
    userResponses[roomId].set(socket.id, answer);

    // Notificar al otro usuario que este usuario está listo
    socket.to(roomId).emit("partner-ready", {
        userId: socket.id,
        userName: userInfo.nombre
    });

    // Guardar la respuesta en la base de datos
    if (roomState.collaborationId) {
        try {
            await colaboracionService.guardarRespuesta(
                roomState.collaborationId,
                1,
                answer,
                userInfo.token
            );
			roomState.currentActivity = 2;
			// Notificar a ambos usuarios y comenzar la transición
			io.to(roomId).emit("start-activity-transition", {
				nextActivity: 2,
				roomId: roomId
			});
            console.log("Respuesta guardada exitosamente");
        } catch (error) {
            console.error("Error al guardar respuesta:", error);
            socket.emit("error", {
                message: "Error al guardar la respuesta"
            });
            return;
        }
    }

    
});

	// Añadir este nuevo evento para manejar la reconexión en actividad2
	// Modificar el manejo de la reconexión para la Actividad 2
socket.on("reconnect-to-activity2", async ({ roomId }) => {
    try {
        const userInfo = connectedUsers.get(socket.id);
        if (!userInfo) {
            socket.emit("error", { message: "Usuario no encontrado" });
            return;
        }

        const roomState = getRoomState(roomId);
        
        // Verificar si la sala existe y está en la actividad 2
        if (roomState && roomState.currentActivity === 2) {
            roomState.users.add(socket.id);
            socket.join(roomId);
            userInfo.room = roomId;

            // Actualizar el estado del usuario en la sala
            connectedUsers.set(socket.id, {
                ...userInfo,
                room: roomId
            });

            // Notificar a todos los usuarios en la sala
            io.to(roomId).emit("activity2-user-connected", {
                userId: socket.id,
                userName: userInfo.nombre,
                userCount: roomState.users.size
            });

            // Si ambos usuarios están conectados, iniciar la actividad 2
            if (roomState.users.size === 2) {
                io.to(roomId).emit("activity2-ready", {
                    roomId: roomId
                });
            }
        } else {
            socket.emit("room-not-available");
        }
    } catch (error) {
        console.error("Error en reconnect-to-activity2:", error);
        socket.emit("error", {
            message: "Error al reconectar a la actividad 2"
        });
    }
});


// Modificar el manejador del evento activity2-complete
socket.on("activity2-complete", async (data) => {
    const userInfo = connectedUsers.get(socket.id);
    const roomId = data.roomId;
    const answer = data.answer;
    const roomState = getRoomState2(roomId);

    // Evitar múltiples envíos o redirecciones en proceso
    if (roomState.hasSubmittedResponse || roomState.redirectInProgress) {
        return;
    }

    try {
        // Marcar que estamos en proceso de redirección
        roomState.redirectInProgress = true;
        roomState.hasSubmittedResponse = true;

        // Guardar la respuesta
        await colaboracionService.guardarRespuesta(
            roomState.collaborationId,
            2,
            answer,
            userInfo.token
        );
        console.log("Respuesta de actividad 2 guardada exitosamente");

        // Notificar a todos los usuarios en la sala para redirigir
        io.to(roomId).emit("redirect-to-completion");
        
        // Limpiar la sala después de un tiempo prudente
        setTimeout(() => {
            if (rooms[roomId]) {
                delete rooms[roomId];
            }
        }, 3000);

    } catch (error) {
        console.error("Error al guardar respuesta:", error);
        roomState.redirectInProgress = false;
        roomState.hasSubmittedResponse = false;
        socket.emit("error", {
            message: "Error al guardar la respuesta"
        });
    }
});
	socket.on("disconnect", (reason) => {
		console.log(`Usuario desconectado: ${socket.id}, Razón: ${reason}`);
		const userInfo = connectedUsers.get(socket.id);
		if (userInfo && userInfo.room) {
			const roomId = userInfo.room;
			if (rooms[roomId]) {
				rooms[roomId].users.delete(socket.id);
				userImages.delete(socket.id);
				if (rooms[roomId].users.size > 0) {
					socket.to(roomId).emit("partner-disconnected");
				}
			}
		}
		connectedUsers.delete(socket.id);
	});

	socket.on("reconnect-to-room", (roomId) => {
		if (rooms[roomId] && rooms[roomId].users.size < 2) {
			rooms[roomId].users.add(socket.id);
			socket.join(roomId);
			connectedUsers.get(socket.id).room = roomId;
			userImages.set(socket.id, rooms[roomId].users.size);
			io.to(roomId).emit("partner-reconnected");
		} else {
			socket.emit("room-not-available");
		}
	});
});

console.log('API_URL después de dotenv:', process.env.API_URL);
// Rutas
app.get("/", (req, res) => {
	res.render("login/login");
});
app.get('/condicion', (req, res) => {
    res.render('indicaciones/codicion');  // Cambiar a 'codicion' para que coincida
});
app.get('/instructivo', (req, res) => {
    res.render('indicaciones/instructivo');
});
app.get("/login", (req, res) => {
	res.render("login/login");
});

// Nuevas rutas para actividades individuales
app.get("/actividadnivel1/pregunta1nivel1", (req, res) => {
    res.render("actividadnivel1/pregunta1nivel1");
});

// Para la pregunta 2
app.get("/actividadnivel1/pregunta2nivel1", (req, res) => {
    res.render("actividadnivel1/pregunta2nivel1");
});

// Rutas para nivel 2
app.get("/actividadnivel2/pregunta1nivel2", (req, res) => {
    res.render("actividadnivel2/pregunta1nivel2");
});

app.get("/actividadnivel2/pregunta2nivel2", (req, res) => {
    res.render("actividadnivel2/pregunta2nivel2");
});

app.get("/levels", (req, res) => {
	res.render("levels/niveles");
});
app.get("/level2", (req, res) => {
	res.render("levels/nivel2");
});
app.get("/level3", (req, res) => {
	res.render("levels/nivel3");
});
app.get('/completion', (req, res) => {
    res.render('actividad/completion');
});

app.get('/feedback', (req, res) => {
    res.render('feedback/feedback');
});
// En tu archivo de rutas del frontend
app.get('/feedback-elaborado', (req, res) => {
    res.render('feedback/feedback-elaborado');
});
// En tu archivo de rutas del frontend
app.get('/feedback-acumulativo', (req, res) => {
    res.render('feedback/feedback-acumulado');
});
app.get('/menuretro', (req, res) => {
    res.render('vistaretroali/retroalimentacion.ejs');
});

app.get('/test-openai', (req, res) => {
    res.render('test-openai');
});

app.get("/seleccionar-sala", (req, res) => {
	res.render("actividad/seleccionar-sala");
});

app.get("/loading/:roomId", (req, res) => {
	const roomId = req.params.roomId;
	res.render("loading/loading", { roomId: roomId });
});


app.get("/actividad/:roomId", (req, res) => {
	const roomId = req.params.roomId;
	if (rooms[roomId] && rooms[roomId].users.size <= 2) {
		res.render("actividad/actividad", { roomId: roomId });
	} else {
		res.redirect("/seleccionar-sala");
	}
});

app.get("/actividad2/:roomId", (req, res) => {
	const roomId = req.params.roomId;
	console.log(`Solicitud de actividad2 para sala ${roomId}`);

	if (rooms[roomId]) {
		console.log(`Estado de la sala ${roomId}:`, {
			usersCount: rooms[roomId].users.size,
			currentActivity: currentActivity[roomId],
		});

		// Permitir el acceso incluso si temporalmente no hay usuarios
		// (podrían estar en proceso de reconexión)
		res.render("actividad/actividad2", { roomId: roomId });
	} else {
		console.log(`Sala ${roomId} no encontrada`);
		res.redirect("/seleccionar-sala");
	}
});

http.listen(3000, () => {
	console.log("Servidor escuchando en http://localhost:3000");
});

export default app;

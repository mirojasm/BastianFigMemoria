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
dotenv.config({ path: "./env/.env" });

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
		const roomId = Math.random().toString(36).substring(7);
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

	socket.on("get-user-number", (roomId) => {
		if (rooms[roomId] && rooms[roomId].users.has(socket.id)) {
			const userNumber = userImages.get(socket.id);
			socket.emit("user-number", userNumber);
		}
	});

	socket.on("chat-message", async (data) => {
		const userInfo = connectedUsers.get(socket.id);
		const roomId = userInfo.room;

		if (roomId && rooms[roomId]) {
			console.log(
				`Mensaje recibido de ${userInfo.nombre} en sala ${roomId}`
			);

			if (rooms[roomId].collaborationId) {
				try {
					await colaboracionService.guardarMensaje(
						rooms[roomId].collaborationId,
						userInfo.userId,
						data.message,
						userInfo.token
					);

					const messageData = {
						userId: socket.id,
						userName: userInfo.nombre,
						message: data.message,
						timestamp: new Date().toISOString(),
					};

					io.to(roomId).emit("chat-message", messageData);
				} catch (error) {
					console.error("Error al guardar mensaje:", error);
					socket.emit("error", {
						message: "Error al guardar el mensaje",
					});
				}
			}
		}
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

	socket.on("ready-for-next-activity", async (data) => {
		const userInfo = connectedUsers.get(socket.id);
		const roomId = data.roomId;
		const answer = data.answer;

		if (!readyUsers[roomId]) {
			readyUsers[roomId] = new Set();
		}

		readyUsers[roomId].add(socket.id);

		if (readyUsers[roomId].size === rooms[roomId].users.size) {
			if (rooms[roomId].collaborationId) {
				try {
					console.log("Intentando guardar respuesta final:", {
						collaborationId: rooms[roomId].collaborationId,
						preguntaId: 1,
						answer,
					});

					const respuesta =
						await colaboracionService.guardarRespuesta(
							rooms[roomId].collaborationId,
							1, // ID de la pregunta actual
							answer,
							userInfo.token
						);

					console.log("Respuesta guardada:", respuesta);

					if (!currentActivity[roomId]) {
						currentActivity[roomId] = 1;
					}

					if (currentActivity[roomId] === 1) {
						currentActivity[roomId] = 2;
						const loadingUrl = `/loading/${roomId}`;
						io.to(roomId).emit("all-ready-next-activity", {
							loadingUrl,
						});
					} else {
						io.to(roomId).emit("all-activities-completed");
					}
				} catch (error) {
					console.error(
						"Error al guardar la respuesta final:",
						error
					);
					socket.emit("error", {
						message: "Error al guardar la respuesta final",
					});
				}
			}

			delete readyUsers[roomId];
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

// Rutas
app.get("/", (req, res) => {
	res.render("login/login");
});

app.get("/login", (req, res) => {
	res.render("login/login");
});

app.get("/levels", (req, res) => {
	res.render("levels/niveles");
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
	if (rooms[roomId] && rooms[roomId].users.size <= 2) {
		res.render("actividad/actividad2", { roomId: roomId });
	} else {
		res.redirect("/seleccionar-sala");
	}
});

http.listen(3000, () => {
	console.log("Servidor escuchando en http://localhost:3000");
});

export default app;

-- SQLBook: Code
CREATE TABLE `usuarios` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `nombre` varchar(100),
  `email` varchar(255) UNIQUE,
  `curso` int,
  `contrasena` varchar(255),
  `establecimiento` varchar(255)
);

CREATE TABLE `preguntas` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `texto` text,
  `imagen_url` varchar(255),
  `orden` int,
  `nivel` int
);

CREATE TABLE `parejas_colaboracion` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `usuario1_id` int,
  `usuario2_id` int
);

CREATE TABLE `chats_colaborativos` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `pareja_colaboracion_id` int,
  `pregunta_id` int
);

CREATE TABLE `mensajes_chat` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `chat_colaborativo_id` int,
  `usuario_id` int,
  `contenido` text,
  `timestamp` timestamp
);

CREATE TABLE `respuestas_finales` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `pareja_colaboracion_id` int,
  `pregunta_id` int,
  `respuesta_final` text,
  `timestamp` timestamp
);

ALTER TABLE `parejas_colaboracion` ADD FOREIGN KEY (`usuario1_id`) REFERENCES `usuarios` (`id`);

ALTER TABLE `parejas_colaboracion` ADD FOREIGN KEY (`usuario2_id`) REFERENCES `usuarios` (`id`);

ALTER TABLE `chats_colaborativos` ADD FOREIGN KEY (`pareja_colaboracion_id`) REFERENCES `parejas_colaboracion` (`id`);

ALTER TABLE `chats_colaborativos` ADD FOREIGN KEY (`pregunta_id`) REFERENCES `preguntas` (`id`);

ALTER TABLE `mensajes_chat` ADD FOREIGN KEY (`chat_colaborativo_id`) REFERENCES `chats_colaborativos` (`id`);

ALTER TABLE `mensajes_chat` ADD FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`);

ALTER TABLE `respuestas_finales` ADD FOREIGN KEY (`pareja_colaboracion_id`) REFERENCES `parejas_colaboracion` (`id`);

ALTER TABLE `respuestas_finales` ADD FOREIGN KEY (`pregunta_id`) REFERENCES `preguntas` (`id`);

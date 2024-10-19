# Backend de Aplicación de Colaboración Educativa

Este es el backend para una aplicación de colaboración educativa que permite a los usuarios formar parejas, responder preguntas en conjunto y participar en chats colaborativos.

## Tecnologías Utilizadas

- Node.js
- Express.js
- Prisma ORM
- MySQL
- JSON Web Tokens (JWT) para autenticación

## Requisitos Previos

- Node.js (versión 14 o superior)
- MySQL

## Instalación

1. Clona este repositorio:
   ```
   git clone https://github.com/tu-usuario/tu-repo.git
   cd tu-repo
   ```

2. Instala las dependencias:
   ```
   npm install
   ```

3. Crea un archivo `.env` en la raíz del proyecto y configura las variables de entorno necesarias. Puedes usar `.env.example` como plantilla.

4. Configura la base de datos:
   ```
   npx prisma migrate dev
   ```

## Estructura del Proyecto

```
backend/
│
├── prisma/
│   └── schema.prisma
│
├── src/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   ├── usuarioController.js
│   │   ├── preguntaController.js
│   │   ├── colaboracionController.js
│   │   └── chatController.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── usuarioRoutes.js
│   │   ├── preguntaRoutes.js
│   │   ├── colaboracionRoutes.js
│   │   └── chatRoutes.js
│   ├── utils/
│   │   └── errorHandler.js
│   └── app.js
│
├── .env
├── .gitignore
└── package.json
```

## Uso

Para iniciar el servidor en modo de desarrollo:

```
npm run dev
```

El servidor estará disponible en `http://localhost:3001` (o el puerto que hayas configurado).

## API Endpoints

- Usuarios:
  - GET `/api/usuarios`: Obtener todos los usuarios
  - GET `/api/usuarios/:id`: Obtener un usuario por ID
  - POST `/api/usuarios`: Crear un nuevo usuario
  - PUT `/api/usuarios/:id`: Actualizar un usuario
  - DELETE `/api/usuarios/:id`: Eliminar un usuario

- Preguntas:
  - GET `/api/preguntas`: Obtener todas las preguntas
  - GET `/api/preguntas/:id`: Obtener una pregunta por ID
  - POST `/api/preguntas`: Crear una nueva pregunta
  - PUT `/api/preguntas/:id`: Actualizar una pregunta
  - DELETE `/api/preguntas/:id`: Eliminar una pregunta

- Colaboraciones:
  - GET `/api/colaboraciones`: Obtener todas las parejas de colaboración
  - POST `/api/colaboraciones`: Crear una nueva pareja de colaboración
  - GET `/api/colaboraciones/:id`: Obtener una pareja de colaboración por ID
  - DELETE `/api/colaboraciones/:id`: Eliminar una pareja de colaboración

- Chats:
  - POST `/api/chats`: Crear un nuevo chat colaborativo
  - GET `/api/chats/:id`: Obtener un chat colaborativo por ID
  - POST `/api/chats/mensaje`: Añadir un mensaje a un chat
  - POST `/api/chats/respuesta-final`: Enviar una respuesta final

## Seguridad

- La autenticación se maneja mediante JSON Web Tokens (JWT).
- Las rutas protegidas requieren un token válido en el encabezado de la solicitud.
- CORS está configurado para permitir solicitudes solo desde orígenes autorizados.

## Contribución

Si deseas contribuir a este proyecto, por favor:

1. Haz un fork del repositorio
2. Crea una nueva rama para tu función (`git checkout -b feature/AmazingFeature`)
3. Haz commit de tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Haz push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está licenciado bajo la Licencia MIT. Consulta el archivo `LICENSE` para más detalles.

## Contacto

Tu Nombre - tu@email.com

Link del Proyecto: [https://github.com/tu-usuario/tu-repo](https://github.com/tu-usuario/tu-repo)
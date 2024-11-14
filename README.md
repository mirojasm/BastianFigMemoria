# CuriosaMente

## Descripción

CuriosaMente es una plataforma educativa diseñada para mejorar el pensamiento crítico en jóvenes, desarrollada como proyecto de memoria para optar al título de Ingeniero Civil en Informática y Telecomunicaciones en la Universidad Diego Portales.

La aplicación proporciona una experiencia de aprendizaje estructurada a través de niveles progresivos, combinando actividades individuales y colaborativas para desarrollar habilidades de pensamiento crítico.

## Características Principales

-   3 niveles de aprendizaje progresivo
-   Sistema de actividades individuales y colaborativas
-   Chat en tiempo real para colaboración entre estudiantes
-   Retroalimentación automática usando IA
-   Sistema de autenticación y gestión de usuarios
-   Interfaz intuitiva y responsiva

## Tecnologías Utilizadas

### Backend

-   **Runtime**: Node.js
-   **Framework**: Express.js
-   **Base de Datos**:
    -   MySQL
    -   Prisma ORM
-   **Autenticación**: JWT (JSON Web Tokens)
-   **WebSockets**: Socket.io
-   **Validación**: dotenv
-   **Seguridad**: bcryptjs
-   **Análisis IA**: OpenAI API

### Frontend

-   **Motor de Vistas**: EJS
-   **Estilizado**: CSS puro
-   **WebSockets**: Socket.io-client
-   **Sesiones**: express-session

## Estructura del Proyecto

```
tesis_basti/
├── Backend/
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── routes/
│       ├── services/
│       └── utils/
└── Frontend/
    ├── public/
    │   ├── css/
    │   ├── images/
    │   └── js/
    ├── src/
    │   └── services/
    └── views/
        ├── actividad/
        ├── actividadnivel1/
        ├── actividadnivel2/
        ├── feedback/
        ├── indicaciones/
        ├── levels/
        ├── loading/
        └── login/
```

## Requisitos Previos

-   Node.js (versión v20.16.0)
-   npm (versión 10.8.2)
-   MySQL Server
-   Git

## Instalación

1. Clona el repositorio:

    ```bash
    git clone https://github.com/BastianFig/BastianFigMemoria.git
    cd BastianFigMemoria
    ```

2. Instala las dependencias del backend:

    ```bash
    cd Backend
    npm install
    ```

3. Instala las dependencias del frontend:

    ```bash
    cd ../Frontend
    npm install
    ```

4. Configura las variables de entorno:

    Backend (.env):

    ```
    DATABASE_URL="mysql://usuario:contraseña@host:puerto/basedatos"
    PORT=3001
    JWT_SECRET="tu_clave_secreta"
    NODE_ENV="development"
    JWT_EXPIRATION="1d"
    CORS_ORIGIN="http://localhost:3001"
    FRONTEND_URL=http://localhost:3000
    ```

    Frontend (.env):

    ```
    PORT=3000
    BACKEND_URL="http://localhost:3001"
    NODE_ENV=development
    ```

5. Inicializa la base de datos:
    ```bash
    cd Backend
    npx prisma migrate dev
    ```

## Ejecución

1. Inicia el backend:

    ```bash
    cd Backend
    npm run dev
    ```

2. Inicia el frontend:
    ```bash
    cd Frontend
    npm run dev
    ```

La aplicación estará disponible en:

-   Frontend: http://localhost:3000
-   Backend: http://localhost:3001

## Niveles de la Aplicación

### Nivel 1: Evaluación Individual

-   Actividades basadas en análisis de imágenes
-   Preguntas de evaluación y metacognición
-   Respuestas individuales

### Nivel 2: Análisis de Texto

-   Lectura y análisis de textos
-   Preguntas de evaluación y metacognición
-   Desarrollo de pensamiento crítico individual

### Nivel 3: Colaboración

-   Actividades colaborativas en parejas
-   Chat en tiempo real
-   Toma de decisiones conjunta
-   Retroalimentación entre pares

## Características de Seguridad

-   Autenticación mediante JWT
-   Contraseñas encriptadas con bcrypt
-   Validación de sesiones
-   Protección de rutas
-   Manejo seguro de datos sensibles

## Scripts Disponibles

Backend:

```bash
npm run dev     # Inicia el servidor en modo desarrollo
npm run start   # Inicia el servidor en producción
```

Frontend:

```bash
npm run dev     # Inicia el servidor de desarrollo
```

## Base de Datos

El proyecto utiliza MySQL con Prisma ORM. El esquema incluye las siguientes tablas principales:

-   usuarios
-   preguntas
-   parejas_colaboracion
-   chats_colaborativos
-   mensajes_chat
-   respuestas_finales
-   respuestas_individuales

## Contribución

1. Haz fork del repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto es parte de una memoria de título para la Universidad Diego Portales. Todos los derechos reservados.

## Autor

Bastián Figueroa - Estudiante de Ingeniería Civil en Informática y Telecomunicaciones - Universidad Diego Portales

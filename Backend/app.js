import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import usuarioRoutes from './src/routes/usuarioRoutes.js';
import preguntaRoutes from './src/routes/preguntaRoutes.js';
import colaboracionRoutes from './src/routes/colaboracionRoutes.js';
import chatRoutes from './src/routes/chatRoutes.js';
import errorHandler from './src/utils/errorHandler.js';
import authRoutes from './src/routes/authRoutes.js'; // Importa las nuevas rutas de autenticación
import preguntasdividualesRoutes from './src/routes/preguntasdividualesRoutes.js';
import feedbackRoutes from './src/routes/feedbackRoutes.js';
// Cargar variables de entorno
dotenv.config();

const app = express();

// Configuración de CORS
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://10.0.0.104:3000',
];

app.use(
    cors({
        origin: function (origin, callback) {
            // Permitir solicitudes sin origen (como Postman o solicitudes del mismo servidor)
            if (!origin) return callback(null, true);
            if (allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                console.log('Origin not allowed by CORS:', origin);
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        optionsSuccessStatus: 200
    })
);

app.use(express.json());

// Rutas
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/preguntas', preguntaRoutes);
app.use('/api/colaboraciones', colaboracionRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/auth', authRoutes); // Usa las nuevas rutas de autenticación
app.use('/api', preguntasdividualesRoutes);
// Manejador de errores
// Rutas API
app.use('/api/feedback', feedbackRoutes);
app.use(errorHandler);
app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok',
      timestamp: new Date(),
      service: 'backend',
      project: 'absolute-pulsar-438601-p2'
    });
  });
const PORT = process.env.PORT || 3001;


app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
    console.log('Orígenes permitidos por CORS:', allowedOrigins);
});

export default app;
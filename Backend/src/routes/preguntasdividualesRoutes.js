import express from 'express';
import { getPregunta, checkRespuesta, createRespuesta } from '../controllers/preguntasdividualesController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.get('/preguntas/:id', authMiddleware, getPregunta);
router.get('/respuestas-individuales/check/:preguntaId', authMiddleware, checkRespuesta);
router.post('/respuestas-individuales', authMiddleware, createRespuesta);

export default router;

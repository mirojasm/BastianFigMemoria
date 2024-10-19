import express from 'express';
import {
  createChatColaborativo,
  getChatColaborativo,
  addMensajeChat,
  submitRespuestaFinal,
} from '../controllers/chatController.js';

const router = express.Router();

router.post('/', createChatColaborativo);
router.get('/:id', getChatColaborativo);
router.post('/mensaje', addMensajeChat);
router.post('/respuesta-final', submitRespuestaFinal);

export default router;
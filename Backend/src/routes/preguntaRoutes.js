import express from 'express';
import {
  getAllPreguntas,
  getPreguntaById,
  createPregunta,
  updatePregunta,
  deletePregunta,
} from '../controllers/preguntaController.js';

const router = express.Router();

router.get('/', getAllPreguntas);
router.get('/:id', getPreguntaById);
router.post('/', createPregunta);
router.put('/:id', updatePregunta);
router.delete('/:id', deletePregunta);

export default router;
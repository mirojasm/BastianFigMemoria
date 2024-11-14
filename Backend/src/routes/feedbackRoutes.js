import express from 'express';
import authMiddleware from '../middleware/auth.js';
import feedbackController from '../controllers/feedbackController.js';

const router = express.Router();

router.get('/general', authMiddleware, feedbackController.getFeedback);
router.get('/elaborado', authMiddleware, feedbackController.getFeedbackElaborado);
router.get('/test-openai', feedbackController.testOpenAI);

export default router;
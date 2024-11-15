import express from 'express';
import authMiddleware from '../middleware/auth.js';
import feedbackController from '../controllers/feedbackController.js';

const router = express.Router();

router.get('/general', authMiddleware, feedbackController.getFeedback);
router.get('/elaborado', authMiddleware, feedbackController.getFeedbackElaborado);
router.get('/test-openai', feedbackController.testOpenAI);
// En feedbackRoutes.js
router.get('/acumulado', authMiddleware, feedbackController.getFeedbackAcumulado);
export default router;
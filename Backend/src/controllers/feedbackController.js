import { FeedbackService } from '../services/feedbackService.js';

const feedbackController = {
    async getFeedback(req, res) {
        try {
            const userId = req.user.id; // Asumiendo que el middleware de auth añade el usuario
            const feedbackService = new FeedbackService();
            const feedback = await feedbackService.generateGeneralFeedback(userId);
            
            res.json(feedback);
        } catch (error) {
            console.error('Error en feedbackController:', error);
            res.status(500).json({
                success: false,
                error: 'Error al generar el feedback',
                details: error.message
            });
        }
    },

    async testOpenAI(req, res) {
        try {
            const feedbackService = new FeedbackService();
            const result = await feedbackService.testOpenAIConnection();
            
            res.json({
                success: true,
                message: 'Conexión con OpenAI exitosa',
                response: result
            });
        } catch (error) {
            console.error('Error en test OpenAI:', error);
            res.status(500).json({
                success: false,
                error: 'Error al conectar con OpenAI',
                details: error.message
            });
        }
    }
};

export default feedbackController;
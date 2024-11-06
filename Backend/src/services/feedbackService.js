import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class FeedbackService {
    constructor() {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY no está configurada');
        }
        
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async generateGeneralFeedback(userId) {
        try {
            if (!userId) {
                throw new Error('userId es requerido');
            }

            // Obtener respuestas individuales
            const respuestasIndividuales = await prisma.respuestas_individuales.findMany({
                where: {
                    usuario_id: userId
                },
                include: {
                    preguntas: true,  // Cambiado de pregunta a preguntas
                    usuarios: true     // Incluimos también usuarios si necesitamos info del usuario
                },
                orderBy: {
                    timestamp: 'asc'
                }
            });

            // Si no hay respuestas individuales, retornar respuesta vacía
            if (!respuestasIndividuales.length) {
                return {
                    feedbackGeneral: "No hay respuestas para analizar aún.",
                    resumenEstadistico: {
                        totalPreguntas: 0,
                        totalInteraccionesColaborativas: 0,
                        promedioMensajesPorPregunta: "0"
                    },
                    preguntasAnalizadas: []
                };
            }

            // Obtener parejas de colaboración
            const parejasColaboracion = await prisma.parejas_colaboracion.findMany({
                where: {
                    OR: [
                        { usuario1_id: userId },
                        { usuario2_id: userId }
                    ]
                }
            });

            const parejasIds = parejasColaboracion.map(p => p.id);

            // Obtener respuestas colaborativas
            const respuestasColaborativas = await prisma.respuestas_finales.findMany({
                where: {
                    pareja_colaboracion_id: {
                        in: parejasIds
                    }
                },
                include: {
                    preguntas: true,  // Cambiado de pregunta a preguntas
                    parejas_colaboracion: {
                        include: {
                            usuarios_parejas_colaboracion_usuario1_idTousuarios: true,
                            usuarios_parejas_colaboracion_usuario2_idTousuarios: true
                        }
                    }
                }
            });

            // Obtener mensajes colaborativos
            const mensajesColaborativos = await prisma.mensajes_chat.findMany({
                where: {
                    usuario_id: userId
                },
                include: {
                    chats_colaborativos: {
                        include: {
                            preguntas: true  // Cambiado de pregunta a preguntas
                        }
                    },
                    usuarios: true
                },
                orderBy: {
                    timestamp: 'asc'
                }
            });

            // Agrupar información
            const preguntasAnalizadas = await this.agruparInformacionPorPregunta(
                respuestasIndividuales,
                respuestasColaborativas,
                mensajesColaborativos
            );

            const prompt = `
                Eres un tutor educativo que analiza el desempeño general de un estudiante.
                Para cada pregunta, el estudiante primero dio una respuesta individual y luego 
                trabajó colaborativamente para dar una respuesta final.
                
                Aquí está el análisis detallado por pregunta:
                
                ${preguntasAnalizadas.map((p, index) => `
                Pregunta ${index + 1}: ${p.pregunta}
                
                Respuesta Individual: ${p.respuestaIndividual || 'No proporcionada'}
                
                Proceso Colaborativo:
                ${p.mensajesColaborativos.length > 0 ? 
                    p.mensajesColaborativos.join('\n') : 
                    'No hubo mensajes colaborativos'}
                
                Respuesta Final Colaborativa: ${p.respuestaColaborativa || 'No proporcionada'}
                `).join('\n---\n')}
                
                Por favor, proporciona un análisis completo que incluya:
                1. Comparación entre respuestas individuales y colaborativas
                2. Evolución del pensamiento del estudiante
                3. Efectividad de la colaboración
                4. Fortalezas principales demostradas
                5. Áreas de oportunidad identificadas
                6. Recomendaciones específicas para mejorar
            `;

            const completion = await this.openai.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: 'gpt-4-0125-preview',
                temperature: 0.7,
                max_tokens: 1500
            });

            return {
                feedbackGeneral: completion.choices[0].message.content,
                resumenEstadistico: {
                    totalPreguntas: preguntasAnalizadas.length,
                    totalInteraccionesColaborativas: mensajesColaborativos.length,
                    promedioMensajesPorPregunta: (mensajesColaborativos.length / preguntasAnalizadas.length).toFixed(2)
                },
                preguntasAnalizadas
            };

        } catch (error) {
            console.error('Error generando feedback:', error);
            throw new Error(`Error al generar el feedback: ${error.message}`);
        }
    }

    async agruparInformacionPorPregunta(respuestasIndividuales, respuestasColaborativas, mensajesColaborativos) {
        const preguntasMap = new Map();

        // Primero agregamos todas las respuestas individuales
        for (const resp of respuestasIndividuales) {
            preguntasMap.set(resp.pregunta_id, {
                pregunta: resp.preguntas?.texto || 'Sin texto de pregunta',  // Cambiado de pregunta a preguntas
                respuestaIndividual: resp.respuesta,
                respuestaColaborativa: '',
                mensajesColaborativos: []
            });
        }

        // Agregamos las respuestas colaborativas
        for (const resp of respuestasColaborativas) {
            if (preguntasMap.has(resp.pregunta_id)) {
                const pregunta = preguntasMap.get(resp.pregunta_id);
                pregunta.respuestaColaborativa = resp.respuesta_final;
            }
        }

        // Agregamos los mensajes colaborativos
        for (const mensaje of mensajesColaborativos) {
            if (mensaje.chats_colaborativos?.preguntas?.id) {
                const preguntaId = mensaje.chats_colaborativos.preguntas.id;
                if (preguntasMap.has(preguntaId)) {
                    const pregunta = preguntasMap.get(preguntaId);
                    pregunta.mensajesColaborativos.push(mensaje.contenido);
                }
            }
        }

        return Array.from(preguntasMap.values());
    }
    async testOpenAIConnection() {
        try {
            const completion = await this.openai.chat.completions.create({
                messages: [{ role: 'user', content: 'Di hola y confirma que la conexión funciona' }],
                model: 'gpt-4-0125-preview',
                max_tokens: 50
            });

            return completion.choices[0].message;
        } catch (error) {
            console.error('Error en test de conexión:', error);
            throw new Error(`Error en la conexión con OpenAI: ${error.message}`);
        }
    }
}

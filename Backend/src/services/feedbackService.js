import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class FeedbackService {
    constructor() {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY no está configurada en las variables de entorno');
        }
        
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async testOpenAIConnection() {
        try {
            const completion = await this.openai.chat.completions.create({
                messages: [{ role: 'user', content: 'Di hola y confirma que la conexión funciona' }],
                model: 'gpt-4o',
                max_tokens: 50
            });

            return completion.choices[0].message;
        } catch (error) {
            console.error('Error en la conexión con OpenAI:', error);
            throw new Error(`Error al conectar con OpenAI: ${error.message}`);
        }
    }

    async generateGeneralFeedback(userId) {
        try {
          // Obtener todas las respuestas individuales del usuario
          const respuestasIndividuales = await prisma.respuestas_individuales.findMany({
            where: {
              usuario_id: userId
            },
            include: {
              pregunta: true
            },
            orderBy: {
              timestamp: 'asc'
            }
          });
    
          // Obtener todas las respuestas colaborativas del usuario
          const respuestasColaborativas = await prisma.respuestas_finales.findMany({
            where: {
              pareja_colaboracion: {
                OR: [
                  { usuario1_id: userId },
                  { usuario2_id: userId }
                ]
              }
            },
            include: {
              pregunta: true,
              pareja_colaboracion: {
                include: {
                  usuario1: true,
                  usuario2: true
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
              chat_colaborativo: {
                include: {
                  pregunta: true
                }
              }
            },
            orderBy: {
              timestamp: 'asc'
            }
          });
    
          // Agrupar toda la información por pregunta
          const preguntasAnalizadas = await this.agruparInformacionPorPregunta(
            respuestasIndividuales,
            respuestasColaborativas,
            mensajesColaborativos
          );
    
          // Generar el prompt para OpenAI
          const prompt = `
            Eres un tutor educativo que analiza el desempeño general de un estudiante.
            Para cada pregunta, el estudiante primero dio una respuesta individual y luego 
            trabajó colaborativamente para dar una respuesta final.
            
            Aquí está el análisis detallado por pregunta:
            
            ${preguntasAnalizadas.map((p, index) => `
            Pregunta ${index + 1}: ${p.pregunta}
            
            Respuesta Individual: ${p.respuestaIndividual}
            
            Proceso Colaborativo:
            ${p.mensajesColaborativos.join('\n')}
            
            Respuesta Final Colaborativa: ${p.respuestaColaborativa}
            `).join('\n---\n')}
            
            Por favor, proporciona un análisis completo que incluya:
            1. Comparación entre respuestas individuales y colaborativas
            2. Evolución del pensamiento del estudiante
            3. Efectividad de la colaboración
            4. Fortalezas principales demostradas
            5. Áreas de oportunidad identificadas
            6. Recomendaciones específicas para mejorar tanto el trabajo individual como colaborativo
            
            Mantén el feedback constructivo y orientado al crecimiento del estudiante.
          `;
    
          // Llamar a la API de OpenAI
          const completion = await openai.chat.completions.create({
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
          console.error('Error generando feedback general:', error);
          throw new Error('Error al generar el feedback general');
        }
      }

      async agruparInformacionPorPregunta(respuestasIndividuales, respuestasColaborativas, mensajesColaborativos) {
        const preguntasMap = new Map();
    
        // Primero agregamos todas las respuestas individuales
        for (const resp of respuestasIndividuales) {
          preguntasMap.set(resp.pregunta_id, {
            pregunta: resp.pregunta.texto,
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
          const preguntaId = mensaje.chat_colaborativo.pregunta_id;
          if (preguntasMap.has(preguntaId)) {
            const pregunta = preguntasMap.get(preguntaId);
            pregunta.mensajesColaborativos.push(mensaje.contenido);
          }
        }
    
        return Array.from(preguntasMap.values());
      }
}

import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mapeo de imágenes para las preguntas 3 y 4
const IMAGEN_PREGUNTAS = {
    3: '/ruta/a/imagen-pregunta3.jpg',
    4: '/ruta/a/imagen-pregunta4.jpg'
};

// Respuestas esperadas para cada pregunta
const RESPUESTAS_ESPERADAS = {
    1: "La IA plantea desafíos éticos en privacidad, equidad y toma de decisiones automatizada.",
    2: "La IA transformará empleos existentes y creará nuevos, requiriendo adaptación educativa.",
    3: "La imagen es una ilustración que muestra a una persona en el agua, aparentemente en peligro y levantando una mano en señal de ayuda. A su alrededor, un grupo de personas en la orilla sostiene sus teléfonos y toma fotos o videos de la situación en lugar de ayudar. ",
    4: "La imagen es una ilustración que muestra a una persona en el agua, aparentemente en peligro y levantando una mano en señal de ayuda. A su alrededor, un grupo de personas en la orilla sostiene sus teléfonos y toma fotos o videos de la situación en lugar de ayudar. ",
    5: "La narradora experimenta la lluvia por primera vez en un patio interior con un naranjo.",
    6: "El texto describe una experiencia personal de descubrimiento y aprendizaje."
};

// Configuración de las preguntas esperadas
const CONFIGURACION_PREGUNTAS = {
    COLABORATIVAS: [1, 2],
    INDIVIDUALES: [3, 4, 5, 6],
    TOTAL_PREGUNTAS: 6
};

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
            // Obtener todas las preguntas existentes para validación
            const todasLasPreguntas = await prisma.preguntas.findMany({
                orderBy: {
                    id: 'asc'
                }
            });

            // 1. Obtener respuestas individuales (preguntas 3-6)
            const respuestasIndividuales = await prisma.respuestas_individuales.findMany({
                where: {
                    usuario_id: userId,
                    pregunta_id: {
                        in: CONFIGURACION_PREGUNTAS.INDIVIDUALES
                    }
                },
                include: {
                    preguntas: true
                },
                orderBy: {
                    pregunta_id: 'asc'
                }
            });

            // 2. Obtener respuestas colaborativas (preguntas 1-2)
            const respuestasColaborativas = await prisma.respuestas_finales.findMany({
                where: {
                    pregunta_id: {
                        in: CONFIGURACION_PREGUNTAS.COLABORATIVAS
                    },
                    parejas_colaboracion: {
                        OR: [
                            { usuario1_id: userId },
                            { usuario2_id: userId }
                        ]
                    }
                },
                include: {
                    preguntas: true,
                    parejas_colaboracion: {
                        include: {
                            usuarios_parejas_colaboracion_usuario1_idTousuarios: true,
                            usuarios_parejas_colaboracion_usuario2_idTousuarios: true
                        }
                    }
                },
                orderBy: {
                    pregunta_id: 'asc'
                }
            });
             // Validar que tengamos todas las respuestas necesarias
             const respuestasIndividualesIds = respuestasIndividuales.map(r => r.pregunta_id);
             const respuestasColaborativasIds = respuestasColaborativas.map(r => r.pregunta_id);
 
             const faltantesIndividuales = CONFIGURACION_PREGUNTAS.INDIVIDUALES.filter(
                 id => !respuestasIndividualesIds.includes(id)
             );
             const faltantesColaborativas = CONFIGURACION_PREGUNTAS.COLABORATIVAS.filter(
                 id => !respuestasColaborativasIds.includes(id)
             );
 
             if (faltantesIndividuales.length > 0 || faltantesColaborativas.length > 0) {
                 return {
                     error: true,
                     mensaje: 'Respuestas incompletas',
                     faltantes: {
                         individuales: faltantesIndividuales,
                         colaborativas: faltantesColaborativas
                     },
                     totalRespuestas: {
                         esperadas: CONFIGURACION_PREGUNTAS.TOTAL_PREGUNTAS,
                         encontradas: respuestasIndividuales.length + respuestasColaborativas.length
                     }
                 };
             }
            // Procesar todas las preguntas
            /* const preguntasAnalizadas = [
                ...this.procesarRespuestasColaborativas(respuestasColaborativas, userId),
                ...this.procesarRespuestasIndividuales(respuestasIndividuales)
            ]; */
            // Procesar todas las preguntas
            const preguntasAnalizadas = [
                ...this.procesarRespuestasColaborativas(respuestasColaborativas, userId),
                ...this.procesarRespuestasIndividuales(respuestasIndividuales)
            ].sort((a, b) => a.preguntaId - b.preguntaId);

            // Texto del contexto para las preguntas 5-6
            const textoContexto = `La primera vez que vi la lluvia fue una tarde de verano en un patio interior. Ese patio era un mundo completo, con una fuente de pajaros en el centro, muchas flores y un viejo naranjo con el tronco blanco. Yo me hallaba contenta contemplando aquel árbol tan raro, cuyas hojas eran como una sustancia verde y tenía algunas frutas tan grandes y redondas como bolas de billar. De pronto escuché un ruido  sobre los techos de las casas vecinas, el cielo se oscureció y empezaron a caer gotas de agua fría, después fue un diluvio. Aquello me pareció extraordinario, un sonido aterrador y maravilloso. El patio se inundó de inmediato, los caminos se convirtieron en pequeños lagos, el naranjo sacudía sus ramas mojadas y enormes gotas rebotaban en el suelo y sobre la fuente. Me acurruqué en un rincón, me encontraba con miedo porque creí que el mundo se estaba rompiendo. Mi madre me tomó en sus brazos para tranquilizarme, me asomó al patio y me dijo que no tuviera miedo, que eso era sólo la lluvia, un fenómeno natural tan lindo como el sol.`;
            // Verificar que tenemos el número correcto de preguntas analizadas
            if (preguntasAnalizadas.length !== CONFIGURACION_PREGUNTAS.TOTAL_PREGUNTAS) {
                console.warn(`Número incorrecto de preguntas analizadas. Esperadas: ${CONFIGURACION_PREGUNTAS.TOTAL_PREGUNTAS}, Encontradas: ${preguntasAnalizadas.length}`);
            }
            const prompt = `
                Eres un docente que proporciona feedback básico sobre las respuestas de los estudiantes.
                Tu tarea es simplemente indicar si cada respuesta es correcta o incorrecta, basándote en las respuestas esperadas, pero tomalo como referencia solamente.
                
                Aquí están las preguntas, las preguntas 1 y 2 son de caracter colaborativo, la pregunta se basa en una pregunta de evaluacion mientras que la pregunta 2 es de metacognicion  y respuestas del estudiante:
                
                ${preguntasAnalizadas.map((p) => `
                Pregunta ${p.preguntaId}: ${p.pregunta}
                ${[3, 4].includes(p.preguntaId) ? 
                    `\nContexto: La imagen es una ilustración que muestra a una persona en el agua, aparentemente en peligro y levantando una mano en señal de ayuda. A su alrededor, un grupo de personas en la orilla sostiene sus teléfonos y toma fotos o videos de la situación en lugar de ayudar.` : ''}
                ${[5, 6].includes(p.preguntaId) ? 
                    `\nContexto: ${textoContexto}` : ''}
                
                Respuesta esperada: ${RESPUESTAS_ESPERADAS[p.preguntaId]}
                Respuesta del estudiante: ${p.tipo === 'individual' ? 
                    p.respuestaIndividual : 
                    p.respuestaFinal}
                `).join('\n---\n')}
                
                Por favor, proporciona un feedback simple indicando únicamente:
                1. Si cada respuesta es correcta o incorrecta
                2. El número total de respuestas correctas
                
                Mantén el feedback breve y directo, sin explicaciones detalladas.
            `;

            const completion = await this.openai.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: 'gpt-4-0613',
                temperature: 0.3,
                max_tokens: 500
            });

            return {
                feedbackGeneral: completion.choices[0].message.content,
                resumenEstadistico: {
                    totalPreguntas: CONFIGURACION_PREGUNTAS.TOTAL_PREGUNTAS,
                    preguntasIndividuales: respuestasIndividuales.length,
                    preguntasColaborativas: respuestasColaborativas.length,
                    preguntasAnalizadas: preguntasAnalizadas.length
                },
                preguntasAnalizadas
            };

        } catch (error) {
            console.error('Error generando feedback:', error);
            throw new Error(`Error al generar el feedback: ${error.message}`);
        }
    }

    procesarRespuestasIndividuales(respuestas) {
        return respuestas.map(resp => ({
            preguntaId: resp.pregunta_id,
            pregunta: resp.preguntas?.texto || 'Sin texto de pregunta',
            respuestaIndividual: resp.respuesta,
            tipo: 'individual'
        }));
    }

    procesarRespuestasColaborativas(respuestas, userId) {
        return respuestas.map(resp => {
            const pareja = resp.parejas_colaboracion;
            const esUsuario1 = pareja.usuario1_id === userId;
            
            const compañero = esUsuario1
                ? pareja.usuarios_parejas_colaboracion_usuario2_idTousuarios?.nombre
                : pareja.usuarios_parejas_colaboracion_usuario1_idTousuarios?.nombre;

            return {
                preguntaId: resp.pregunta_id,
                pregunta: resp.preguntas?.texto || 'Sin texto de pregunta',
                respuestaFinal: resp.respuesta_final,
                tipo: 'colaborativa',
                compañero: compañero || 'Compañero no asignado',
                rolEstudiante: esUsuario1 ? 'Usuario 1' : 'Usuario 2'
            };
        });
    }

    async testOpenAIConnection() {
        try {
            const completion = await this.openai.chat.completions.create({
                messages: [{ role: 'user', content: 'Di hola y confirma que la conexión funciona y dime con que modelo estoy interactuando' }],
                model: 'gpt-4o',
                max_tokens: 50
            });

            return completion.choices[0].message;
        } catch (error) {
            console.error('Error en test de conexión:', error);
            throw new Error(`Error en la conexión con OpenAI: ${error.message}`);
        }
    }
}

// acaaaaaa no lo he cambiado
import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


// Respuestas esperadas para cada pregunta
const RESPUESTAS_ESPERADAS = {
    1: "Creo que tanto las personas como las empresas deberían estar dispuestas a dejar de lado algunas comodidades para cuidar el medio ambiente. ",
    2: "La Rana podría haber pasado tiempo reflexionando sobre sus propias cualidades y entendiendo lo que la hacía única, sin necesitar que otros le dijeran cómo debía ser.",
    3: "La imagen es una ilustración que muestra a una persona en el agua, aparentemente en peligro y levantando una mano en señal de ayuda. A su alrededor, un grupo de personas en la orilla sostiene sus teléfonos y toma fotos o videos de la situación en lugar de ayudar. ",
    4: "La imagen es una ilustración que muestra a una persona en el agua, aparentemente en peligro y levantando una mano en señal de ayuda. A su alrededor, un grupo de personas en la orilla sostiene sus teléfonos y toma fotos o videos de la situación en lugar de ayudar. ",
    5: "La narradora experimenta la lluvia por primera vez en un patio interior con un naranjo, lo cual puede parecer bien o mal mientras se responda la pregunta",
    6: "El texto describe una experiencia personal de descubrimiento y aprendizaje."
};
// Agregar contexto adicional solo para el feedback acumulado
const CONTEXTO_EXTENDIDO = {
    1: {
        tipo: "evaluacion",
        tematica: "Medio ambiente y responsabilidad social",
        habilidades: ["Análisis crítico", "Evaluación de impacto", "Toma de decisiones"],
        aspectos_clave: ["Equilibrio entre comodidad y responsabilidad", "Impacto ambiental", "Compromiso social"]
    },
    2: {
        tipo: "metacognicion",
        tematica: "Identidad y autenticidad",
        habilidades: ["Reflexión personal", "Análisis de motivaciones", "Pensamiento independiente"],
        aspectos_clave: ["Autoconocimiento", "Presión social", "Valores personales"]
    },
    3: {
        tipo: "analisis_imagen",
        tematica: "Comportamiento social y tecnología",
        habilidades: ["Interpretación visual", "Análisis de comportamiento social", "Juicio ético"],
        aspectos_clave: ["Responsabilidad social", "Uso de tecnología", "Empatía"]
    },
    4: {
        tipo: "analisis_imagen",
        tematica: "Comportamiento social y tecnología",
        habilidades: ["Interpretación visual", "Análisis de comportamiento social", "Juicio ético"],
        aspectos_clave: ["Responsabilidad social", "Uso de tecnología", "Empatía"]
    },
    5: {
        tipo: "comprension_lectora",
        tematica: "Experiencias personales y percepción",
        habilidades: ["Interpretación textual", "Análisis de experiencias", "Comprensión emocional"],
        aspectos_clave: ["Perspectiva personal", "Experiencia sensorial", "Memoria y emoción"]
    },
    6: {
        tipo: "comprension_lectora",
        tematica: "Experiencias personales y aprendizaje",
        habilidades: ["Interpretación textual", "Análisis narrativo", "Reflexión personal"],
        aspectos_clave: ["Experiencia personal", "Proceso de aprendizaje", "Descubrimiento"]
    }
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

    //para guardar feedback en la bdd
    // Método para verificar y generar feedbacks si es necesario
    async ensureAllFeedbacksExist(userId) {
        try {
            // Verificar si ya existen los feedbacks para este usuario
            const existingFeedbacks = await prisma.feedback_usuario.findMany({
                where: {
                    usuario_id: userId,
                    timestamp: {
                        // Verifica feedbacks generados en las últimas 24 horas
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                }
            });

            const existingTypes = existingFeedbacks.map(f => f.tipo_feedback);
            const needsGeneration = !['general', 'elaborado', 'acumulado'].every(
                type => existingTypes.includes(type)
            );

            if (needsGeneration) {
                // Generar todos los feedbacks que faltan
                const [generalFeedback, elaboratedFeedback, accumulatedFeedback] = await Promise.all([
                    this.generateGeneralFeedback(userId),
                    this.generateElaboratedFeedback(userId),
                    this.generateAccumulatedFeedback(userId)
                ]);

                // Guardar los feedbacks faltantes
                await prisma.$transaction(async (prisma) => {
                    if (!existingTypes.includes('general')) {
                        await prisma.feedback_usuario.create({
                            data: {
                                usuario_id: userId,
                                tipo_feedback: 'general',
                                contenido: generalFeedback.feedbackGeneral
                            }
                        });
                    }

                    if (!existingTypes.includes('elaborado')) {
                        await prisma.feedback_usuario.create({
                            data: {
                                usuario_id: userId,
                                tipo_feedback: 'elaborado',
                                contenido: elaboratedFeedback.feedbackElaborado
                            }
                        });
                    }

                    if (!existingTypes.includes('acumulado')) {
                        await prisma.feedback_usuario.create({
                            data: {
                                usuario_id: userId,
                                tipo_feedback: 'acumulado',
                                contenido: accumulatedFeedback.feedbackAcumulado
                            }
                        });
                    }
                });
            }

            return true;
        } catch (error) {
            console.error('Error verificando/generando feedbacks:', error);
            throw error;
        }
    }
    // Métodos actualizados para obtener cada tipo de feedback
    async getGeneralFeedback(userId) {
        await this.ensureAllFeedbacksExist(userId);
        
        const feedback = await prisma.feedback_usuario.findFirst({
            where: {
                usuario_id: userId,
                tipo_feedback: 'general'
            },
            orderBy: {
                timestamp: 'desc'
            }
        });

        return feedback;
    }

    async generateAccumulatedFeedback(userId) {
        try {
            if (!userId) {
                throw new Error('userId es requerido');
            }
    
            // Verificar si ya existe un feedback acumulado reciente (últimas 24 horas)
            const existingFeedback = await prisma.feedback_usuario.findFirst({
                where: {
                    usuario_id: userId,
                    tipo_feedback: 'acumulado',
                    timestamp: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                },
                orderBy: {
                    timestamp: 'desc'
                }
            });
    
            // Si existe un feedback reciente, retornarlo
            if (existingFeedback) {
                return {
                    feedbackAcumulado: existingFeedback.contenido,
                    timestamp: existingFeedback.timestamp,
                    fromCache: true
                };
            }
    
            // Obtener respuestas individuales
            const respuestasIndividuales = await prisma.respuestas_individuales.findMany({
                where: {
                    usuario_id: userId
                },
                include: {
                    preguntas: true
                },
                orderBy: {
                    pregunta_id: 'asc'
                }
            });
    
            // Obtener respuestas colaborativas con chat
            /* const respuestasColaborativas = await prisma.respuestas_finales.findMany({
                where: {
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
                            usuarios_parejas_colaboracion_usuario2_idTousuarios: true,
                            chats_colaborativos: {
                                include: {
                                    mensajes_chat: {
                                        orderBy: {
                                            timestamp: 'asc'
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    pregunta_id: 'asc'
                }
            }); */
            const respuestasColaborativas = await this.obtenerRespuestasColaborativas(userId);
            // Validaciones
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
    
            // Procesar preguntas con contexto extendido
            const preguntasAnalizadas = [
                ...this.procesarRespuestasColaborativasConChat(respuestasColaborativas, userId),
                ...this.procesarRespuestasIndividuales(respuestasIndividuales)
            ].sort((a, b) => a.preguntaId - b.preguntaId);
            
            const tiemposRespuesta = this.analizarTiemposRespuesta(preguntasAnalizadas);
            // Analizar patrones
            const patrones = this.analizarPatronesRespuesta(preguntasAnalizadas);
    
            const prompt = `
                Eres un docente experto que proporciona feedback sobre las respuestas de los estudiantes que se encuentran en el curso de primero medio en la educación chilena.
                Tu tarea es ayudar a los estudiantes a mejorar su pensamiento crítico, dando una respuesta detallada y personalizada. Esto basándose en las respuestas esperadas que se proporcionan, 
                no obstante, solo tomalo como referencia. También debes dar  una respuesta que  proporcione lo siguiente:

                1.Análisis detallado de cada respuesta
                2.Aspectos positivos en cada respuesta
                3.En las preguntas colaborativas, haz comentarios si el diálogo del chat colaborativo ayudó a tener una mejor respuesta.
                4.Observaciones de las habilidades de pensamiento crítico en las respuestas
                5.Sugerencias de mejoras específicas
                6.Patrones identificados en el estilo de respuesta del estudiante
                7.Recomendación personalizada basada en el estudiante
                8.Observar y dar comentarios sobre el tiempo que conllevo a responder cada pregunta.
                9.Relación entre tiempo dedicado y calidad de las respuestas

                A continuación se encuentra el contexto de las preguntas colaborativas 1 y 2, ambas tratan 
                sobre el siguiente texto:
                Había una vez una Rana que quería ser una Rana auténtica, y
                todos los días se esforzaba en ello.
                Al principio se compró un espejo en el que se miraba largamente
                buscando su ansiada autenticidad.
                Unas veces parecía encontrarla y otras no, según el humor de
                ese día o de la hora, hasta que se cansó de esto y guardó el espejo
                en un baúl.
                Por fin pensó que la única forma de conocer su propio valor estaba en la opinión de la gente, y comenzó a peinarse y a vestirse y a
                desvestirse (cuando no le quedaba otro recurso) para saber si los
                demás la aprobaban y reconocían que era una Rana auténtica.
                Un día observó que lo que más admiraban de ella era su cuerpo,
                especialmente sus piernas, de manera que se dedicó a hacer sentadillas y a saltar para tener unas ancas cada vez mejores, y sentía
                que todos la aplaudían.
                Y así seguía haciendo esfuerzos hasta que, dispuesta a cualquier cosa para lograr que la consideraran una Rana auténtica, se
                dejaba arrancar las ancas, y los otros se las comían, y ella todavía
                alcanzaba a oír con amargura cuando decían que qué buena Rana,
                que parecía Pollo.


                Acá también te proporciono información de los posibles patrones.
                ${JSON.stringify(patrones, null, 2)}
    
                Un contexto extendido de las preguntas.
                ${preguntasAnalizadas.map((p) => `
                Pregunta ${p.preguntaId}: ${p.pregunta}
                Contexto: ${JSON.stringify(CONTEXTO_EXTENDIDO[p.preguntaId], null, 2)}
                Aca estan las preguntas, además para las preguntas 3,4 y 5,6 con sus respectivos contextos
                ${[3, 4].includes(p.preguntaId) ? 
                    `\nContexto: La imagen es una ilustración que muestra a una persona en el agua, aparentemente en peligro y levantando una mano en señal de ayuda. A su alrededor, un grupo de personas en la orilla sostiene sus teléfonos y toma fotos o videos de la situación en lugar de ayudar.` : ''}
                ${[5, 6].includes(p.preguntaId) ? 
                    `\nContexto: La primera vez que vi la lluvia fue una tarde de verano en un patio interior. Ese patio era un mundo completo, con una fuente de pajaros en el centro, muchas flores y un viejo naranjo con el tronco blanco. Yo me hallaba contenta contemplando aquel árbol tan raro, cuyas hojas eran como una sustancia verde y tenía algunas frutas tan grandes y redondas como bolas de billar. De pronto escuché un ruido  sobre los techos de las casas vecinas, el cielo se oscureció y empezaron a caer gotas de agua fría, después fue un diluvio. Aquello me pareció extraordinario, un sonido aterrador y maravilloso. El patio se inundó de inmediato, los caminos se convirtieron en pequeños lagos, el naranjo sacudía sus ramas mojadas y enormes gotas rebotaban en el suelo y sobre la fuente. Me acurruqué en un rincón, me encontraba con miedo porque creí que el mundo se estaba rompiendo. Mi madre me tomó en sus brazos para tranquilizarme, me asomó al patio y me dijo que no tuviera miedo, que eso era sólo la lluvia, un fenómeno natural tan lindo como el sol.` : ''}
                
                Acá están las respuestas esperadas y las respuestas del estudiante para cada pregunta.
                Respuesta esperada: ${RESPUESTAS_ESPERADAS[p.preguntaId]}
                Respuesta del estudiante: ${p.tipo === 'individual' ? p.respuestaIndividual : p.respuestaFinal}
                ${p.tipo === 'colaborativa' && p.historialChat ? `
                Acá están las conversaciones de los estudiantes, durante las preguntas colaborativas.
                ${p.historialChat.map(msg => `${msg.emisor}: ${msg.mensaje}`).join('\n')}
                ` : ''}
                `).join('\n---\n')}
    
                Acá están los tiempos que se demoran los estudiantes en responder cada pregunta.
                - Tiempo promedio individual: ${Math.round(tiemposRespuesta.promedioIndividual)} segundos
                - Tiempo promedio colaborativo: ${Math.round(tiemposRespuesta.promedioColaborativo)} segundos
                - Preguntas más rápidas: ${tiemposRespuesta.preguntasMasRapidas.map(p => 
                    `Pregunta ${p.preguntaId} (${p.tipo}): ${p.tiempo} segundos`).join(', ')}
                - Preguntas más lentas: ${tiemposRespuesta.preguntasMasLentas.map(p => 
                    `Pregunta ${p.preguntaId} (${p.tipo}): ${p.tiempo} segundos`).join(', ')}
                
                Mantén una actitud constructiva, motivadora y destacando las fortalezas como mejoras en el estudiante.
            `;
    
            const completion = await this.openai.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: 'gpt-4-0613',
                temperature: 0.7,
                max_tokens: 2000
            });
    
            const feedbackContent = completion.choices[0].message.content;
    
            // Guardar el nuevo feedback en la base de datos
            const savedFeedback = await prisma.feedback_usuario.create({
                data: {
                    usuario_id: userId,
                    tipo_feedback: 'acumulado',
                    contenido: feedbackContent
                }
            });
    
            return {
                feedbackAcumulado: feedbackContent,
                timestamp: savedFeedback.timestamp,
                resumenEstadistico: {
                    totalPreguntas: CONFIGURACION_PREGUNTAS.TOTAL_PREGUNTAS,
                    preguntasIndividuales: respuestasIndividuales.length,
                    preguntasColaborativas: respuestasColaborativas.length,
                    preguntasAnalizadas: preguntasAnalizadas.length
                },
                preguntasAnalizadas,
                patrones,
                fromCache: false
            };
    
        } catch (error) {
            console.error('Error generando feedback acumulado:', error);
            throw new Error(`Error al generar el feedback acumulado: ${error.message}`);
        }
    }
    
    analizarPatronesRespuesta(preguntas) {
        let patrones = {
            longitudPromedio: 0,
            usoPensamientoCritico: 0,
            participacionColaborativa: 0,
            fundamentacion: 0,
            consistenciaArgumentativa: 0
        };

        preguntas.forEach(p => {
            const respuesta = p.tipo === 'individual' ? p.respuestaIndividual : p.respuestaFinal;
            
            // Análisis de longitud
            patrones.longitudPromedio += respuesta.length;

            // Análisis de pensamiento crítico
            const palabrasCriticas = ['porque', 'ya que', 'debido a', 'por lo tanto', 'sin embargo', 'aunque'];
            palabrasCriticas.forEach(palabra => {
                if (respuesta.toLowerCase().includes(palabra)) {
                    patrones.usoPensamientoCritico++;
                }
            });

            // Análisis de fundamentación
            const indicadoresFundamentacion = ['por ejemplo', 'como se ve en', 'esto se evidencia', 'según'];
            indicadoresFundamentacion.forEach(ind => {
                if (respuesta.toLowerCase().includes(ind)) {
                    patrones.fundamentacion++;
                }
            });

            // Análisis de participación colaborativa
            if (p.tipo === 'colaborativa' && p.historialChat) {
                patrones.participacionColaborativa += p.historialChat.filter(
                    msg => msg.emisor === 'Estudiante'
                ).length;
            }

            // Análisis de consistencia argumentativa
            const estructurasArgumentativas = [
                'en primer lugar', 'en segundo lugar', 'por un lado', 'por otro lado',
                'en conclusión', 'en resumen', 'finalmente'
            ];
            estructurasArgumentativas.forEach(estructura => {
                if (respuesta.toLowerCase().includes(estructura)) {
                    patrones.consistenciaArgumentativa++;
                }
            });
        });

        // Normalizar valores
        const totalPreguntas = preguntas.length;
        patrones.longitudPromedio = Math.round(patrones.longitudPromedio / totalPreguntas);
        patrones.usoPensamientoCritico = Math.round((patrones.usoPensamientoCritico / totalPreguntas) * 10);
        patrones.fundamentacion = Math.round((patrones.fundamentacion / totalPreguntas) * 10);
        patrones.participacionColaborativa = Math.min(10, Math.round(patrones.participacionColaborativa / 2));
        patrones.consistenciaArgumentativa = Math.round((patrones.consistenciaArgumentativa / totalPreguntas) * 10);

        return patrones;
    }
    async generateGeneralFeedback(userId) {
        try {
            if (!userId) {
                throw new Error('userId es requerido');
            }
    
            // Verificar si ya existe un feedback general reciente (últimas 24 horas)
            const existingFeedback = await prisma.feedback_usuario.findFirst({
                where: {
                    usuario_id: userId,
                    tipo_feedback: 'general',
                    timestamp: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                },
                orderBy: {
                    timestamp: 'desc'
                }
            });
    
            // Si existe un feedback reciente, retornarlo
            if (existingFeedback) {
                return {
                    feedbackGeneral: existingFeedback.contenido,
                    timestamp: existingFeedback.timestamp,
                    fromCache: true
                };
            }
    
            // Si no existe, continuar con la generación del feedback
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
                Eres un docente experto que proporciona feedback sobre las respuestas de los estudiantes que se encuentran en el curso de primero medio en la educación chilena.
                Tu tarea es indicar si cada respuesta es correcta o incorrecta, junto con una pequeña justificación. Esto basándose en las respuestas esperadas que se proporcionan, no obstante, solo tomalo como referencia.
                También es ayudar a los estudiantes a mejorar sus habilidad de pensamiento crítico, dando una respuesta que  proporcione lo siguiente:
                1. Si cada respuesta es correcta o incorrecta
                2. Una breve explicación del porqué están correctas o incorrectas las respuestas del estudiante.

                
                A continuación se encuentra el contexto de las preguntas colaborativas 1 y 2, ambas tratan sobre el siguiente texto:

                Había una vez una Rana que quería ser una Rana auténtica, y
                todos los días se esforzaba en ello.
                Al principio se compró un espejo en el que se miraba largamente
                buscando su ansiada autenticidad.
                Unas veces parecía encontrarla y otras no, según el humor de
                ese día o de la hora, hasta que se cansó de esto y guardó el espejo
                en un baúl.
                Por fin pensó que la única forma de conocer su propio valor estaba en la opinión de la gente, y comenzó a peinarse y a vestirse y a
                desvestirse (cuando no le quedaba otro recurso) para saber si los
                demás la aprobaban y reconocían que era una Rana auténtica.
                Un día observó que lo que más admiraban de ella era su cuerpo,
                especialmente sus piernas, de manera que se dedicó a hacer sentadillas y a saltar para tener unas ancas cada vez mejores, y sentía
                que todos la aplaudían.
                Y así seguía haciendo esfuerzos hasta que, dispuesta a cualquier cosa para lograr que la consideraran una Rana auténtica, se
                dejaba arrancar las ancas, y los otros se las comían, y ella todavía
                alcanzaba a oír con amargura cuando decían que qué buena Rana,
                que parecía Pollo. 
                Aca estan las preguntas, además para las preguntas 3,4 y 5,6 con sus respectivos contextos
                
                ${preguntasAnalizadas.map((p) => `
                Pregunta ${p.preguntaId}: ${p.pregunta}
                ${[3, 4].includes(p.preguntaId) ? 
                    `\nContexto: La imagen es una ilustración que muestra a una persona en el agua, aparentemente en peligro y levantando una mano en señal de ayuda. A su alrededor, un grupo de personas en la orilla sostiene sus teléfonos y toma fotos o videos de la situación en lugar de ayudar.` : ''}
                ${[5, 6].includes(p.preguntaId) ? 
                    `\nContexto: ${textoContexto}` : ''}
                Acá están las respuestas esperadas y las respuestas del estudiante para cada pregunta.
                Respuesta esperada: ${RESPUESTAS_ESPERADAS[p.preguntaId]}
                Respuesta del estudiante: ${p.tipo === 'individual' ? 
                    p.respuestaIndividual : 
                    p.respuestaFinal}
                `).join('\n---\n')}
                
                Mantén una actitud  constructiva y  motivadora.

            `;
    
            const completion = await this.openai.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: 'gpt-4-0613',
                temperature: 0.3,
                max_tokens: 600
            });
    
            const feedbackContent = completion.choices[0].message.content;
    
            // Guardar el nuevo feedback en la base de datos
            const savedFeedback = await prisma.feedback_usuario.create({
                data: {
                    usuario_id: userId,
                    tipo_feedback: 'general',
                    contenido: feedbackContent
                }
            });
    
            return {
                feedbackGeneral: feedbackContent,
                timestamp: savedFeedback.timestamp,
                resumenEstadistico: {
                    totalPreguntas: CONFIGURACION_PREGUNTAS.TOTAL_PREGUNTAS,
                    preguntasIndividuales: respuestasIndividuales.length,
                    preguntasColaborativas: respuestasColaborativas.length,
                    preguntasAnalizadas: preguntasAnalizadas.length
                },
                preguntasAnalizadas,
                fromCache: false
            };
    
        } catch (error) {
            console.error('Error generando feedback:', error);
            throw new Error(`Error al generar el feedback: ${error.message}`);
        }
    }

    /* procesarRespuestasIndividuales(respuestas) {
        return respuestas.map(resp => ({
            preguntaId: resp.pregunta_id,
            pregunta: resp.preguntas?.texto || 'Sin texto de pregunta',
            respuestaIndividual: resp.respuesta,
            tipo: 'individual'
        }));
    } */
        procesarRespuestasIndividuales(respuestas) {
            return respuestas.map(resp => ({
                preguntaId: resp.pregunta_id,
                pregunta: resp.preguntas?.texto || 'Sin texto de pregunta',
                respuestaIndividual: resp.respuesta,
                tipo: 'individual',
                tiempoRespuesta: resp.tiempo_respuesta || null,
                inicioRespuesta: resp.inicio_respuesta || null,
                finRespuesta: resp.fin_respuesta || null
            }));
        }

   /*  procesarRespuestasColaborativas(respuestas, userId) {
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
    } */
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
                    rolEstudiante: esUsuario1 ? 'Usuario 1' : 'Usuario 2',
                    tiempoRespuesta: resp.tiempo_respuesta || null,
                    inicioRespuesta: resp.inicio_respuesta || null,
                    finRespuesta: resp.fin_respuesta || null
                };
            });
        }
    // Método para obtener respuestas colaborativas
async obtenerRespuestasColaborativas(userId) {
    try {
        const respuestas = await prisma.respuestas_finales.findMany({
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
                        usuarios_parejas_colaboracion_usuario2_idTousuarios: true,
                        chats_colaborativos: {
                            where: {
                                pregunta_id: {
                                    in: CONFIGURACION_PREGUNTAS.COLABORATIVAS
                                }
                            },
                            include: {
                                mensajes_chat: {
                                    orderBy: {
                                        timestamp: 'asc'
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: {
                pregunta_id: 'asc'
            }
        });

        return respuestas;
    } catch (error) {
        console.error('Error obteniendo respuestas colaborativas:', error);
        throw error;
    }
}
    async generateElaboratedFeedback(userId) {
        try {
            if (!userId) {
                throw new Error('userId es requerido');
            }
    
            // Primero, verificar si ya existe un feedback elaborado reciente (últimas 24 horas)
            const existingFeedback = await prisma.feedback_usuario.findFirst({
                where: {
                    usuario_id: userId,
                    tipo_feedback: 'elaborado',
                    timestamp: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                },
                orderBy: {
                    timestamp: 'desc'
                }
            });
    
            // Si existe un feedback reciente, retornarlo
            if (existingFeedback) {
                return {
                    feedbackElaborado: existingFeedback.contenido,
                    timestamp: existingFeedback.timestamp,
                    fromCache: true // Indicador de que viene de la base de datos
                };
            }
    
            // Si no existe, continuar con la generación del feedback
            // Obtener respuestas individuales
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
            
            // Obtener respuestas colaborativas con historial de chat
           /*  const respuestasColaborativas = await prisma.respuestas_finales.findMany({
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
                            usuarios_parejas_colaboracion_usuario2_idTousuarios: true,
                            chats_colaborativos: {
                                include: {
                                    mensajes_chat: {
                                        orderBy: {
                                            timestamp: 'asc'
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    pregunta_id: 'asc'
                }
            }); */
            const respuestasColaborativas = await this.obtenerRespuestasColaborativas(userId);
            // Validar respuestas completas
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
    
            // Procesar las preguntas con el historial del chat
            const preguntasAnalizadas = [
                ...this.procesarRespuestasColaborativasConChat(respuestasColaborativas, userId),
                ...this.procesarRespuestasIndividuales(respuestasIndividuales)
            ].sort((a, b) => a.preguntaId - b.preguntaId);
            
            const tiemposRespuesta = this.analizarTiemposRespuesta(preguntasAnalizadas);
            const textoContexto = `La primera vez que vi la lluvia fue una tarde de verano en un patio interior. Ese patio era un mundo completo, con una fuente de pajaros en el centro, muchas flores y un viejo naranjo con el tronco blanco. Yo me hallaba contenta contemplando aquel árbol tan raro, cuyas hojas eran como una sustancia verde y tenía algunas frutas tan grandes y redondas como bolas de billar. De pronto escuché un ruido  sobre los techos de las casas vecinas, el cielo se oscureció y empezaron a caer gotas de agua fría, después fue un diluvio. Aquello me pareció extraordinario, un sonido aterrador y maravilloso. El patio se inundó de inmediato, los caminos se convirtieron en pequeños lagos, el naranjo sacudía sus ramas mojadas y enormes gotas rebotaban en el suelo y sobre la fuente. Me acurruqué en un rincón, me encontraba con miedo porque creí que el mundo se estaba rompiendo. Mi madre me tomó en sus brazos para tranquilizarme, me asomó al patio y me dijo que no tuviera miedo, que eso era sólo la lluvia, un fenómeno natural tan lindo como el sol.`;
    
            const prompt = `
                Eres un docente experto que proporciona feedback sobre las respuestas de los estudiantes que se encuentran en el curso de primero medio en la educación chilena.
                Tu tarea es ayudar a los estudiantes a mejorar su pensamiento crítico, dando una respuesta detallada. Esto basándose en las respuestas esperadas que se proporcionan, 
                no obstante, solo tomalo como referencia. También debes dar  una respuesta que  proporcione lo siguiente:

                1.Análisis detallado de cada respuesta
                2.Aspectos positivos en cada respuesta
                3.En las preguntas colaborativas, haz comentarios si el diálogo del chat colaborativo ayudó a tener una mejor respuesta.
                4.Observar y dar comentarios sobre el tiempo que conllevo a responder cada pregunta.
                5.Sugerencias para mejorar
                6.Recomendaciones generales para futuras actividades.

                A continuación se encuentra el contexto de las preguntas colaborativas 1 y 2, ambas tratan sobre el siguiente texto:

                Había una vez una Rana que quería ser una Rana auténtica, y
                todos los días se esforzaba en ello.
                Al principio se compró un espejo en el que se miraba largamente
                buscando su ansiada autenticidad.
                Unas veces parecía encontrarla y otras no, según el humor de
                ese día o de la hora, hasta que se cansó de esto y guardó el espejo
                en un baúl.
                Por fin pensó que la única forma de conocer su propio valor estaba en la opinión de la gente, y comenzó a peinarse y a vestirse y a
                desvestirse (cuando no le quedaba otro recurso) para saber si los
                demás la aprobaban y reconocían que era una Rana auténtica.
                Un día observó que lo que más admiraban de ella era su cuerpo,
                especialmente sus piernas, de manera que se dedicó a hacer sentadillas y a saltar para tener unas ancas cada vez mejores, y sentía
                que todos la aplaudían.
                Y así seguía haciendo esfuerzos hasta que, dispuesta a cualquier cosa para lograr que la consideraran una Rana auténtica, se
                dejaba arrancar las ancas, y los otros se las comían, y ella todavía
                alcanzaba a oír con amargura cuando decían que qué buena Rana,
                que parecía Pollo.

                Aca estan las preguntas, además para las preguntas 3,4 y 5,6 con sus respectivos contextos

                ${preguntasAnalizadas.map((p) => `
                Pregunta ${p.preguntaId}: ${p.pregunta}
                ${[3, 4].includes(p.preguntaId) ? 
                    `\nContexto: La imagen es una ilustración que muestra a una persona en el agua, aparentemente en peligro y levantando una mano en señal de ayuda. A su alrededor, un grupo de personas en la orilla sostiene sus teléfonos y toma fotos o videos de la situación en lugar de ayudar.` : ''}
                ${[5, 6].includes(p.preguntaId) ? 
                    `\nContexto: ${textoContexto}` : ''}

                Acá están las respuestas esperadas y las respuestas del estudiante para cada pregunta.

                Respuesta esperada: ${RESPUESTAS_ESPERADAS[p.preguntaId]}
                Respuesta del estudiante: ${p.tipo === 'individual' ? p.respuestaIndividual : p.respuestaFinal}
                ${p.tipo === 'colaborativa' && p.historialChat ? `
                Acá están las conversaciones de los estudiantes, durante las preguntas colaborativas.
                ${p.historialChat.map(msg => `${msg.emisor}: ${msg.mensaje}`).join('\n')}
                ` : ''}
                `).join('\n---\n')}

                Acá están los tiempos que se demoran los estudiantes en responder cada pregunta.

                - Tiempo promedio en preguntas individuales: ${Math.round(tiemposRespuesta.promedioIndividual)} segundos
                - Tiempo promedio en preguntas colaborativas: ${Math.round(tiemposRespuesta.promedioColaborativo)} segundos
                - Preguntas más rápidas: ${tiemposRespuesta.preguntasMasRapidas.map(p => 
                    `Pregunta ${p.preguntaId} (${p.tipo}): ${p.tiempo} segundos`).join(', ')}
                - Preguntas más lentas: ${tiemposRespuesta.preguntasMasLentas.map(p => 
                    `Pregunta ${p.preguntaId} (${p.tipo}): ${p.tiempo} segundos`).join(', ')}

                Mantén una actitud  constructiva, motivadora y destacando las fortalezas como mejoras en el estudiante.
            `;
    
            const completion = await this.openai.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: 'gpt-4-0613',
                temperature: 0.5,
                max_tokens: 1000
            });
    
            const feedbackContent = completion.choices[0].message.content;
    
            // Guardar el nuevo feedback en la base de datos
            const savedFeedback = await prisma.feedback_usuario.create({
                data: {
                    usuario_id: userId,
                    tipo_feedback: 'elaborado',
                    contenido: feedbackContent
                }
            });
    
            return {
                feedbackElaborado: feedbackContent,
                timestamp: savedFeedback.timestamp,
                resumenEstadistico: {
                    totalPreguntas: CONFIGURACION_PREGUNTAS.TOTAL_PREGUNTAS,
                    preguntasIndividuales: respuestasIndividuales.length,
                    preguntasColaborativas: respuestasColaborativas.length,
                    preguntasAnalizadas: preguntasAnalizadas.length
                },
                preguntasAnalizadas,
                fromCache: false // Indicador de que es un feedback recién generado
            };
    
        } catch (error) {
            console.error('Error generando feedback elaborado:', error);
            throw new Error(`Error al generar el feedback elaborado: ${error.message}`);
        }
    }
    
            procesarRespuestasColaborativasConChat(respuestas, userId) {
                // Asegurarse de que respuestas es un array
                if (!Array.isArray(respuestas)) {
                    console.error('respuestas no es un array:', respuestas);
                    return [];
                }
            
                return respuestas.map(resp => {
                    const pareja = resp.parejas_colaboracion;
                    if (!pareja) {
                        console.warn('No se encontró pareja de colaboración para la respuesta:', resp);
                        return null;
                    }
            
                    const esUsuario1 = pareja.usuario1_id === userId;
                    
                    const compañero = esUsuario1
                        ? pareja.usuarios_parejas_colaboracion_usuario2_idTousuarios?.nombre
                        : pareja.usuarios_parejas_colaboracion_usuario1_idTousuarios?.nombre;
            
                    // Encontrar el chat correspondiente a esta pregunta
                    const chatRelevante = pareja.chats_colaborativos?.find(
                        chat => chat.pregunta_id === resp.pregunta_id
                    );
            
                    // Procesar los mensajes del chat
                    const historialChat = chatRelevante?.mensajes_chat?.map(mensaje => ({
                        emisor: mensaje.usuario_id === userId ? 'Estudiante' : 'Compañero',
                        mensaje: mensaje.contenido,
                        fecha: mensaje.timestamp
                    })) || [];
            
                    return {
                        preguntaId: resp.pregunta_id,
                        pregunta: resp.preguntas?.texto || 'Sin texto de pregunta',
                        respuestaFinal: resp.respuesta_final,
                        tipo: 'colaborativa',
                        compañero: compañero || 'Compañero no asignado',
                        rolEstudiante: esUsuario1 ? 'Usuario 1' : 'Usuario 2',
                        historialChat,
                        tiempoRespuesta: resp.tiempo_respuesta || null,
                        inicioRespuesta: resp.inicio_respuesta || null,
                        finRespuesta: resp.fin_respuesta || null
                    };
                }).filter(Boolean); // Eliminar cualquier resultado null
            }
        analizarTiemposRespuesta(preguntas) {
            const tiempos = {
                promedioIndividual: 0,
                promedioColaborativo: 0,
                tiempoTotalIndividual: 0,
                tiempoTotalColaborativo: 0,
                preguntasMasRapidas: [],
                preguntasMasLentas: []
            };
    
            const respuestasIndividuales = preguntas.filter(p => p.tipo === 'individual' && p.tiempoRespuesta);
            const respuestasColaborativas = preguntas.filter(p => p.tipo === 'colaborativa' && p.tiempoRespuesta);
    
            // Calcular promedios
            if (respuestasIndividuales.length > 0) {
                tiempos.tiempoTotalIndividual = respuestasIndividuales.reduce((acc, p) => acc + p.tiempoRespuesta, 0);
                tiempos.promedioIndividual = tiempos.tiempoTotalIndividual / respuestasIndividuales.length;
            }
    
            if (respuestasColaborativas.length > 0) {
                tiempos.tiempoTotalColaborativo = respuestasColaborativas.reduce((acc, p) => acc + p.tiempoRespuesta, 0);
                tiempos.promedioColaborativo = tiempos.tiempoTotalColaborativo / respuestasColaborativas.length;
            }
    
            // Identificar preguntas más rápidas y más lentas
            const todasLasRespuestas = [...preguntas].filter(p => p.tiempoRespuesta);
            todasLasRespuestas.sort((a, b) => a.tiempoRespuesta - b.tiempoRespuesta);
    
            tiempos.preguntasMasRapidas = todasLasRespuestas.slice(0, 2).map(p => ({
                preguntaId: p.preguntaId,
                tiempo: p.tiempoRespuesta,
                tipo: p.tipo
            }));
    
            tiempos.preguntasMasLentas = todasLasRespuestas.slice(-2).map(p => ({
                preguntaId: p.preguntaId,
                tiempo: p.tiempoRespuesta,
                tipo: p.tipo
            }));
    
            return tiempos;
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

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
            const respuestasColaborativas = await prisma.respuestas_finales.findMany({
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
            });
    
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
                Eres un docente experto en pensamiento crítico que proporciona feedback detallado y personalizado.
                Analizarás las respuestas del estudiante considerando múltiples dimensiones y su evolución.
    
                Para cada respuesta, considera:
                1. El tipo de pregunta y sus objetivos específicos
                2. Las habilidades de pensamiento crítico demostradas
                3. La profundidad del análisis y argumentación
                4. En preguntas colaborativas, la calidad del diálogo y construcción conjunta
    
                Información del estudiante:
                ${JSON.stringify(patrones, null, 2)}
    
                Análisis de respuestas:
                ${preguntasAnalizadas.map((p) => `
                Pregunta ${p.preguntaId}: ${p.pregunta}
                Contexto: ${JSON.stringify(CONTEXTO_EXTENDIDO[p.preguntaId], null, 2)}
    
                ${[3, 4].includes(p.preguntaId) ? 
                    `\nContexto: La imagen es una ilustración que muestra a una persona en el agua, aparentemente en peligro y levantando una mano en señal de ayuda. A su alrededor, un grupo de personas en la orilla sostiene sus teléfonos y toma fotos o videos de la situación en lugar de ayudar.` : ''}
                ${[5, 6].includes(p.preguntaId) ? 
                    `\nContexto: La primera vez que vi la lluvia fue una tarde de verano en un patio interior. Ese patio era un mundo completo, con una fuente de pajaros en el centro, muchas flores y un viejo naranjo con el tronco blanco. Yo me hallaba contenta contemplando aquel árbol tan raro, cuyas hojas eran como una sustancia verde y tenía algunas frutas tan grandes y redondas como bolas de billar. De pronto escuché un ruido  sobre los techos de las casas vecinas, el cielo se oscureció y empezaron a caer gotas de agua fría, después fue un diluvio. Aquello me pareció extraordinario, un sonido aterrador y maravilloso. El patio se inundó de inmediato, los caminos se convirtieron en pequeños lagos, el naranjo sacudía sus ramas mojadas y enormes gotas rebotaban en el suelo y sobre la fuente. Me acurruqué en un rincón, me encontraba con miedo porque creí que el mundo se estaba rompiendo. Mi madre me tomó en sus brazos para tranquilizarme, me asomó al patio y me dijo que no tuviera miedo, que eso era sólo la lluvia, un fenómeno natural tan lindo como el sol.` : ''}
                
                Respuesta esperada: ${RESPUESTAS_ESPERADAS[p.preguntaId]}
                Respuesta del estudiante: ${p.tipo === 'individual' ? p.respuestaIndividual : p.respuestaFinal}
                ${p.tipo === 'colaborativa' && p.historialChat ? `
                Proceso de diálogo:
                ${p.historialChat.map(msg => `${msg.emisor}: ${msg.mensaje}`).join('\n')}
                ` : ''}
                `).join('\n---\n')}
    
                Proporciona:
                1. Análisis detallado de cada respuesta considerando el contexto y objetivos específicos
                2. Evaluación de las habilidades de pensamiento crítico demostradas
                3. Patrones identificados en el estilo de respuesta y argumentación
                4. Sugerencias específicas para mejorar en cada dimensión
                5. Para respuestas colaborativas, análisis de la calidad del diálogo
                6. Recomendaciones personalizadas basadas en el perfil del estudiante
    
                Mantén un tono constructivo y motivador, destacando tanto fortalezas como áreas de mejora.
                Análisis de tiempos:
            - Tiempo promedio individual: ${Math.round(tiemposRespuesta.promedioIndividual)} segundos
            - Tiempo promedio colaborativo: ${Math.round(tiemposRespuesta.promedioColaborativo)} segundos
            - Preguntas más rápidas: ${tiemposRespuesta.preguntasMasRapidas.map(p => 
                `Pregunta ${p.preguntaId} (${p.tipo}): ${p.tiempo} segundos`).join(', ')}
            - Preguntas más lentas: ${tiemposRespuesta.preguntasMasLentas.map(p => 
                `Pregunta ${p.preguntaId} (${p.tipo}): ${p.tiempo} segundos`).join(', ')}

            Incluye en tu análisis:
            1. Patrones en la distribución del tiempo entre preguntas individuales y colaborativas
            2. Relación entre tiempo dedicado y calidad de las respuestas
            3. Sugerencias para optimizar el tiempo de respuesta
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
                Eres un docente que proporciona feedback básico sobre las respuestas de los estudiantes.
                Tu tarea es simplemente indicar si cada respuesta es correcta o incorrecta, basándote en las respuestas esperadas, pero tomalo como referencia solamente.
                
                Aquí están las preguntas, las preguntas 1 y 2 son de caracter colaborativo, la pregunta 1 se basa en una pregunta de evaluacion y tiene dos imagenes la cual la primera
                imagen se describe: muestra un paisaje natural impresionante. En primer plano, hay varios árboles de pino, enmarcando la vista de un lago de aguas cristalinas y tranquilas, que reflejan las montañas y el cielo como un espejo.  
                mientras que la segunda imagen muestra una escena contrastante entre naturaleza y contaminación industrial. En primer plano, hay una carretera rodeada de áreas verdes y árboles, que se extiende hacia el fondo de la imagen. Sin embargo, al fondo, se observa una zona industrial con varias chimeneas emitiendo grandes cantidades de humo o vapor al ambiente. Este humo se esparce y cubre parte del paisaje, creando una atmósfera brumosa y densa que afecta la claridad de la escena.
                La pregunta 2 es de metacognicion y es de un texto el cual es el siguiente:
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
                y las respuestas del estudiante:
                
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
            });
    
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
                Eres un docente experto que proporciona feedback detallado y constructivo sobre las respuestas de los estudiantes.
                Tu objetivo es ayudar a los estudiantes a mejorar su pensamiento crítico proporcionando:
                1. Una evaluación detallada de cada respuesta
                2. Aspectos positivos específicos de cada respuesta
                3. Sugerencias concretas para mejorar
                4. Para las preguntas colaborativas, comentarios sobre la calidad del diálogo
                5. Recomendaciones generales para futuras actividades
    
                Aquí están las preguntas y respuestas del estudiante:
                [Para preguntas 1 y 2:]
                La pregunta 1 se basa en una pregunta de evaluación y tiene dos imágenes:
                Imagen 1: muestra un paisaje natural impresionante. En primer plano, hay varios árboles de pino, enmarcando la vista de un lago de aguas cristalinas y tranquilas, que reflejan las montañas y el cielo como un espejo.  
                Imagen 2: muestra una escena contrastante entre naturaleza y contaminación industrial. En primer plano, hay una carretera rodeada de áreas verdes y árboles, que se extiende hacia el fondo de la imagen. Sin embargo, al fondo, se observa una zona industrial con varias chimeneas emitiendo grandes cantidades de humo o vapor al ambiente. Este humo se esparce y cubre parte del paisaje, creando una atmósfera brumosa y densa que afecta la claridad de la escena.
    
                La pregunta 2 es de metacognición y contiene el texto de la Rana que quería ser auténtica: Había una vez una Rana que quería ser una Rana auténtica, y
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
    
                ${preguntasAnalizadas.map((p) => `
                Pregunta ${p.preguntaId}: ${p.pregunta}
                ${[3, 4].includes(p.preguntaId) ? 
                    `\nContexto: La imagen es una ilustración que muestra a una persona en el agua, aparentemente en peligro y levantando una mano en señal de ayuda. A su alrededor, un grupo de personas en la orilla sostiene sus teléfonos y toma fotos o videos de la situación en lugar de ayudar.` : ''}
                ${[5, 6].includes(p.preguntaId) ? 
                    `\nContexto: ${textoContexto}` : ''}
                
                Respuesta esperada: ${RESPUESTAS_ESPERADAS[p.preguntaId]}
                Respuesta del estudiante: ${p.tipo === 'individual' ? p.respuestaIndividual : p.respuestaFinal}
                ${p.tipo === 'colaborativa' && p.historialChat ? `
                Historial de chat:
                ${p.historialChat.map(msg => `${msg.emisor}: ${msg.mensaje}`).join('\n')}
                ` : ''}
                `).join('\n---\n')}
                Análisis de tiempos de respuesta:
            - Tiempo promedio en preguntas individuales: ${Math.round(tiemposRespuesta.promedioIndividual)} segundos
            - Tiempo promedio en preguntas colaborativas: ${Math.round(tiemposRespuesta.promedioColaborativo)} segundos
            - Preguntas más rápidas: ${tiemposRespuesta.preguntasMasRapidas.map(p => 
                `Pregunta ${p.preguntaId} (${p.tipo}): ${p.tiempo} segundos`).join(', ')}
            - Preguntas más lentas: ${tiemposRespuesta.preguntasMasLentas.map(p => 
                `Pregunta ${p.preguntaId} (${p.tipo}): ${p.tiempo} segundos`).join(', ')}

            Incluye en tu feedback un análisis de los tiempos de respuesta, considerando:
            1. La diferencia entre tiempos individuales y colaborativos
            2. Patrones en las preguntas que tomaron más o menos tiempo
            3. Recomendaciones sobre gestión del tiempo
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
    
    // Nuevo método para procesar respuestas colaborativas incluyendo el chat
    /* procesarRespuestasColaborativasConChat(respuestas, userId) {
        return respuestas.map(resp => {
            const pareja = resp.parejas_colaboracion;
            const esUsuario1 = pareja.usuario1_id === userId;
            
            const compañero = esUsuario1
                ? pareja.usuarios_parejas_colaboracion_usuario2_idTousuarios?.nombre
                : pareja.usuarios_parejas_colaboracion_usuario1_idTousuarios?.nombre;
    
            // Procesar el historial del chat
            const historialChat = pareja.chats_colaborativos?.[0]?.mensajes_chat.map(mensaje => ({
                emisor: mensaje.usuario_id === userId ? 'Estudiante' : 'Compañero',
                mensaje: mensaje.contenido,
                fecha: mensaje.fecha_envio
            })) || [];
    
            return {
                preguntaId: resp.pregunta_id,
                pregunta: resp.preguntas?.texto || 'Sin texto de pregunta',
                respuestaFinal: resp.respuesta_final,
                tipo: 'colaborativa',
                compañero: compañero || 'Compañero no asignado',
                rolEstudiante: esUsuario1 ? 'Usuario 1' : 'Usuario 2',
                historialChat
            };
        });
    } */

        /* procesarRespuestasColaborativasConChat(respuestas, userId) {
            return respuestas.map(resp => {
                const pareja = resp.parejas_colaboracion;
                const esUsuario1 = pareja.usuario1_id === userId;
                
                const compañero = esUsuario1
                    ? pareja.usuarios_parejas_colaboracion_usuario2_idTousuarios?.nombre
                    : pareja.usuarios_parejas_colaboracion_usuario1_idTousuarios?.nombre;
        
                const historialChat = pareja.chats_colaborativos?.[0]?.mensajes_chat.map(mensaje => ({
                    emisor: mensaje.usuario_id === userId ? 'Estudiante' : 'Compañero',
                    mensaje: mensaje.contenido,
                    fecha: mensaje.fecha_envio
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
            });
        } */
            procesarRespuestasColaborativasConChat(respuestas, userId) {
                return respuestas.map(resp => {
                    const pareja = resp.parejas_colaboracion;
                    const esUsuario1 = pareja.usuario1_id === userId;
                    
                    const compañero = esUsuario1
                        ? pareja.usuarios_parejas_colaboracion_usuario2_idTousuarios?.nombre
                        : pareja.usuarios_parejas_colaboracion_usuario1_idTousuarios?.nombre;
            
                    // Obtener todo el historial del chat de la pareja
                    const historialChat = pareja.chats_colaborativos
    ?.find(chat => chat.pregunta_id === resp.pregunta_id)
    ?.mensajes_chat?.map(mensaje => ({
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
                        historialChat, // Ahora incluye todo el historial del chat
                        tiempoRespuesta: resp.tiempo_respuesta || null,
                        inicioRespuesta: resp.inicio_respuesta || null,
                        finRespuesta: resp.fin_respuesta || null
                    };
                });
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

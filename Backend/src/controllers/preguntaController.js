import prisma from '../config/database.js';

export const getAllPreguntas = async (req, res, next) => {
  try {
    const preguntas = await prisma.preguntas.findMany();
    res.json(preguntas);
  } catch (error) {
    next(error);
  }
};

export const getPreguntaById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pregunta = await prisma.preguntas.findUnique({
      where: { id: Number(id) },
    });
    if (!pregunta) {
      return res.status(404).json({ message: 'Pregunta no encontrada' });
    }
    res.json(pregunta);
  } catch (error) {
    next(error);
  }
};

export const createPregunta = async (req, res, next) => {
  try {
    const { texto, imagen_url, orden, nivel } = req.body;
    const nuevaPregunta = await prisma.preguntas.create({
      data: {
        texto,
        imagen_url,
        orden,
        nivel,
      },
    });
    res.status(201).json(nuevaPregunta);
  } catch (error) {
    next(error);
  }
};

export const updatePregunta = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { texto, imagen_url, orden, nivel } = req.body;
    const preguntaActualizada = await prisma.preguntas.update({
      where: { id: Number(id) },
      data: {
        texto,
        imagen_url,
        orden,
        nivel,
      },
    });
    res.json(preguntaActualizada);
  } catch (error) {
    next(error);
  }
};

export const deletePregunta = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.preguntas.delete({
      where: { id: Number(id) },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
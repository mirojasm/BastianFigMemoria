import prisma from '../config/database.js';

export const getAllParejasColaboracion = async (req, res, next) => {
  try {
    const parejas = await prisma.parejas_colaboracion.findMany({
      include: {
        usuario1: true,
        usuario2: true,
      },
    });
    res.json(parejas);
  } catch (error) {
    next(error);
  }
};

export const createParejaColaboracion = async (req, res, next) => {
  try {
    const { usuario1_id, usuario2_id } = req.body;
    const nuevaPareja = await prisma.parejas_colaboracion.create({
      data: {
        usuario1: { connect: { id: usuario1_id } },
        usuario2: { connect: { id: usuario2_id } },
      },
      include: {
        usuario1: true,
        usuario2: true,
      },
    });
    res.status(201).json(nuevaPareja);
  } catch (error) {
    next(error);
  }
};

export const getParejaColaboracionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pareja = await prisma.parejas_colaboracion.findUnique({
      where: { id: Number(id) },
      include: {
        usuario1: true,
        usuario2: true,
      },
    });
    if (!pareja) {
      return res.status(404).json({ message: 'Pareja de colaboración no encontrada' });
    }
    res.json(pareja);
  } catch (error) {
    next(error);
  }
};

export const deleteParejaColaboracion = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.parejas_colaboracion.delete({
      where: { id: Number(id) },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
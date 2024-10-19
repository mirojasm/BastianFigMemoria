import prisma from '../config/database.js';

export const getAllUsuarios = async (req, res, next) => {
  try {
    const usuarios = await prisma.usuarios.findMany();
    res.json(usuarios);
  } catch (error) {
    next(error);
  }
};

export const getUsuarioById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const usuario = await prisma.usuarios.findUnique({
      where: { id: Number(id) },
    });
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json(usuario);
  } catch (error) {
    next(error);
  }
};

export const createUsuario = async (req, res, next) => {
  try {
    const { nombre, email, curso, contrasena, establecimiento } = req.body;
    const nuevoUsuario = await prisma.usuarios.create({
      data: {
        nombre,
        email,
        curso,
        contrasena,
        establecimiento,
      },
    });
    res.status(201).json(nuevoUsuario);
  } catch (error) {
    next(error);
  }
};

export const updateUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, email, curso, contrasena, establecimiento } = req.body;
    const usuarioActualizado = await prisma.usuarios.update({
      where: { id: Number(id) },
      data: {
        nombre,
        email,
        curso,
        contrasena,
        establecimiento,
      },
    });
    res.json(usuarioActualizado);
  } catch (error) {
    next(error);
  }
};

export const deleteUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.usuarios.delete({
      where: { id: Number(id) },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
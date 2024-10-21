import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { user, establecimiento, pass } = req.body;
    
    const usuario = await prisma.usuarios.findFirst({
      where: {
        nombre: user,
        establecimiento: establecimiento
      }
    });

    if (!usuario) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    // Nota: En un entorno de producción, deberías usar bcrypt.compare
    // const validPassword = await bcrypt.compare(pass, usuario.contrasena);
    const validPassword = pass === usuario.contrasena;
    
    if (!validPassword) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    console.log('Usuario autenticado:', {
        id: usuario.id,
        nombre: usuario.nombre,
        establecimiento: usuario.establecimiento
      });

    const token = jwt.sign(
      { 
        id: usuario.id, 
        nombre: usuario.nombre,
        establecimiento: usuario.establecimiento
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('Respuesta enviada:', {
        token: token.substring(0, 20) + '...', // Solo mostrar parte del token por seguridad
        nombre: usuario.nombre,
        establecimiento: usuario.establecimiento
      });

    res.json({
      token,
      nombre: usuario.nombre,
      establecimiento: usuario.establecimiento
    });

  } catch (error) {
    console.error('Error en el login:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

export default router;
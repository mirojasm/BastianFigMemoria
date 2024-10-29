import prisma from "../config/database.js";

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
		const { user1Id, user2Id, roomId } = req.body;

		// Validar que ambos IDs sean números válidos
		const id1 = parseInt(user1Id);
		const id2 = parseInt(user2Id);

		if (isNaN(id1) || isNaN(id2)) {
			return res.status(400).json({
				message: "IDs de usuario inválidos",
			});
		}

		// Buscar pareja existente
		const parejaExistente = await prisma.parejas_colaboracion.findFirst({
			where: {
				OR: [
					{
						AND: [{ usuario1_id: id1 }, { usuario2_id: id2 }],
					},
					{
						AND: [{ usuario1_id: id2 }, { usuario2_id: id1 }],
					},
				],
			},
		});

		let pareja;
		if (parejaExistente) {
			pareja = await prisma.parejas_colaboracion.update({
				where: { id: parejaExistente.id },
				data: { room_id: roomId },
			});
		} else {
			pareja = await prisma.parejas_colaboracion.create({
				data: {
					usuario1_id: id1,
					usuario2_id: id2,
					room_id: roomId,
				},
			});
		}

		res.status(201).json(pareja);
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
			return res
				.status(404)
				.json({ message: "Pareja de colaboración no encontrada" });
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

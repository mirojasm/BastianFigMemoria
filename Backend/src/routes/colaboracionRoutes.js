import express from "express";
import {
	getAllParejasColaboracion,
	createParejaColaboracion,
	getParejaColaboracionById,
	deleteParejaColaboracion,
} from "../controllers/colaboracionController.js";

const router = express.Router();

router.get("/", getAllParejasColaboracion);
router.post("/parejas", createParejaColaboracion);
router.get("/:id", getParejaColaboracionById);
router.delete("/:id", deleteParejaColaboracion);

export default router;

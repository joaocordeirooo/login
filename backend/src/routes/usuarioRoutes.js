import { Router } from 'express';
import usuarioController from '../controllers/usuarioController.js';
const router = Router();
router.post('/login', usuarioController.login);
export default router;

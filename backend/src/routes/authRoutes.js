import { Router } from 'express';
import usuarioController from '../controllers/usuarioController.js';
const router = Router();
router.get('/setup', usuarioController.consultarConfiguracao);
router.post('/setup', usuarioController.cadastrarUsuario);
export default router;

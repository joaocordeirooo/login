import { Router } from 'express';
import documentoController from '../controllers/documentoController.js';
const router = Router();
router.post('/processos/:id/documentos', documentoController.criar);
router.get('/documentos/:id', documentoController.baixar);
export default router;

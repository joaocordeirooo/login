import { Router } from 'express';
import processoController from '../controllers/processoController.js';
const router = Router();
router.get('/processos', processoController.listar);
router.post('/processos', processoController.criar);
router.put('/processos/:id', processoController.atualizar);
router.get('/processos/:id', processoController.buscarPorId);
export default router;

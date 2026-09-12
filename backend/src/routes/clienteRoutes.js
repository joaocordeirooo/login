import { Router } from 'express';
import clienteController from '../controllers/clienteController.js';
const router = Router();
router.get('/clientes', clienteController.listar);
router.post('/clientes', clienteController.criar);
router.put('/clientes/:id', clienteController.atualizar);
router.get('/clientes/:id', clienteController.buscarPorId);
export default router;

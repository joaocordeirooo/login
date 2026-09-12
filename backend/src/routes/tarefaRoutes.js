import { Router } from 'express';
import tarefaController from '../controllers/tarefaController.js';
const router = Router();
router.get('/tarefas', tarefaController.listar);
router.post('/tarefas', tarefaController.criar);
router.patch('/tarefas/:id', tarefaController.alterarSituacao);
export default router;

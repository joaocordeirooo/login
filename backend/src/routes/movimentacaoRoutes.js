import { Router } from 'express';
import movimentacaoController from '../controllers/movimentacaoController.js';
const router = Router();
router.post('/processos/:id/movimentacoes', movimentacaoController.criar);
export default router;

import { Router } from 'express';
import authRoutes from './authRoutes.js';
import usuarioRoutes from './usuarioRoutes.js';
import clienteRoutes from './clienteRoutes.js';
import processoRoutes from './processoRoutes.js';
import movimentacaoRoutes from './movimentacaoRoutes.js';
import tarefaRoutes from './tarefaRoutes.js';
import documentoRoutes from './documentoRoutes.js';
import usuarioController from '../controllers/usuarioController.js';
import autenticar from '../middlewares/autenticar.js';
import pool from '../config/database.js';

const router = Router();
router.get('/status', (req, res) => res.json({ online: true }));
router.use(authRoutes);
router.use('/usuarios', usuarioRoutes);
router.use(autenticar);
router.get('/painel',async(req,res)=>{
  const [totais,casos,tarefas]=await Promise.all([
    pool.query("SELECT (SELECT COUNT(*)::int FROM clientes) clientes,(SELECT COUNT(*)::int FROM processos WHERE status NOT IN ('Concluído','Arquivado')) casos,(SELECT COUNT(*)::int FROM tarefas WHERE concluida=false) tarefas"),
    pool.query('SELECT p.id,p.titulo,p.tipo,p.natureza,p.status,c.nome AS cliente FROM processos p JOIN clientes c ON c.id=p.cliente_id ORDER BY p.atualizado_em DESC LIMIT 5'),
    pool.query('SELECT t.id,t.processo_id,t.titulo,t.vencimento,c.nome AS cliente,p.titulo AS processo FROM tarefas t JOIN processos p ON p.id=t.processo_id JOIN clientes c ON c.id=p.cliente_id WHERE t.concluida=false ORDER BY t.vencimento LIMIT 6')
  ]);res.json({totais:totais.rows[0],casos:casos.rows,tarefas:tarefas.rows});
});
router.get('/me', usuarioController.consultarSessao);
router.use(clienteRoutes);
router.use(processoRoutes);
router.use(movimentacaoRoutes);
router.use(tarefaRoutes);
router.use(documentoRoutes);
export default router;

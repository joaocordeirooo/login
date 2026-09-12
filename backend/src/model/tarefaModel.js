import pool from '../config/database.js';
import { one } from './query.js';
async function listar(valores) {
  return (await pool.query('SELECT t.*,p.titulo AS processo,c.nome AS cliente FROM tarefas t JOIN processos p ON p.id=t.processo_id JOIN clientes c ON c.id=p.cliente_id ORDER BY t.concluida,t.vencimento,t.id', valores)).rows;
}
async function criar(valores) {
  return one('INSERT INTO tarefas(processo_id,titulo,responsavel,vencimento,prioridade) VALUES($1,$2,$3,$4,$5) RETURNING *', valores);
}
async function alterarSituacao(valores) {
  return one('UPDATE tarefas SET concluida=$1 WHERE id=$2 RETURNING *', valores);
}
export default {
  listar,
  criar,
  alterarSituacao
};

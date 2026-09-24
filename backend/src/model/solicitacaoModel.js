import pool from '../config/database.js';
import { one } from './query.js';
import { fail } from '../utils/validacao.js';

async function buscar(tarefaId, solicitacaoId) {
  return one(`SELECT s.id,c.cpf FROM solicitacoes_externas s
    JOIN tarefas t ON t.id=s.tarefa_id JOIN processos p ON p.id=t.processo_id
    JOIN clientes c ON c.id=p.cliente_id WHERE s.id=$1 AND s.tarefa_id=$2`, [solicitacaoId,tarefaId]);
}
async function analise(solicitacaoId) {
  return (await pool.query('SELECT * FROM solicitacao_analises WHERE solicitacao_id=$1',[solicitacaoId])).rows[0] || null;
}
async function fontes(solicitacaoId) {
  // Load metadata first; the selected analysis mode determines which bytes are read.
  return (await pool.query(`SELECT d.id,d.nome,sd.tipo,octet_length(d.conteudo) AS tamanho FROM solicitacao_documentos sd
    JOIN documentos d ON d.id=sd.documento_id WHERE sd.solicitacao_id=$1 ORDER BY d.id`,[solicitacaoId])).rows;
}
async function conteudo(solicitacaoId, documentoId) {
  return (await one(`SELECT d.conteudo FROM documentos d JOIN solicitacao_documentos sd ON sd.documento_id=d.id
    WHERE sd.solicitacao_id=$1 AND d.id=$2`,[solicitacaoId,documentoId])).conteudo;
}
async function guardar(solicitacaoId,resultado) {
  await pool.query('INSERT INTO solicitacao_analises(solicitacao_id,resultado) VALUES($1,$2) ON CONFLICT DO NOTHING',[solicitacaoId,JSON.stringify(resultado)]);
  return analise(solicitacaoId);
}
async function revisar(solicitacaoId,versao,revisao,usuarioId) {
  const r = await pool.query(`UPDATE solicitacao_analises SET revisao=$3,versao=versao+1,revisor_id=$4,revisado_em=NOW()
    WHERE solicitacao_id=$1 AND versao=$2 RETURNING *`,[solicitacaoId,versao,JSON.stringify(revisao),usuarioId]);
  if (!r.rowCount) fail('Esta análise foi atualizada por outra pessoa. Reabra a revisão antes de salvar.',412);
  return r.rows[0];
}
export default { buscar,analise,fontes,conteudo,guardar,revisar };

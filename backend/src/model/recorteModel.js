import pool from '../config/database.js';
import { one } from './query.js';
import { fail } from '../utils/validacao.js';
import { periodoDaAnalise } from '../services/validarRecorte.js';

const campos = 'id,solicitacao_id,periodo_id,versao_analise,periodo,trechos,fontes,nome,paginas,autor_id,criado_em,aprovado_em,aprovador_id';
async function listar(solicitacaoId) {
  return (await pool.query(`SELECT ${campos},octet_length(conteudo) AS tamanho FROM solicitacao_recortes WHERE solicitacao_id=$1 ORDER BY id DESC`,[solicitacaoId])).rows;
}
async function fonte(solicitacaoId,documentoId) {
  return one(`SELECT d.id,d.nome,d.conteudo FROM documentos d JOIN solicitacao_documentos sd ON sd.documento_id=d.id
    WHERE sd.solicitacao_id=$1 AND d.id=$2 AND sd.tipo='CTPS'`,[solicitacaoId,documentoId]);
}
async function arquivo(solicitacaoId,recorteId) {
  return one('SELECT id,nome,conteudo,paginas FROM solicitacao_recortes WHERE solicitacao_id=$1 AND id=$2',[solicitacaoId,recorteId]);
}
async function salvar(solicitacaoId,periodoId,versao,trechos,gerado,usuarioId) {
  const cx = await pool.connect();
  try {
    await cx.query('BEGIN');
    const analise = (await cx.query('SELECT * FROM solicitacao_analises WHERE solicitacao_id=$1 FOR UPDATE',[solicitacaoId])).rows[0];
    const periodo = periodoDaAnalise(analise,periodoId,versao);
    const nome = `CTPS-periodo-${periodoId}.pdf`;
    const result = (await cx.query(`INSERT INTO solicitacao_recortes(solicitacao_id,periodo_id,versao_analise,periodo,trechos,fontes,nome,paginas,conteudo,autor_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING ${campos}`,
    [solicitacaoId,periodoId,versao,JSON.stringify(periodo),JSON.stringify(trechos),JSON.stringify(gerado.fontes),nome,trechos.length,Buffer.from(gerado.pdf),usuarioId])).rows[0];
    await cx.query('COMMIT'); return result;
  } catch(e) { await cx.query('ROLLBACK'); throw e; } finally { cx.release(); }
}
async function aprovar(solicitacaoId,recorteId,usuarioId) {
  const cx = await pool.connect();
  try {
    await cx.query('BEGIN');
    const analise = (await cx.query('SELECT * FROM solicitacao_analises WHERE solicitacao_id=$1 FOR UPDATE',[solicitacaoId])).rows[0];
    const recorte = (await cx.query('SELECT periodo_id,versao_analise FROM solicitacao_recortes WHERE solicitacao_id=$1 AND id=$2',[solicitacaoId,recorteId])).rows[0];
    if (!recorte) fail('Recorte não encontrado.',404);
    periodoDaAnalise(analise,recorte.periodo_id,recorte.versao_analise);
    if (!analise.revisao?.concluida) fail('Conclua a revisão dos períodos antes de aprovar o PDF recortado.');
    const result = (await cx.query(`UPDATE solicitacao_recortes SET aprovado_em=COALESCE(aprovado_em,NOW()),aprovador_id=COALESCE(aprovador_id,$3)
      WHERE solicitacao_id=$1 AND id=$2 RETURNING ${campos}`,[solicitacaoId,recorteId,usuarioId])).rows[0];
    await cx.query('COMMIT'); return result;
  } catch(e) { await cx.query('ROLLBACK'); throw e; } finally { cx.release(); }
}
export default { listar,fonte,arquivo,salvar,aprovar };

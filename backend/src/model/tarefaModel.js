import pool from '../config/database.js';
import { one } from './query.js';
import { fail } from '../utils/validacao.js';
async function listar(processoId=null) {
  return (await pool.query(`SELECT t.id,t.processo_id,t.titulo,t.vencimento,t.prioridade,t.concluida,t.setor_id,t.fluxo_id,t.responsavel_id,p.titulo AS processo,c.nome AS cliente,s.nome AS setor,f.nome AS fluxo,
    COALESCE(u.nome,t.responsavel) AS responsavel FROM tarefas t
    JOIN processos p ON p.id=t.processo_id JOIN clientes c ON c.id=p.cliente_id
    JOIN setores s ON s.id=t.setor_id JOIN fluxos f ON f.id=t.fluxo_id
    LEFT JOIN usuarios u ON u.id=t.responsavel_id WHERE ($1::bigint IS NULL OR t.processo_id=$1) ORDER BY t.concluida,t.vencimento,t.id`,[processoId])).rows;
}
async function catalogo() {
  const [setores, fluxos, usuarios] = await Promise.all([
    pool.query('SELECT * FROM setores ORDER BY nome'), pool.query('SELECT * FROM fluxos ORDER BY nome'),
    pool.query('SELECT id,nome FROM usuarios WHERE ativo=true ORDER BY nome')]);
  return { setores: setores.rows, fluxos: fluxos.rows, usuarios: usuarios.rows };
}
async function organizar(tipo, nome, setorId) {
  return tipo === 'setor'
    ? one('INSERT INTO setores(nome) VALUES($1) ON CONFLICT(nome) DO UPDATE SET nome=EXCLUDED.nome RETURNING *', [nome])
    : one('INSERT INTO fluxos(nome,setor_id) VALUES($1,$2) ON CONFLICT(setor_id,nome) DO UPDATE SET nome=EXCLUDED.nome RETURNING *', [nome,setorId]);
}
async function salvar(b, tarefaId) {
  if (!(await pool.query('SELECT 1 FROM fluxos WHERE id=$1 AND setor_id=$2', [b.fluxo_id,b.setor_id])).rowCount) fail('Selecione um fluxo pertencente ao setor.');
  if (!(await pool.query('SELECT 1 FROM usuarios WHERE id=$1 AND ativo=true', [b.responsavel_id])).rowCount) fail('Selecione um usuário ativo.');
  const values = [b.processo_id,b.titulo,b.responsavel,b.vencimento,b.prioridade,b.setor_id,b.fluxo_id,b.responsavel_id,b.descricao];
  if (tarefaId) {
    // O caso não muda: anexos e solicitações permanecem ligados ao cliente original.
    return one(`UPDATE tarefas SET titulo=$2,responsavel=$3,vencimento=$4,prioridade=$5,setor_id=$6,fluxo_id=$7,responsavel_id=$8,descricao=$9
      WHERE id=$10 AND processo_id=$1 RETURNING *`, [...values,tarefaId]);
  }
  return one(`INSERT INTO tarefas(processo_id,titulo,responsavel,vencimento,prioridade,setor_id,fluxo_id,responsavel_id,descricao)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, values);
}
async function alterarSituacao(valores) { return one('UPDATE tarefas SET concluida=$1 WHERE id=$2 RETURNING *', valores); }
async function detalhe(tarefaId) {
  const tarefa = await one('SELECT * FROM tarefas WHERE id=$1', [tarefaId]);
  const documentos = (await pool.query(`SELECT d.id,d.nome,d.mime,d.criado_em,p.titulo AS processo,
    EXISTS(SELECT 1 FROM tarefa_documentos td WHERE td.documento_id=d.id AND td.tarefa_id=$1) AS anexado
    FROM documentos d JOIN processos p ON p.id=d.processo_id
    WHERE p.cliente_id=(SELECT cliente_id FROM processos WHERE id=$2) ORDER BY d.criado_em DESC`, [tarefaId,tarefa.processo_id])).rows;
  const solicitacoes = (await pool.query(`SELECT s.*,COALESCE(json_agg(json_build_object('id',d.id::text,'nome',d.nome,'tipo',sd.tipo)) FILTER(WHERE d.id IS NOT NULL),'[]') AS documentos
    FROM solicitacoes_externas s LEFT JOIN solicitacao_documentos sd ON sd.solicitacao_id=s.id
    LEFT JOIN documentos d ON d.id=sd.documento_id WHERE s.tarefa_id=$1 GROUP BY s.id ORDER BY s.id DESC`, [tarefaId])).rows;
  return { ...tarefa, documentos, solicitacoes };
}
async function anexar(tarefaId, autorId, nome, mime, buffer) {
  const cx = await pool.connect();
  try {
    await cx.query('BEGIN');
    const t = (await cx.query('SELECT processo_id FROM tarefas WHERE id=$1 FOR UPDATE', [tarefaId])).rows[0];
    if (!t) fail('Tarefa não encontrada.',404);
    const d = (await cx.query('INSERT INTO documentos(processo_id,autor_id,nome,mime,conteudo) VALUES($1,$2,$3,$4,$5) RETURNING id,nome', [t.processo_id,autorId,nome,mime,buffer])).rows[0];
    await cx.query('INSERT INTO tarefa_documentos VALUES($1,$2)', [tarefaId,d.id]);
    await cx.query('COMMIT');
    return d;
  } catch(e) { await cx.query('ROLLBACK'); throw e; } finally { cx.release(); }
}
async function solicitar(tarefaId, autorId, canal, observacoes, documentos, tipos) {
  const cx = await pool.connect();
  try {
    await cx.query('BEGIN');
    const t = (await cx.query('SELECT p.cliente_id FROM tarefas t JOIN processos p ON p.id=t.processo_id WHERE t.id=$1', [tarefaId])).rows[0];
    if (!t) fail('Tarefa não encontrada.',404);
    const validos = await cx.query('SELECT d.id FROM documentos d JOIN processos p ON p.id=d.processo_id WHERE p.cliente_id=$1 AND d.id=ANY($2::bigint[]) FOR SHARE OF d', [t.cliente_id,documentos]);
    if (validos.rowCount !== documentos.length) fail('Selecione apenas documentos deste cliente.');
    const s = (await cx.query('INSERT INTO solicitacoes_externas(tarefa_id,autor_id,canal,observacoes) VALUES($1,$2,$3,$4) RETURNING *', [tarefaId,autorId,canal,observacoes])).rows[0];
    await cx.query('INSERT INTO solicitacao_documentos(solicitacao_id,documento_id,tipo) SELECT $1,* FROM unnest($2::bigint[],$3::text[])', [s.id,documentos,documentos.map(d => tipos[d] || 'Apoio')]);
    await cx.query('COMMIT');
    return s;
  } catch(e) { await cx.query('ROLLBACK'); throw e; } finally { cx.release(); }
}
export default { listar,catalogo,organizar,salvar,alterarSituacao,detalhe,anexar,solicitar };

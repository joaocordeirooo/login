import pool from '../config/database.js';
import solicitacaoModel from '../model/solicitacaoModel.js';
import {fail,id,required} from '../utils/validacao.js';
import {periodoDaAnalise} from '../services/validarRecorte.js';
import {consultarCnpja} from '../services/cnpja.js';
import {historicoEnvios,enviarMensagem} from '../model/envioModel.js';
import {statusSMTP,verificarSMTP} from '../services/smtp.js';

async function contexto(req) {
  const s=await solicitacaoModel.buscar(id(req.params.id),id(req.params.solicitacaoId));
  return {s,analise:await solicitacaoModel.analise(s.id)};
}
async function resumo(req,res) {
  const {s,analise}=await contexto(req);
  if (!analise) return res.json(null);
  const rows=(analise.revisao?.periodos || analise.resultado.periodos).filter(p=>p.selecionado);
  const contatos=(await pool.query('SELECT cnpj,razao_social,emails,telefones,situacao,consultado_em FROM empresa_contatos WHERE cnpj=ANY($1::text[])',[rows.map(p=>p.cnpj).filter(Boolean)])).rows;
  const recortes=(await pool.query('SELECT id,periodo_id,versao_analise,nome,paginas,aprovado_em FROM solicitacao_recortes WHERE solicitacao_id=$1 ORDER BY id DESC',[s.id])).rows;
  const mensagens=(await pool.query('SELECT periodo_id,versao_analise,destinatario,atualizado_em FROM solicitacao_mensagens WHERE solicitacao_id=$1',[s.id])).rows;
  res.json({versao:analise.versao,revisao_concluida:!!analise.revisao?.concluida,avisos:analise.resultado.avisos,
    periodos:rows.map(p=>{const original=analise.resultado.periodos.find(o=>o.id===p.id);return {
      id:p.id,empresa:p.empresa,inicio:p.inicio,fim:p.fim,cnpj:p.cnpj,conferido:p.conferido,
      pendencias:original.original.pendencias,sugestoes_ctps:original.sugestoes_ctps || [],
      contato:contatos.find(c=>c.cnpj===p.cnpj) || null,
      recorte:recortes.find(r=>r.periodo_id===p.id && r.versao_analise===analise.versao) || null,
      mensagem:mensagens.find(m=>m.periodo_id===p.id && m.versao_analise===analise.versao) || null
    };})});
}
async function contato(req,res) {
  const {s,analise}=await contexto(req);
  const p=periodoDaAnalise(analise,String(req.params.periodoId),req.body.versao);
  const result=await consultarCnpja(p.cnpj);
  // Do not associate the result with a period changed during a remote call.
  periodoDaAnalise(await solicitacaoModel.analise(s.id),p.id,req.body.versao);
  res.json(result);
}
async function mensagem(req,res) {
  const {s,analise}=await contexto(req);
  const p=periodoDaAnalise(analise,String(req.params.periodoId),analise?.versao);
  const envios=await historicoEnvios(s.id,p.id);
  const smtp=statusSMTP();
  const saved=(await pool.query('SELECT destinatario,assunto,mensagem,funcao,anexos,recorte_id,revisao,versao_analise FROM solicitacao_mensagens WHERE solicitacao_id=$1 AND periodo_id=$2',[s.id,p.id])).rows[0];
  const anexos=(await pool.query("SELECT d.id,d.nome FROM documentos d JOIN solicitacao_documentos sd ON sd.documento_id=d.id WHERE sd.solicitacao_id=$1 AND sd.tipo='Apoio'",[s.id])).rows;
  const recortes=(await pool.query('SELECT id,nome FROM solicitacao_recortes WHERE solicitacao_id=$1 AND periodo_id=$2 AND versao_analise=$3 AND aprovado_em IS NOT NULL ORDER BY id DESC',[s.id,p.id,analise.versao])).rows;
  if (saved) return res.json({...saved,envios,smtp,desatualizada:saved.versao_analise!==analise.versao,versao:analise.versao,anexos_disponiveis:anexos,recortes});
  const client=(await pool.query('SELECT c.nome FROM clientes c JOIN processos p ON p.cliente_id=c.id JOIN tarefas t ON t.processo_id=p.id WHERE t.id=$1',[req.params.id])).rows[0];
  const contact=(await pool.query('SELECT emails FROM empresa_contatos WHERE cnpj=$1',[p.cnpj])).rows[0];
  const date=s=>s?.split('-').reverse().join('/');
  res.json({versao:analise.versao,versao_analise:analise.versao,revisao:0,destinatario:contact?.emails[0] || '',funcao:'',
    assunto:`Solicitação de PPP — ${client.nome}`,
    mensagem:`Prezados,\n\nSolicitamos o Perfil Profissiográfico Previdenciário (PPP) de ${client.nome}, referente ao vínculo com ${p.empresa}, no período solicitado de ${date(p.inicio)} a ${date(p.fim)}.\n\nPor gentileza, informem o procedimento e os documentos necessários para atendimento.\n\nAtenciosamente,`,
    anexos:[],recorte_id:recortes[0]?.id || null,anexos_disponiveis:anexos,recortes,envios,smtp});
}
async function salvarMensagem(req,res) {
  const {s}=await contexto(req),b=req.body;
  const destinatario=String(b.destinatario || '').trim();
  if (destinatario && (destinatario.length>254 || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(destinatario))) fail('Informe um e-mail válido.');
  const assunto=required(b.assunto,'Assunto',255),texto=required(b.mensagem,'Mensagem',15000),funcao=String(b.funcao || '').trim().slice(0,255);
  if (!Array.isArray(b.anexos) || b.anexos.length>20 || !Number.isInteger(b.revisao) || b.revisao<0) fail('Rascunho inválido.');
  const anexos=[...new Set(b.anexos.map(a=>String(id(a))))];
  const cx=await pool.connect();
  try {
    await cx.query('BEGIN');
    const analise=(await cx.query('SELECT * FROM solicitacao_analises WHERE solicitacao_id=$1 FOR UPDATE',[s.id])).rows[0];
    const p=periodoDaAnalise(analise,String(req.params.periodoId),b.versao);
    const valid=(await cx.query("SELECT documento_id FROM solicitacao_documentos WHERE solicitacao_id=$1 AND tipo='Apoio' AND documento_id=ANY($2::bigint[])",[s.id,anexos])).rows;
    if (valid.length!==anexos.length) fail('Selecione somente anexos de apoio desta solicitação.');
    if (b.recorte_id && !(await cx.query('SELECT id FROM solicitacao_recortes WHERE id=$1 AND solicitacao_id=$2 AND periodo_id=$3 AND versao_analise=$4 AND aprovado_em IS NOT NULL',[id(b.recorte_id),s.id,p.id,b.versao])).rowCount) fail('Escolha um recorte aprovado deste vínculo e da revisão atual.');
    const prior=(await cx.query('SELECT revisao FROM solicitacao_mensagens WHERE solicitacao_id=$1 AND periodo_id=$2',[s.id,p.id])).rows[0];
    if ((prior?.revisao || 0)!==b.revisao) fail('Este rascunho foi alterado. Reabra a mensagem antes de salvar.',412);
    await cx.query(`INSERT INTO solicitacao_mensagens(solicitacao_id,periodo_id,versao_analise,destinatario,assunto,mensagem,funcao,anexos,recorte_id,autor_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(solicitacao_id,periodo_id) DO UPDATE SET versao_analise=$3,destinatario=$4,assunto=$5,mensagem=$6,funcao=$7,anexos=$8,recorte_id=$9,autor_id=$10,revisao=solicitacao_mensagens.revisao+1,atualizado_em=NOW()`,[s.id,p.id,b.versao,destinatario,assunto,texto,funcao,JSON.stringify(anexos),b.recorte_id || null,req.usuario.id]);
    await cx.query('COMMIT');res.json({salvo:true});
  }catch(e){await cx.query('ROLLBACK');throw e;}finally{cx.release();}
}
async function enviar(req,res){
  const {s}=await contexto(req);
  res.json(await enviarMensagem(s.id,String(req.params.periodoId),req.body,req.usuario.id));
}
async function testarSMTP(req,res){res.json(await verificarSMTP());}
export default {resumo,contato,mensagem,salvarMensagem,enviar,testarSMTP};

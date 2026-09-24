import solicitacaoModel from '../model/solicitacaoModel.js';
import { analisar } from '../services/analisarSolicitacao.js';
import { validarRevisao } from '../services/revisarSolicitacao.js';
import { id,fail } from '../utils/validacao.js';

function configuracao(req,res) {
  res.set('Cache-Control','no-store').json({disponivel:!!process.env.OPENAI_API_KEY?.trim()});
}

async function consultar(req,res) {
  const s = await solicitacaoModel.buscar(id(req.params.id),id(req.params.solicitacaoId));
  const record=await solicitacaoModel.analise(s.id);
  if (record && req.query.recortes==='1') return res.json({versao:record.versao,revisao:record.revisao,
    resultado:{leitor:record.resultado.leitor,periodos:record.resultado.periodos.map(p=>({id:p.id,empresa:p.empresa,inicio:p.inicio,fim:p.fim,cnpj:p.cnpj,selecionado:p.selecionado,sugestoes_ctps:p.sugestoes_ctps || []}))}});
  res.json(record);
}
async function executar(req,res) {
  const s = await solicitacaoModel.buscar(id(req.params.id),id(req.params.solicitacaoId));
  const record=await analisar(s,req.body?.modo ?? 'local');
  res.json(req.query.resumo==='1' ? {versao:record.versao} : record);
}
async function revisar(req,res) {
  const s = await solicitacaoModel.buscar(id(req.params.id),id(req.params.solicitacaoId));
  const atual = await solicitacaoModel.analise(s.id);
  if (!atual) fail('Execute a análise antes de revisar.');
  if (!Number.isSafeInteger(req.body?.versao) || req.body.versao<1) fail('Versão inválida.');
  const revisao = validarRevisao(req.body,atual.resultado);
  res.json(await solicitacaoModel.revisar(s.id,req.body.versao,revisao,req.usuario.id));
}
export default { configuracao,consultar,executar,revisar };

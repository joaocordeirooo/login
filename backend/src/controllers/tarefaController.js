import tarefaModel from '../model/tarefaModel.js';
import { fail, required, id, choice } from '../utils/validacao.js';
async function listar(req,res) { res.json(await tarefaModel.listar(req.query.processo_id ? id(req.query.processo_id) : null)); }
async function catalogo(req,res) { res.json(await tarefaModel.catalogo()); }
async function setor(req,res) { res.status(201).json(await tarefaModel.organizar('setor',required(req.body.nome,'Setor',150))); }
async function fluxo(req,res) { res.status(201).json(await tarefaModel.organizar('fluxo',required(req.body.nome,'Fluxo',150),id(req.body.setor_id))); }
async function salvar(req,res) {
  const b = req.body;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.vencimento) || Number.isNaN(Date.parse(b.vencimento)) || new Date(b.vencimento).toISOString().slice(0,10) !== b.vencimento) fail('Informe uma data válida.');
  const dados = { processo_id:id(b.processo_id),titulo:required(b.titulo,'Tarefa',255),responsavel:String(b.responsavel || '').slice(0,150),
    vencimento:b.vencimento,prioridade:choice(b.prioridade,['Normal','Alta','Urgente']),setor_id:id(b.setor_id),fluxo_id:id(b.fluxo_id),
    responsavel_id:id(b.responsavel_id),descricao:String(b.descricao || '').slice(0,10000) };
  res.status(req.params.id ? 200 : 201).json(await tarefaModel.salvar(dados,req.params.id ? id(req.params.id) : null));
}
async function alterarSituacao(req,res) {
  if (typeof req.body.concluida !== 'boolean') fail('Situação inválida.');
  res.json(await tarefaModel.alterarSituacao([req.body.concluida,id(req.params.id)]));
}
async function detalhe(req,res) { res.json(await tarefaModel.detalhe(id(req.params.id))); }
async function anexar(req,res) {
  const nome = required(req.body.nome,'Nome do arquivo',255), mime = required(req.body.mime || 'application/octet-stream','Formato',150);
  const encoded = required(req.body.conteudo,'Arquivo',14000000);
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) fail('Arquivo inválido.');
  const buffer = Buffer.from(encoded,'base64');
  if (!buffer.length || buffer.length > 10*1024*1024) fail('O arquivo deve ter até 10 MB.');
  res.status(201).json(await tarefaModel.anexar(id(req.params.id),req.usuario.id,nome,mime,buffer));
}
async function solicitar(req,res) {
  const b = req.body;
  if (!Array.isArray(b.documentos) || !b.documentos.length || b.documentos.length > 100) fail('Selecione entre 1 e 100 documentos.');
  const documentos = [...new Set(b.documentos.map(v => String(id(v))))];
  const tipos = b.tipos_documentos ?? {};
  if (typeof tipos !== 'object' || Array.isArray(tipos)) fail('Classificação de documentos inválida.');
  for (const [documentoId,tipo] of Object.entries(tipos)) {
    if (!documentos.includes(documentoId)) fail('Classifique apenas os documentos selecionados.');
    choice(tipo,['Calculo','CNIS','CTPS','Apoio']);
  }
  res.status(201).json(await tarefaModel.solicitar(id(req.params.id),req.usuario.id,choice(b.canal,['Email','WhatsApp']),String(b.observacoes || '').slice(0,10000),documentos,tipos));
}
export default { listar,catalogo,setor,fluxo,salvar,alterarSituacao,detalhe,anexar,solicitar };

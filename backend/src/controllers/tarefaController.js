import tarefaModel from '../model/tarefaModel.js';
import { fail, required, id, choice } from '../utils/validacao.js';
async function listar(req, res) {
  return res.json(await tarefaModel.listar());
}
async function criar(req, res) {
  const b = req.body;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.vencimento) || Number.isNaN(Date.parse(b.vencimento)) || new Date(b.vencimento).toISOString().slice(0, 10) !== b.vencimento) fail('Informe uma data válida.');
  res.status(201).json(await tarefaModel.criar([id(b.processo_id), required(b.titulo, 'Tarefa', 255), String(b.responsavel || '').slice(0, 150), b.vencimento, choice(b.prioridade, ['Normal', 'Alta', 'Urgente'])]));
}
async function alterarSituacao(req, res) {
  if (typeof req.body.concluida !== 'boolean') fail('Situação inválida.');
  res.json(await tarefaModel.alterarSituacao([req.body.concluida, id(req.params.id)]));
}
export default {
  listar,
  criar,
  alterarSituacao
};

import processoModel from '../model/processoModel.js';
import { required, id, choice } from '../utils/validacao.js';
function processo(b) {
  return [id(b.cliente_id), required(b.titulo, 'Título', 255), required(b.tipo, 'Tipo', 150), choice(b.natureza, ['Administrativo', 'Judicial', 'Consultivo']), String(b.numero || '').slice(0, 100), choice(b.status, ['Em análise', 'Em andamento', 'Aguardando cliente', 'Concluído', 'Arquivado']), String(b.responsavel || '').slice(0, 150), String(b.descricao || '').slice(0, 10000)];
}
async function listar(req, res) {
  return res.json(await processoModel.listar());
}
async function criar(req, res) {
  return res.status(201).json(await processoModel.criar(processo(req.body)));
}
async function atualizar(req, res) {
  return res.json(await processoModel.atualizar([...processo(req.body), id(req.params.id)]));
}
async function buscarPorId(req, res) {
  const pid = id(req.params.id);
  const p = await processoModel.buscarPorId([pid]);
  p.movimentacoes = await processoModel.listarMovimentacoes([pid]);
  p.documentos = await processoModel.listarDocumentos([pid]);
  res.json(p);
}
export default {
  listar,
  criar,
  atualizar,
  buscarPorId
};

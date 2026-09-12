import movimentacaoModel from '../model/movimentacaoModel.js';
import { required, id, choice } from '../utils/validacao.js';
async function criar(req, res) {
  return res.status(201).json(await movimentacaoModel.criar([id(req.params.id), req.usuario.id, choice(req.body.tipo, ['Anotação', 'Atendimento', 'Análise', 'Documento recebido', 'Documento devolvido', 'Andamento']), required(req.body.descricao, 'Descrição')]));
}
export default {
  criar
};

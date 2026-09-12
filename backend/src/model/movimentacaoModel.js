import { one } from './query.js';
async function criar(valores) {
  return one('INSERT INTO movimentacoes(processo_id,autor_id,tipo,descricao) VALUES($1,$2,$3,$4) RETURNING *', valores);
}
export default {
  criar
};

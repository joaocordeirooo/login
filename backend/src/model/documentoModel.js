import { one } from './query.js';
async function criar(valores) {
  return one('INSERT INTO documentos(processo_id,autor_id,nome,mime,conteudo) VALUES($1,$2,$3,$4,$5) RETURNING id,nome', valores);
}
async function baixar(valores) {
  return one('SELECT * FROM documentos WHERE id=$1', valores);
}
export default {
  criar,
  baixar
};

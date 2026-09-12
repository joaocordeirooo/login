import pool from '../config/database.js';
import { one } from './query.js';
async function listar(valores) {
  return (await pool.query('SELECT p.*,c.nome AS cliente FROM processos p JOIN clientes c ON c.id=p.cliente_id ORDER BY p.atualizado_em DESC', valores)).rows;
}
async function criar(valores) {
  return one('INSERT INTO processos(cliente_id,titulo,tipo,natureza,numero,status,responsavel,descricao) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *', valores);
}
async function atualizar(valores) {
  return one('UPDATE processos SET cliente_id=$1,titulo=$2,tipo=$3,natureza=$4,numero=$5,status=$6,responsavel=$7,descricao=$8,atualizado_em=NOW() WHERE id=$9 RETURNING *', valores);
}
async function buscarPorId(valores) {
  return one('SELECT p.*,c.nome AS cliente FROM processos p JOIN clientes c ON c.id=p.cliente_id WHERE p.id=$1', valores);
}
async function listarMovimentacoes(valores) {
  return (await pool.query('SELECT m.*,u.nome AS autor FROM movimentacoes m JOIN usuarios u ON u.id=m.autor_id WHERE processo_id=$1 ORDER BY m.criado_em DESC,m.id DESC', valores)).rows;
}
async function listarDocumentos(valores) {
  return (await pool.query('SELECT id,nome,mime,criado_em,octet_length(conteudo) AS tamanho FROM documentos WHERE processo_id=$1 ORDER BY criado_em DESC', valores)).rows;
}
export default {
  listar,
  criar,
  atualizar,
  buscarPorId,
  listarMovimentacoes,
  listarDocumentos
};

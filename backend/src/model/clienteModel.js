import pool from '../config/database.js';
import { one } from './query.js';
async function listar(valores) {
  return (await pool.query('SELECT c.*, (SELECT COUNT(*)::int FROM processos p WHERE p.cliente_id=c.id) AS processos FROM clientes c ORDER BY c.nome', valores)).rows;
}
async function criar(valores) {
  return one('INSERT INTO clientes(nome,cpf,dados) VALUES($1,$2,$3) RETURNING *', valores);
}
async function atualizar(valores) {
  return one('UPDATE clientes SET nome=$1,cpf=$2,dados=$3,atualizado_em=NOW() WHERE id=$4 RETURNING *', valores);
}
async function buscarPorId(valores) {
  return one('SELECT * FROM clientes WHERE id=$1', valores);
}
export default {
  listar,
  criar,
  atualizar,
  buscarPorId
};

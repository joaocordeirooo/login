import pool from '../config/database.js';
import { one } from './query.js';
async function listar({q='',pagina=1,selecao=false}={}) {
  if (selecao) return (await pool.query('SELECT id,nome FROM clientes ORDER BY nome')).rows;
  const where="WHERE c.nome ILIKE $1 OR c.cpf LIKE $2";
  const params=['%'+q+'%',q.replace(/\D/g,'') ? '%'+q.replace(/\D/g,'')+'%' : '!'];
  const items=(await pool.query(`SELECT c.id,c.nome,CASE WHEN c.cpf IS NOT NULL THEN '***.***.***-' || RIGHT(c.cpf,2) ELSE NULL END AS cpf,
    jsonb_build_object('telefone',c.dados->>'telefone','email',c.dados->>'email') AS dados,
    (SELECT COUNT(*)::int FROM processos p WHERE p.cliente_id=c.id) AS processos FROM clientes c ${where} ORDER BY c.nome,c.id LIMIT 25 OFFSET $3`,[...params,(pagina-1)*25])).rows;
  const total=Number((await pool.query(`SELECT COUNT(*) FROM clientes c ${where}`,params)).rows[0].count);
  return {items,total,pagina};
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

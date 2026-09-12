import pool from '../config/database.js';
import { fail } from '../utils/validacao.js';

async function existeUsuario() {
  const resultado = await pool.query('SELECT 1 FROM usuarios LIMIT 1');
  return resultado.rowCount > 0;
}

async function buscarPorEmail(email) {
  const resultado = await pool.query('SELECT * FROM usuarios WHERE email=$1 AND ativo=true', [email]);
  return resultado.rows[0];
}

async function buscarAtivoPorId(id) {
  const resultado = await pool.query('SELECT id,nome,email,perfil FROM usuarios WHERE id=$1 AND ativo=true', [id]);
  return resultado.rows[0];
}

// A transação e o bloqueio impedem a criação simultânea de dois primeiros usuários.
async function criarPrimeiroUsuario({ nome, email, senhaHash }) {
  const conexao = await pool.connect();
  try {
    await conexao.query('BEGIN');
    await conexao.query('LOCK TABLE usuarios IN EXCLUSIVE MODE');
    const existentes = await conexao.query('SELECT 1 FROM usuarios LIMIT 1');
    if (existentes.rowCount) fail('O escritório já foi configurado.', 403);
    const resultado = await conexao.query(
      "INSERT INTO usuarios(nome,email,senha_hash,perfil) VALUES($1,$2,$3,'admin') RETURNING *",
      [nome, email, senhaHash],
    );
    await conexao.query('COMMIT');
    return resultado.rows[0];
  } catch (erro) {
    await conexao.query('ROLLBACK');
    throw erro;
  } finally {
    conexao.release();
  }
}

export default { existeUsuario, buscarPorEmail, buscarAtivoPorId, criarPrimeiroUsuario };

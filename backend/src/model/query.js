import pool from '../config/database.js';
import { fail } from '../utils/validacao.js';
const one = async (sql, values) => {
  const {
    rows
  } = await pool.query(sql, values);
  if (!rows[0]) fail('Registro não encontrado.', 404);
  return rows[0];
};
export { one };

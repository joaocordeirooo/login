import jwt from 'jsonwebtoken';
import jwtConfig from '../config/jwt.js';
import usuarioModel from '../model/usuarioModel.js';

export default async function autenticar(req, res, next) {
  let token;
  try {
    token = jwt.verify((req.headers.authorization || '').replace(/^Bearer /, ''), jwtConfig.secret);
  } catch {
    return res.status(401).json({ error: 'Sua sessão expirou. Entre novamente.' });
  }
  const usuario = await usuarioModel.buscarAtivoPorId(token.id);
  if (!usuario) return res.status(401).json({ error: 'Usuário inativo.' });
  req.usuario = usuario;
  next();
}

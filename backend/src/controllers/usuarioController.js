import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import usuarioModel from '../model/usuarioModel.js';
import jwtConfig from '../config/jwt.js';
import { fail, required } from '../utils/validacao.js';

function criarSessao(usuario) {
  return {
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil },
    token: jwt.sign({ id: usuario.id }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn }),
  };
}

async function consultarConfiguracao(req, res) {
  res.json({ necessario: !await usuarioModel.existeUsuario() });
}

async function cadastrarUsuario(req, res) {
  const nome = required(req.body.nome, 'Nome', 150);
  const email = required(req.body.email, 'E-mail', 255).toLowerCase();
  const senha = required(req.body.senha, 'Senha', 72);
  if (senha.length < 8 || !/^\S+@\S+\.\S+$/.test(email)) {
    fail('Informe um e-mail válido e senha com pelo menos 8 caracteres.');
  }
  const senhaHash = await bcrypt.hash(senha, 12);
  const usuario = await usuarioModel.criarPrimeiroUsuario({ nome, email, senhaHash });
  res.status(201).json(criarSessao(usuario));
}

async function login(req, res) {
  const email = required(req.body.email, 'E-mail', 255).toLowerCase();
  const senha = required(req.body.senha, 'Senha', 200);
  const usuario = await usuarioModel.buscarPorEmail(email);
  if (!usuario || !await bcrypt.compare(senha, usuario.senha_hash)) {
    fail('E-mail ou senha inválidos.', 401);
  }
  res.json(criarSessao(usuario));
}

function consultarSessao(req, res) { res.json(req.usuario); }

export default { consultarConfiguracao, cadastrarUsuario, login, consultarSessao };

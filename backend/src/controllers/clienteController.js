import clienteModel from '../model/clienteModel.js';
import { fail, required, id } from '../utils/validacao.js';
function cliente(body) {
  const nome = required(body.nome, 'Nome', 150),
    cpf = (body.cpf || '').replace(/\D/g, '');
  if (cpf && cpf.length !== 11) fail('O CPF deve ter 11 dígitos.');
  const dados = {};
  for (const key of ['rg', 'nascimento', 'nacionalidade', 'estado_civil', 'profissao', 'email', 'telefone', 'whatsapp', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'observacoes']) {
    if (body.dados?.[key] != null && typeof body.dados[key] !== 'string') fail('Dados do cliente inválidos.');
    dados[key] = (body.dados?.[key] || '').trim().slice(0, key === 'observacoes' ? 10000 : 255);
  }
  if (dados.email && !/^\S+@\S+\.\S+$/.test(dados.email)) fail('E-mail inválido.');
  return [nome, cpf || null, JSON.stringify(dados)];
}
async function listar(req, res) {
  const pagina=Number(req.query.pagina || 1);
  if (!Number.isSafeInteger(pagina) || pagina<1 || pagina>100000) fail('Página inválida.');
  const result=await clienteModel.listar({q:String(req.query.q || '').slice(0,150),pagina,selecao:req.query.selecao==='1'});
  return res.json(req.query.selecao==='1' || req.query.pagina ? result : result.items);
}
async function criar(req, res) {
  return res.status(201).json(await clienteModel.criar(cliente(req.body)));
}
async function atualizar(req, res) {
  return res.json(await clienteModel.atualizar([...cliente(req.body), id(req.params.id)]));
}
async function buscarPorId(req, res) {
  return res.json(await clienteModel.buscarPorId([id(req.params.id)]));
}
export default {
  listar,
  criar,
  atualizar,
  buscarPorId
};

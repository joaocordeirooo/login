import documentoModel from '../model/documentoModel.js';
import { fail, required, id } from '../utils/validacao.js';
async function criar(req, res) {
  const nome = required(req.body.nome, 'Nome do arquivo', 255),
    mime = required(req.body.mime || 'application/octet-stream', 'Formato', 150);
  const encoded = required(req.body.conteudo, 'Arquivo', 14000000);
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) fail('Arquivo inválido.');
  const buffer = Buffer.from(encoded, 'base64');
  if (!buffer.length || buffer.length > 10 * 1024 * 1024) fail('O arquivo deve ter até 10 MB.');
  res.status(201).json(await documentoModel.criar([id(req.params.id), req.usuario.id, nome, mime, buffer]));
}
async function baixar(req, res) {
  const d = await documentoModel.baixar([id(req.params.id)]);
  res.set('Content-Type', 'application/octet-stream').set('X-Content-Type-Options', 'nosniff').set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(d.nome)}`).send(d.conteudo);
}
export default {
  criar,
  baixar
};

import recorteModel from '../model/recorteModel.js';
import solicitacaoModel from '../model/solicitacaoModel.js';
import { processarCtps } from '../services/processarCtps.js';
import { validarTrechos,periodoDaAnalise } from '../services/validarRecorte.js';
import { id,fail } from '../utils/validacao.js';

async function contexto(req) {
  return solicitacaoModel.buscar(id(req.params.id),id(req.params.solicitacaoId));
}
function pagina(req) {
  const n = Number(req.params.pagina), rotation = Number(req.query.rotacao || 0);
  if (!Number.isInteger(n) || n<1 || n>100 || ![0,90,180,270].includes(rotation)) fail('Página ou rotação inválida.');
  return { pagina:n,rotacao:rotation };
}
async function listar(req,res) {
  const s=await contexto(req);
  res.json({ fontes:(await solicitacaoModel.fontes(s.id)).filter(d=>d.tipo==='CTPS'),recortes:await recorteModel.listar(s.id) });
}
async function visualizarFonte(req,res) {
  const s=await contexto(req), selection=pagina(req);
  const source=await recorteModel.fonte(s.id,id(req.params.documentoId));
  res.set('Cache-Control','no-store').json(await processarCtps({ operacao:'pagina',conteudo:source.conteudo,...selection }));
}
async function criar(req,res) {
  const s=await contexto(req);
  const trechos=validarTrechos(req.body?.trechos);
  const analise=await solicitacaoModel.analise(s.id);
  const periodoId=String(id(req.body.periodo_id));
  periodoDaAnalise(analise,periodoId,req.body.versao_analise);
  const documentos=[];
  let bytes=0;
  for (const docId of new Set(trechos.map(t=>t.documento_id))) {
    const fonte=await recorteModel.fonte(s.id,docId);
    bytes+=fonte.conteudo.length;
    if (bytes>25*1024*1024) fail('As CTPS selecionadas ultrapassam 25 MB.');
    documentos.push(fonte);
  }
  const gerado=await processarCtps({ operacao:'recortar',documentos,trechos });
  res.status(201).json(await recorteModel.salvar(s.id,periodoId,req.body.versao_analise,trechos,gerado,req.usuario.id));
}
async function visualizarRecorte(req,res) {
  const s=await contexto(req), selection=pagina(req);
  const arquivo=await recorteModel.arquivo(s.id,id(req.params.recorteId));
  res.set('Cache-Control','no-store').json(await processarCtps({ operacao:'pagina',conteudo:arquivo.conteudo,...selection }));
}
async function baixar(req,res) {
  const s=await contexto(req);
  const arquivo=await recorteModel.arquivo(s.id,id(req.params.recorteId));
  res.set('Cache-Control','no-store').set('Content-Type','application/pdf').set('X-Content-Type-Options','nosniff')
    .set('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(arquivo.nome)}`).send(arquivo.conteudo);
}
async function aprovar(req,res) {
  const s=await contexto(req);
  if (req.body?.conferido!==true) fail('Confirme a conferência visual de todas as páginas do PDF.');
  res.json(await recorteModel.aprovar(s.id,id(req.params.recorteId),req.usuario.id));
}
export default { listar,visualizarFonte,criar,visualizarRecorte,baixar,aprovar };

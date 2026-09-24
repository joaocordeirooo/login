import { Worker } from 'node:worker_threads';
import solicitacaoModel from '../model/solicitacaoModel.js';
import { fail } from '../utils/validacao.js';
import { analisarComIA } from './analiseIA.js';

const emAndamento = new Map();
function processar(documentos,cpf,temCtps,modo) {
  return new Promise((resolve,reject)=>{
    const worker = new Worker(new URL('./pdfAnaliseWorker.js',import.meta.url),{
      workerData:{ documentos,cpf,temCtps,modo },resourceLimits:{ maxOldGenerationSizeMb:256 }
    });
    let done = false;
    const finish = (error,result) => {
      if (done) return;
      done = true; clearTimeout(timer); void worker.terminate();
      if (error) reject(Object.assign(new Error(error),{ status:422 })); else resolve(result);
    };
    const timer = setTimeout(()=>finish('A leitura excedeu 45 segundos. Divida os documentos ou confira o formato dos PDFs.'),45000);
    worker.once('message',m=>finish(m.erro,m.resultado));
    worker.once('error',()=>finish('Não foi possível processar estes PDFs. Confira o formato e o tamanho dos arquivos.'));
    worker.once('exit',()=>{ if (!done) finish('A leitura do PDF foi interrompida. Tente novamente com arquivos menores.'); });
  });
}
export async function analisar(solicitacao,modo='local') {
  if (!['local','ia'].includes(modo)) fail('Modo de análise inválido.');
  const key = String(solicitacao.id);
  if (emAndamento.has(key)) {
    const current = emAndamento.get(key);
    if (current.modo!==modo) fail('Esta solicitação já está sendo analisada em outro modo. Aguarde.',409);
    return current.operation;
  }
  if (emAndamento.size>=2) fail('Há duas análises em andamento. Aguarde um momento e tente novamente.',429);
  const operation = (async()=>{
    const existente = await solicitacaoModel.analise(key);
    if (existente) {
      if (modo==='ia' && existente.resultado.leitor!=='openai-1') fail('Esta solicitação já tem uma análise local salva. Crie uma nova solicitação com os mesmos documentos para analisar com IA, preservando a revisão e os recortes existentes.',409);
      return existente;
    }
    if (modo==='ia' && !process.env.OPENAI_API_KEY?.trim()) fail('Configure OPENAI_API_KEY no backend/.env e reinicie o servidor para usar a análise com IA.',503);
    const fontes = await solicitacaoModel.fontes(key);
    const selecionados = fontes.filter(d=>(modo==='ia' ? ['Calculo','CNIS','CTPS'] : ['Calculo','CNIS']).includes(d.tipo));
    if (!selecionados.some(d=>d.tipo==='Calculo') || !selecionados.some(d=>d.tipo==='CNIS')) fail('Selecione e classifique pelo menos um cálculo e um CNIS na solicitação.');
    if (modo==='ia' && !selecionados.some(d=>d.tipo==='CTPS')) fail('Selecione uma CTPS para localizar as páginas com IA.');
    if (selecionados.length>10 || selecionados.reduce((s,d)=>s+Number(d.tamanho),0)>25*1024*1024) fail('Limite de análise: 10 arquivos, somando até 25 MB.');
    const documentos = [];
    for (const d of selecionados) documentos.push({ ...d,conteudo:await solicitacaoModel.conteudo(key,d.id) });
    const local = await processar(documentos,solicitacao.cpf,fontes.some(d=>d.tipo==='CTPS'),modo);
    const expectedPeriods=local.periodos.filter(p=>p.inicio && p.fim).map(p=>({empresa:p.empresa,inicio:p.inicio,fim:p.fim,fator:1.4,origem:p.original.origem}));
    const resultado = modo==='ia' ? await analisarComIA(documentos,local.fontes,solicitacao.cpf,{textInputs:local.textos_ia,expectedPeriods}) : local;
    return solicitacaoModel.guardar(key,resultado);
  })();
  emAndamento.set(key,{modo,operation});
  try { return await operation; } finally { emAndamento.delete(key); }
}

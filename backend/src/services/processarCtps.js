import { Worker } from 'node:worker_threads';
import { createHash } from 'node:crypto';
import { fail } from '../utils/validacao.js';

let ativos = 0;
const pendentes = new Map(), previews = new Map();
let previewBytes = 0;
export async function processarCtps(data) {
  if (data.operacao!=='pagina') return executar(data);
  const key=createHash('sha256').update(data.conteudo).update(`:${data.pagina}:${data.rotacao}`).digest('hex');
  if(previews.has(key)) return previews.get(key);
  if(pendentes.has(key)) return pendentes.get(key);
  const operation=executar(data).then(result=>{
    // Bounded in-memory previews; authorization is checked by controllers before every access.
    const size=result.imagem.length;
    if(size<=20*1024*1024){
      while(previews.size>=8 || previewBytes+size>20*1024*1024){const first=previews.keys().next().value;previewBytes-=previews.get(first).imagem.length;previews.delete(first);}
      previews.set(key,result);previewBytes+=size;
    }
    return result;
  });
  pendentes.set(key,operation);
  try{return await operation;}finally{pendentes.delete(key);}
}
async function executar(data) {
  if (ativos>=2) fail('Há duas operações de CTPS em andamento. Aguarde e tente novamente.',429);
  ativos++;
  try {
    return await new Promise((resolve,reject)=>{
      const worker = new Worker(new URL('./ctpsWorker.js',import.meta.url),{
        workerData:data,resourceLimits:{ maxOldGenerationSizeMb:384 }
      });
      let done=false;
      const finish = (error,result)=>{
        if (done) return;
        done=true; clearTimeout(timer); void worker.terminate();
        if (error) reject(Object.assign(new Error(error),{ status:422 })); else resolve(result);
      };
      const timer=setTimeout(()=>finish('A operação excedeu 45 segundos. Tente com menos trechos.'),45000);
      worker.once('message',m=>finish(m.erro,m.resultado));
      worker.once('error',()=>finish('Não foi possível renderizar o PDF. Confira o arquivo e tente novamente.'));
      worker.once('exit',()=>{ if (!done) finish('A renderização foi interrompida. Tente com menos trechos.'); });
    });
  } finally { ativos--; }
}

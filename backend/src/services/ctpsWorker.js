import { parentPort,workerData } from 'node:worker_threads';
import { createHash } from 'node:crypto';
import { createCanvas } from '@napi-rs/canvas';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PDFDocument } from 'pdf-lib';
import { fileURLToPath } from 'node:url';

const standardFontDataUrl = fileURLToPath(new URL('../../node_modules/pdfjs-dist/standard_fonts/',import.meta.url)).replaceAll('\\','/');

async function abrir(bytes) {
  if (Buffer.from(bytes).subarray(0,1024).indexOf('%PDF-')<0) throw new Error('O arquivo selecionado não é um PDF válido.');
  const task = getDocument({ data:new Uint8Array(bytes),useWorkerFetch:false,standardFontDataUrl,
    stopAtErrors:true,verbosity:0 });
  try {
    const pdf = await task.promise;
    if (pdf.numPages>100) throw new Error('A CTPS deve ter no máximo 100 páginas por arquivo.');
    return { pdf,task };
  } catch(e) { await task.destroy(); throw e; }
}

async function renderizar(pdf,pagina,rotacao,preview=false) {
  if (!Number.isInteger(pagina) || pagina<1 || pagina>pdf.numPages) throw new Error('Página não encontrada no PDF.');
  const page = await pdf.getPage(pagina);
  const rotation = (page.rotate+rotacao)%360;
  const base = page.getViewport({ scale:1,rotation });
  if (!Number.isFinite(base.width*base.height) || base.width<1 || base.height<1 || base.width*base.height>5000000) throw new Error('Dimensões da página não suportadas.');
  const scale = Math.min(preview ? 1.5 : 2.5,Math.sqrt((preview ? 2500000 : 12000000)/(base.width*base.height)));
  const viewport = page.getViewport({ scale,rotation });
  const canvas = createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
  await page.render({ canvasContext:canvas.getContext('2d'),viewport,background:'rgb(255,255,255)' }).promise;
  page.cleanup();
  return { canvas,base,scale };
}

async function executar() {
  if (workerData.operacao==='pagina') {
    const { pdf,task } = await abrir(workerData.conteudo);
    try {
      const { canvas } = await renderizar(pdf,workerData.pagina,workerData.rotacao,true);
      return { paginas:pdf.numPages,largura:canvas.width,altura:canvas.height,imagem:canvas.toBuffer('image/png').toString('base64') };
    } finally { await task.destroy(); }
  }
  const output = await PDFDocument.create();
  output.setCreator('FORENTIS'); output.setProducer('FORENTIS');
  const sources = new Map(), fontes = [];
  let bytesTotal = 0;
  try {
    for (const d of workerData.documentos) {
      sources.set(String(d.id),await abrir(d.conteudo));
      fontes.push({ documento_id:String(d.id),nome:d.nome,sha256:createHash('sha256').update(d.conteudo).digest('hex') });
    }
    for (const trecho of workerData.trechos) {
      const source = sources.get(trecho.documento_id);
      if (!source) throw new Error('Documento de origem não encontrado.');
      const { canvas,scale } = await renderizar(source.pdf,trecho.pagina,trecho.rotacao);
      //rendereização
      const left = Math.ceil(trecho.x*canvas.width), top = Math.ceil(trecho.y*canvas.height);
      const right = Math.min(canvas.width,Math.floor((trecho.x+trecho.largura)*canvas.width));
      const bottom = Math.min(canvas.height,Math.floor((trecho.y+trecho.altura)*canvas.height));
      if (right-left<8 || bottom-top<8) throw new Error('Trecho pequeno demais. Aumente a área selecionada.');
      const cropped = createCanvas(right-left,bottom-top);
      cropped.getContext('2d').drawImage(canvas,left,top,cropped.width,cropped.height,0,0,cropped.width,cropped.height);
      const png = cropped.toBuffer('image/png');
      bytesTotal += png.length;
      if (bytesTotal>25*1024*1024) throw new Error('O recorte ultrapassou 25 MB. Selecione menos páginas.');
      const image = await output.embedPng(png);
      const page = output.addPage([cropped.width/scale,cropped.height/scale]);
      page.drawImage(image,{ x:0,y:0,width:page.getWidth(),height:page.getHeight() });
      canvas.width=1; canvas.height=1; cropped.width=1; cropped.height=1;
    }
    const pdf = await output.save();
    if (pdf.byteLength>25*1024*1024) throw new Error('O PDF recortado ultrapassou 25 MB.');
    return { pdf,fontes };
  } finally { for (const s of sources.values()) await s.task.destroy(); }
}

try { parentPort.postMessage({ resultado:await executar() }); }
catch(e) { parentPort.postMessage({ erro:e.name==='PasswordException' ? 'PDF protegido por senha. Anexe uma cópia desbloqueada.' : e.message }); }

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument,rgb } from 'pdf-lib';
import { createCanvas,loadImage } from '@napi-rs/canvas';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { processarCtps } from '../src/services/processarCtps.js';
import { validarTrechos,periodoDaAnalise } from '../src/services/validarRecorte.js';

test('Recortes rejeitam áreas fora da página, excessos e revisão desatualizada',()=>{
  const t={documento_id:'1',pagina:1,rotacao:0,x:0,y:0,largura:1,altura:1};
  assert.deepEqual(validarTrechos([t]),[t]);
  for(const bad of [{x:-.1},{x:.9,largura:.2},{altura:0},{largura:NaN},{pagina:0},{pagina:1.2},{rotacao:45},{documento_id:'../arquivo'}]) assert.throws(()=>validarTrechos([{...t,...bad}]));
  assert.throws(()=>validarTrechos([]));assert.throws(()=>validarTrechos(Array(13).fill(t)));
  const a={versao:2,resultado:{periodos:[{id:'1',selecionado:true,empresa:'Empresa teste'}]}};
  assert.equal(periodoDaAnalise(a,'1',2).empresa,'Empresa teste');
  assert.throws(()=>periodoDaAnalise(a,'1',1),e=>e.status===412);
  assert.throws(()=>periodoDaAnalise(a,'2',2));
});

test('PDF novo contém apenas os pixels selecionados, respeita rotação e ordem',async()=>{
  const doc=await PDFDocument.create();const p=doc.addPage([400,400]);
  p.drawRectangle({x:0,y:0,width:200,height:400,color:rgb(1,0,0)});
  p.drawRectangle({x:200,y:0,width:200,height:400,color:rgb(0,0,1)});
  p.drawText('CONTRATO DE OUTRA EMPRESA',{x:10,y:200,size:8});
  const conteudo=await doc.save();
  const generated=await processarCtps({operacao:'recortar',documentos:[{id:'1',nome:'sintetico.pdf',conteudo}],trechos:validarTrechos([
    {documento_id:'1',pagina:1,rotacao:0,x:.5,y:0,largura:.5,altura:1},
    {documento_id:'1',pagina:1,rotacao:90,x:0,y:0,largura:1,altura:.5}
  ])});
  assert.equal(generated.fontes[0].sha256.length,64);
  const result=await PDFDocument.load(generated.pdf);
  assert.equal(result.getPageCount(),2);
  assert.equal(result.getPage(0).getWidth(),200);assert.equal(result.getPage(0).getHeight(),400);
  const task=getDocument({data:new Uint8Array(generated.pdf),verbosity:0});
  try {const read=await task.promise;assert.equal((await (await read.getPage(1)).getTextContent()).items.length,0);assert.equal(await read.getAttachments(),null);}finally{await task.destroy();}
  for (const [page,color] of [[1,[0,0,255]],[2,[255,0,0]]]) {
    const rendered=await processarCtps({operacao:'pagina',conteudo:generated.pdf,pagina:page,rotacao:0});
    const img=await loadImage(Buffer.from(rendered.imagem,'base64'));const canvas=createCanvas(img.width,img.height);
    canvas.getContext('2d').drawImage(img,0,0);
    const pixel=[...canvas.getContext('2d').getImageData(10,10,1,1).data].slice(0,3);
    assert.deepEqual(pixel,color);
  }
  await assert.rejects(processarCtps({operacao:'pagina',conteudo,pagina:2,rotacao:0}),/Página não encontrada/);
  await assert.rejects(processarCtps({operacao:'pagina',conteudo:Buffer.from('inválido'),pagina:1,rotacao:0}),/PDF válido/);
});

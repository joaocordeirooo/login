import { parentPort, workerData } from 'node:worker_threads';
import { createHash } from 'node:crypto';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { lerCalculo, lerCnis, cruzar, linhas } from './interpretarDocumentos.js';

async function executar() {
  const calculos = [], vinculos = [], avisos = [], fontes = [], cpfs = new Set(),textosIA = [];
  let totalPages = 0, linhasCalculo = 0;
  for (const doc of workerData.documentos) {
    if (Buffer.from(doc.conteudo).subarray(0,1024).indexOf('%PDF-')<0) throw new Error(`${doc.nome}: selecione um PDF válido.`);
    const task = getDocument({ data:new Uint8Array(doc.conteudo),useSystemFonts:true,useWorkerFetch:false,
      disableFontFace:true,stopAtErrors:true,verbosity:0 });
    try {
      const pdf = await task.promise;
      totalPages += pdf.numPages;
      if (workerData.modo==='ia' && totalPages>60) throw new Error('A análise com IA aceita até 60 páginas no total. Divida os documentos em solicitações menores.');
      if (pdf.numPages>60 || totalPages>120) throw new Error('Limite de análise: 60 páginas por arquivo e 120 páginas por solicitação.');
      const pages = [];
      for (let n=1;n<=pdf.numPages;n++) {
        const page = await pdf.getPage(n);
        const content = await page.getTextContent();
        if (content.items.length>20000) throw new Error(`${doc.nome}: página muito complexa para análise automática.`);
        pages.push({ page:n,items:content.items.filter(i=>i.str?.trim()).map(i=>({ text:i.str,x:i.transform[4],y:i.transform[5],w:i.width })) });
        page.cleanup();
      }
      fontes.push({ documento_id:String(doc.id),nome:doc.nome,tipo:doc.tipo,paginas:pdf.numPages,sha256:createHash('sha256').update(doc.conteudo).digest('hex') });
      let legivel=false;
      if (doc.tipo==='Calculo') {
        const parsed = lerCalculo({ ...doc,pages });
        calculos.push(...parsed.periodos); avisos.push(...parsed.avisos); linhasCalculo += parsed.lidas;
        legivel=parsed.lidas>0 && parsed.avisos.length===0;
      } else if (doc.tipo==='CNIS') {
        const parsed = lerCnis({ ...doc,pages });
        vinculos.push(...parsed.vinculos); avisos.push(...parsed.avisos); parsed.cpfs.forEach(c=>cpfs.add(c));
        legivel=parsed.vinculos.length>0 && parsed.avisos.length===0;
      }
      if (workerData.modo==='ia' && legivel) {
        const textoPages=pages.map(p=>({pagina:p.page,texto:linhas(p.items).map(l=>l.text).join('\n')}));
        // Only replace the PDF when every page has useful text and the known table reader succeeded.
        // CTPS and unrecognized/scanned files retain visual PDF input.
        if (textoPages.every(p=>p.texto.length>=200)) textosIA.push({documento_id:String(doc.id),paginas:textoPages});
      }
    } catch (e) {
      if (e.name==='PasswordException') throw new Error(`${doc.nome}: PDF protegido por senha. Anexe uma cópia desbloqueada.`);
      if (['InvalidPDFException','UnknownErrorException'].includes(e.name)) throw new Error(`${doc.nome}: não foi possível ler o PDF. Confira se o arquivo está íntegro.`);
      throw e;
    } finally { await task.destroy(); }
  }
  const cpf = String(workerData.cpf || '').replace(/\D/g,'');
  if (cpfs.size>1 || (cpf && [...cpfs].some(c=>c!==cpf))) throw new Error('O CPF do CNIS não corresponde ao cliente ou há CNIS de pessoas diferentes. Confira os documentos selecionados.');
  if (!cpf || !cpfs.size) avisos.push('Não foi possível conferir o CPF entre o cadastro e o CNIS. Confirme a identidade do cliente nos documentos.');
  if (!workerData.temCtps) avisos.push('Nenhuma CTPS selecionada. Ela será necessária na etapa de recorte.');
  if (calculos.length>100) throw new Error('A solicitação excede 100 períodos. Divida os documentos em solicitações menores.');
  return { leitor:'tabelas-1',criterio:'fator_1_4',fontes,linhas_calculo:linhasCalculo,avisos:[...new Set(avisos)],
    vinculos_cnis:vinculos,periodos:cruzar(calculos,vinculos),...(workerData.modo==='ia' ? {textos_ia:textosIA} : {}) };
}
try { parentPort.postMessage({ resultado:await executar() }); }
catch(e) { parentPort.postMessage({ erro:e.message }); }

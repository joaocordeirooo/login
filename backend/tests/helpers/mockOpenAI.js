// Loaded only by the integration test subprocess. Never sends files to a real API.
import nodemailer from 'nodemailer';
const sent=new Set();
nodemailer.createTransport=()=>({verify:async()=>true,close(){},sendMail:async mail=>{
  if(sent.has(mail.subject))throw new Error('Duplicate SMTP delivery');
  if(mail.to.address==='timeout@empresa.test')throw Object.assign(new Error('fixture-secret'),{code:'ETIMEDOUT'});
  if(mail.to.address==='reject@empresa.test')throw Object.assign(new Error('fixture-secret'),{code:'EAUTH'});
  if(!mail.attachments.length || !mail.attachments.every(a=>Buffer.isBuffer(a.content)))throw new Error('Missing attachments');
  sent.add(mail.subject);return {accepted:[mail.to.address],rejected:[]};
}});
const originalFetch=globalThis.fetch;
globalThis.fetch=async function(url,options) {
  if (typeof url==='string' && url.startsWith('https://open.cnpja.com/office/')) return new Response(JSON.stringify({taxId:url.split('/').pop(),company:{name:'EMPRESA TESTE CNPJA',members:[{cpf:'NAO_EXIBIR'}]},emails:[{address:'rh@empresa.test'}],phones:[{area:'49',number:'999999999'}],status:{text:'Ativa'},extra:'NAO_EXIBIR'}),{status:200,headers:{'Content-Type':'application/json'}});
  if (url!=='https://api.openai.com/v1/responses') return originalFetch(url,options);
  const body=JSON.parse(options.body);
  const content=body.input[0].content;
  const manifest=JSON.parse(content[0].text.slice('Manifesto de arquivos: '.length));
  if (manifest.length!==3 || content.length!==5) throw new Error('Unexpected sources in AI request');
  const origin=tipo=>({documento_id:manifest.find(d=>d.tipo===tipo).documento_id,pagina:1,trecho:'Evidência fictícia para teste de integração.'});
  const result={linhas_calculo:3,avisos:[],identidades:[],periodos:[{empresa:'EMPRESA ALFA LTDA',inicio:'2000-01-03',fim:'2009-01-12',fator:'1.40',origem:origin('Calculo'),pendencias:[],
    cnis:{empresa:'EMPRESA ALFA LTDA',codigo:'01603889000164',inicio:'2000-01-03',fim:'2009-01-12',emissao:'2024-12-10',origem:origin('CNIS')},
    ctps:[{documento_id:manifest.find(d=>d.tipo==='CTPS').documento_id,pagina:1,lado:'esquerda',motivo:'Contrato da empresa ALFA.'}]}]};
  result.periodos.push({...result.periodos[0],empresa:'EMPRESA BETA LTDA',inicio:'2009-04-13',fim:'2026-02-13',cnis:null,ctps:[]});
  return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(result)}]}]}),{status:200,headers:{'Content-Type':'application/json'}});
};

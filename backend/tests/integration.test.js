import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { pdf,calculationItems,cnisItems } from './helpers/pdf.js';
dotenv.config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
  quiet: true
});
const {
  default: pool
} = await import('../src/config/database.js');
const base = 'http://127.0.0.1:3098/api';
let token, userId, clientId, caseId, server, sectorId, otherClientId, otherCaseId,testCnpj;
async function request(path, body, method, auth = true) {
  const r = await fetch(base + path, {
    method: method || (body ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      ...(auth && token ? {
        Authorization: 'Bearer ' + token
      } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await r.json();
  return {
    status: r.status,
    data
  };
}
test('Fluxo integrado: autenticação, cliente, caso, histórico, documento e tarefa', async () => {
  try {
    server = spawn(process.execPath, ['--import','./tests/helpers/mockOpenAI.js','src/server.js'], {
      cwd: fileURLToPath(new URL('../', import.meta.url)),
      env: {
        ...process.env,
        PORT: '3098',OPENAI_API_KEY:'fixture-key',OPENAI_MODEL:'fixture-model',
        SMTP_HOST:'smtp.fixture.test',SMTP_PORT:'587',SMTP_SECURE:'false',SMTP_USER:'sender@fixture.test',SMTP_PASS:'fixture-secret',SMTP_FROM:'Teste <sender@fixture.test>'
      },
      stdio: 'pipe',
      windowsHide: true
    });
    for (let i = 0; i < 50; i++) {
      try {
        await fetch(base + '/status');
        break;
      } catch {
        await delay(100);
      }
    }
    assert.equal((await request('/clientes', undefined, undefined, false)).status, 401);
    for (const path of ['/processos', '/tarefas', '/documentos/1', '/me']) {
      assert.equal((await request(path, undefined, undefined, false)).status, 401);
    }
    const email = 'integration-' + Date.now() + '@forentis.test',
      senha = 'Teste-local-9382!';
    userId = (await pool.query("INSERT INTO usuarios(nome,email,senha_hash,perfil) VALUES('Teste automatizado',$1,$2,'usuario') RETURNING id", [email, await bcrypt.hash(senha, 12)])).rows[0].id;
    assert.equal((await request('/usuarios/login', {
      email,
      senha: 'errada'
    })).status, 401);
    const login = await request('/usuarios/login', {
      email,
      senha
    });
    assert.equal(login.status, 200);
    token = login.data.token;
    assert.equal((await request('/me')).data.id, userId);
    assert.equal((await request('/setup', {
      nome: 'Outro',
      email: 'outro@test.local',
      senha
    })).status, 403);
    assert.equal((await request('/clientes', {
      nome: ''
    })).status, 400);
    const client = await request('/clientes', {
      nome: 'Cliente teste de integração',
      cpf: '',
      dados: {
        telefone: '49999991111',
        logradouro: 'Rua de teste'
      }
    });
    assert.equal(client.status, 201);
    clientId = client.data.id;
    assert.equal((await request('/clientes/' + clientId, {
      nome: 'Cliente atualizado',
      dados: {
        cidade: 'Fraiburgo'
      }
    }, 'PUT')).status, 200);
    const c = await request('/processos', {
      cliente_id: clientId,
      titulo: 'Aposentadoria',
      tipo: 'Previdenciário',
      natureza: 'Administrativo',
      status: 'Em análise'
    });
    assert.equal(c.status, 201);
    caseId = c.data.id;
    const atualizado = await request('/processos/' + caseId, {
      ...c.data,
      status: 'Em andamento',
      responsavel: 'Responsável de teste',
    }, 'PUT');
    assert.equal(atualizado.status, 200);
    assert.equal(atualizado.data.status, 'Em andamento');
    assert.equal((await request('/processos/' + caseId + '/movimentacoes', {
      tipo: 'Documento recebido',
      descricao: 'Recebida carteira de trabalho.'
    })).status, 201);
    const doc = await request('/processos/' + caseId + '/documentos', {
      nome: 'teste.txt',
      mime: 'text/plain',
      conteudo: Buffer.from('Documento de teste').toString('base64')
    });
    assert.equal(doc.status, 201);
    const downloaded = await fetch(base + '/documentos/' + doc.data.id, {
      headers: {
        Authorization: 'Bearer ' + token
      }
    });
    assert.equal(await downloaded.text(), 'Documento de teste');
    assert.equal((await request('/tarefas', {
      processo_id: caseId,
      titulo: 'Inválida',
      vencimento: '2026-02-31',
      prioridade: 'Normal'
    })).status, 400);
    const catalog = (await request('/tarefas/catalogo')).data;
    const organization = { setor_id:catalog.setores[0].id,fluxo_id:catalog.fluxos.find(f => f.setor_id === catalog.setores[0].id).id,responsavel_id:userId };
    const task = await request('/tarefas', {
      ...organization,
      processo_id: caseId,
      titulo: 'Analisar documentos',
      vencimento: '2026-09-15',
      prioridade: 'Alta'
    });
    assert.equal(task.status, 201);
    const sector = await request('/tarefas/setores',{ nome:'Setor de teste ' + Date.now() });
    assert.equal(sector.status,201);
    sectorId = sector.data.id;
    const flow = await request('/tarefas/fluxos',{ nome:'Solicitação externa',setor_id:sectorId });
    assert.equal(flow.status,201);
    assert.equal((await request('/tarefas', { ...task.data,vencimento:'2026-09-15',fluxo_id:flow.data.id })).status,400);
    assert.equal((await request('/tarefas', { ...task.data,vencimento:'2026-09-15',fluxo_id:'999999999' })).status,400);
    assert.equal((await request('/tarefas', { ...task.data,vencimento:'2026-09-15',responsavel_id:'999999999' })).status,400);
    assert.equal((await request('/tarefas/' + task.data.id, { ...task.data,vencimento:'2026-10-01',titulo:'Solicitar PPP' },'PUT')).data.titulo,'Solicitar PPP');
    const attachment = await request('/tarefas/' + task.data.id + '/documentos', { nome:'ctps.txt',mime:'text/plain',conteudo:Buffer.from('CTPS de teste').toString('base64') });
    assert.equal(attachment.status,201);
    assert.equal((await request('/tarefas/' + task.data.id + '/solicitacoes', { canal:'Email',documentos:[] })).status,400);
    assert.equal((await request('/tarefas/' + task.data.id + '/solicitacoes', { canal:'Email',documentos:['999999999'] })).status,400);
    otherClientId = (await pool.query("INSERT INTO clientes(nome) VALUES('Cliente isolado de teste') RETURNING id")).rows[0].id;
    otherCaseId = (await pool.query("INSERT INTO processos(cliente_id,titulo,tipo) VALUES($1,'Outro caso','Teste') RETURNING id",[otherClientId])).rows[0].id;
    const foreignDoc = await request('/processos/' + otherCaseId + '/documentos',{ nome:'privado.txt',mime:'text/plain',conteudo:Buffer.from('Outro cliente').toString('base64') });
    assert.equal(foreignDoc.status,201);
    assert.equal((await request('/tarefas/' + task.data.id + '/solicitacoes', { canal:'WhatsApp',documentos:[foreignDoc.data.id] })).status,400);
    assert.equal((await request('/tarefas/' + task.data.id + '/solicitacoes', { canal:'Email',documentos:[doc.data.id],tipos_documentos:{ [doc.data.id]:'Invalido' } })).status,400);
    assert.equal((await request('/tarefas/' + task.data.id + '/solicitacoes', { canal:'Email',documentos:[doc.data.id],tipos_documentos:{ [attachment.data.id]:'CNIS' } })).status,400);
    const draft = await request('/tarefas/' + task.data.id + '/solicitacoes', { canal:'Email',documentos:[doc.data.id,attachment.data.id],observacoes:'Solicitar PPP',tipos_documentos:{ [doc.data.id]:'CNIS',[attachment.data.id]:'CTPS' } });
    assert.equal(draft.status,201);
    const taskDetail = (await request('/tarefas/' + task.data.id)).data;
    assert.equal(taskDetail.documentos.filter(d => d.anexado).length,1);
    assert.equal(taskDetail.solicitacoes.length,1);
    assert.equal(taskDetail.solicitacoes[0].documentos.length,2);
    assert.equal(taskDetail.solicitacoes[0].documentos.find(d => d.id === doc.data.id).tipo,'CNIS');
    assert.equal(taskDetail.solicitacoes[0].documentos.find(d => d.id === attachment.data.id).tipo,'CTPS');
    assert.ok(!taskDetail.documentos.some(d => d.id === foreignDoc.data.id));
    assert.equal((await request('/tarefas/' + task.data.id, {
      concluida: true
    }, 'PATCH')).data.concluida, true);
    assert.equal((await request('/tarefas/' + task.data.id, {
      concluida: false
    }, 'PATCH')).data.concluida, false);
    const detail = (await request('/processos/' + caseId)).data;
    assert.equal(detail.movimentacoes.length, 1);
    assert.equal(detail.movimentacoes[0].autor, 'Teste automatizado');
    assert.equal(detail.documentos.length, 2);
    const calcPdf = await request('/tarefas/' + task.data.id + '/documentos',{ nome:'calculo.pdf',mime:'application/pdf',conteudo:pdf(calculationItems).toString('base64') });
    const cnisPdf = await request('/tarefas/' + task.data.id + '/documentos',{ nome:'cnis.pdf',mime:'application/pdf',conteudo:pdf(cnisItems).toString('base64') });
    assert.equal(calcPdf.status,201); assert.equal(cnisPdf.status,201);
    const ctpsPdf = await request('/tarefas/' + task.data.id + '/documentos',{nome:'ctps.pdf',mime:'application/pdf',conteudo:pdf([['CONTRATO EMPRESA ALFA',60,700],['OUTRO EMPREGADOR',500,700]]).toString('base64')});
    assert.equal(ctpsPdf.status,201);
    const aiConfig=await request('/tarefas/ia/configuracao');
    assert.deepEqual(aiConfig.data,{disponivel:true});
    assert.equal((await request('/tarefas/ia/configuracao',undefined,undefined,false)).status,401);
    const aiDraft=await request('/tarefas/'+task.data.id+'/solicitacoes',{canal:'Email',documentos:[calcPdf.data.id,cnisPdf.data.id,ctpsPdf.data.id,attachment.data.id],tipos_documentos:{[calcPdf.data.id]:'Calculo',[cnisPdf.data.id]:'CNIS',[ctpsPdf.data.id]:'CTPS',[attachment.data.id]:'Apoio'}});
    const aiBase='/tarefas/'+task.data.id+'/solicitacoes/'+aiDraft.data.id;
    assert.equal((await request(aiBase+'/analise',{modo:'ia'},'POST',false)).status,401);
    assert.equal((await request(aiBase+'/analise',{modo:'invalid'})).status,400);
    const [aiResult,aiConcurrent]=await Promise.all([request(aiBase+'/analise',{modo:'ia'}),request(aiBase+'/analise',{modo:'ia'})]);
    assert.equal(aiResult.status,200,JSON.stringify(aiResult.data));
    assert.deepEqual(aiConcurrent.data,aiResult.data);
    assert.equal(aiResult.data.resultado.leitor,'openai-1');
    assert.equal(aiResult.data.resultado.fontes.length,3);
    assert.equal(aiResult.data.resultado.fontes.find(f=>f.tipo==='CTPS').paginas,1);
    assert.deepEqual((await request(aiBase+'/analise',{modo:'ia'})).data,aiResult.data);
    const aiSuggestions=aiResult.data.resultado.periodos[0].sugestoes_ctps;
    assert.equal(aiSuggestions[0].documento_id,ctpsPdf.data.id);
    const aiCrop=await request(aiBase+'/recortes',{periodo_id:'1',versao_analise:aiResult.data.versao,trechos:aiSuggestions});
    assert.equal(aiCrop.status,201,JSON.stringify(aiCrop.data));
    assert.equal(aiCrop.data.paginas,1);
    assert.equal((await request(aiBase+'/recortes/'+aiCrop.data.id+'/aprovar',{conferido:true})).status,400);
    testCnpj='99'+String(Date.now()).slice(-10);
    for (const length of [12,13]) {let sum=0,w=length-7;for(let i=0;i<length;i++){sum+=Number(testCnpj[i])*w;w=w===2?9:w-1;}testCnpj+=sum%11<2?'0':String(11-sum%11);}
    const contactReview=await request(aiBase+'/analise',{versao:aiResult.data.versao,concluida:false,avisos_conferidos:false,periodos:aiResult.data.resultado.periodos.map((p,i)=>({...p,cnpj:i===0?testCnpj:p.cnpj}))},'PUT');
    assert.equal(contactReview.status,200);
    const contactPath=aiBase+'/periodos/1/contato';
    assert.equal((await request(contactPath,{versao:contactReview.data.versao},'POST',false)).status,401);
    assert.equal((await request(contactPath,{versao:1})).status,412);
    assert.equal((await request(aiBase+'/periodos/2/contato',{versao:contactReview.data.versao})).status,400);
    const contact=await request(contactPath,{versao:contactReview.data.versao});
    assert.equal(contact.status,200,JSON.stringify(contact.data));assert.deepEqual(contact.data.emails,['rh@empresa.test']);assert.ok(!JSON.stringify(contact.data).includes('NAO_EXIBIR'));
    assert.deepEqual((await request(contactPath,{versao:contactReview.data.versao})).data,contact.data);
    const automation=await request(aiBase+'/automacao');
    assert.equal(automation.data.periodos[0].contato.cnpj,testCnpj);
    assert.equal(automation.data.resultado,undefined);assert.equal(automation.data.periodos[0].original,undefined);
    const draftPath=aiBase+'/periodos/1/mensagem',messageDraft=await request(draftPath);
    assert.equal(messageDraft.data.destinatario,'rh@empresa.test');
    assert.equal((await request(draftPath,{...messageDraft.data,anexos:[foreignDoc.data.id]},'PUT')).status,400);
    assert.equal((await request(draftPath,{...messageDraft.data,recorte_id:aiCrop.data.id},'PUT')).status,400);
    assert.equal((await request(draftPath,{...messageDraft.data,anexos:[attachment.data.id]},'PUT')).status,200);
    assert.equal((await request(draftPath,messageDraft.data,'PUT')).status,412);
    assert.equal((await request(draftPath)).data.revisao,1);
    const analysisDraft = await request('/tarefas/' + task.data.id + '/solicitacoes',{ canal:'Email',documentos:[calcPdf.data.id,cnisPdf.data.id,ctpsPdf.data.id],tipos_documentos:{ [calcPdf.data.id]:'Calculo',[cnisPdf.data.id]:'CNIS',[ctpsPdf.data.id]:'CTPS' } });
    const analysisPath = '/tarefas/' + task.data.id + '/solicitacoes/' + analysisDraft.data.id + '/analise';
    assert.equal((await request(analysisPath)).data,null);
    assert.equal((await request(analysisPath,{},'POST',false)).status,401);
    assert.equal((await request('/tarefas/999999999/solicitacoes/' + analysisDraft.data.id + '/analise',{})).status,404);
    assert.equal((await request('/tarefas/' + task.data.id + '/solicitacoes/' + draft.data.id + '/analise',{})).status,400);
    const analysis = await request(analysisPath,{});
    assert.equal(analysis.status,200);
    assert.equal(analysis.data.resultado.periodos.length,2);
    assert.equal(analysis.data.resultado.periodos[0].cnpj,'01603889000164');
    assert.equal(analysis.data.resultado.periodos[1].cnpj,'');
    assert.equal(analysis.data.resultado.fontes.length,2);
    assert.equal(analysis.data.resultado.fontes[0].sha256.length,64);
    const preserved=await request(analysisPath,{modo:'ia'});
    assert.equal(preserved.status,409);
    assert.match(preserved.data.error,/análise local salva/);
    const review = { versao:analysis.data.versao,concluida:true,avisos_conferidos:true,periodos:analysis.data.resultado.periodos };
    assert.equal((await request(analysisPath,review,'PUT')).status,400);
    review.periodos[0].conferido = true;
    Object.assign(review.periodos[1],{ cnpj:'10556018000209',conferido:true,observacoes:'Conferido na CTPS; período solicitado conforme cálculo, sem presumir demissão.' });
    const reviewed = await request(analysisPath,review,'PUT');
    assert.equal(reviewed.status,200);
    assert.equal(reviewed.data.revisao.concluida,true);
    assert.equal(reviewed.data.revisor_id,userId);
    assert.equal(reviewed.data.resultado.periodos[1].cnpj,'');
    assert.equal((await request(analysisPath,review,'PUT')).status,412);
    const cached = await request(analysisPath,{});
    assert.equal(cached.data.versao,reviewed.data.versao);
    assert.equal(cached.data.revisao.periodos[1].cnpj,'10556018000209');
    const cropBase=analysisPath.replace(/\/analise$/,'');
    const cropPath=cropBase+'/recortes';
    assert.equal((await request(cropPath)).data.fontes.length,1);
    const originalPreview=await request(cropBase+'/ctps/'+ctpsPdf.data.id+'/paginas/1');
    assert.equal(originalPreview.status,200);assert.equal(originalPreview.data.paginas,1);
    assert.ok(originalPreview.data.imagem.length>100);
    assert.equal((await request(cropBase+'/ctps/'+calcPdf.data.id+'/paginas/1')).status,404);
    assert.equal((await request(cropBase+'/ctps/'+foreignDoc.data.id+'/paginas/1')).status,404);
    const cropBody={periodo_id:'1',versao_analise:cached.data.versao,trechos:[{documento_id:ctpsPdf.data.id,pagina:1,rotacao:0,x:0,y:0,largura:.5,altura:1}]};
    assert.equal((await request(cropPath,cropBody,'POST',false)).status,401);
    assert.equal((await request(cropPath,{...cropBody,trechos:[{...cropBody.trechos[0],x:.9}]})).status,400);
    assert.equal((await request(cropPath,{...cropBody,trechos:[{...cropBody.trechos[0],documento_id:foreignDoc.data.id}]})).status,404);
    const crop=await request(cropPath,cropBody);
    assert.equal(crop.status,201);assert.equal(crop.data.paginas,1);assert.equal(crop.data.aprovado_em,null);
    assert.equal(crop.data.periodo.empresa,'EMPRESA ALFA LTDA');
    const croppedPreview=await request(cropPath+'/'+crop.data.id+'/paginas/1');
    assert.equal(croppedPreview.status,200);
    assert.equal((await request(cropPath+'/'+crop.data.id+'/aprovar',{})).status,400);
    const approved=await request(cropPath+'/'+crop.data.id+'/aprovar',{conferido:true});
    assert.equal(approved.status,200);assert.equal(approved.data.aprovador_id,userId);
    const mailPath=analysisPath.replace('/analise','/periodos/1/mensagem');
    assert.equal((await request('/tarefas/email/testar',{},'POST',false)).status,401);
    assert.equal((await request('/tarefas/email/testar',{})).data.conectado,true);
    const mailDraft=(await request(mailPath)).data;
    assert.equal(mailDraft.smtp.remetente,'sender@fixture.test');
    assert.doesNotMatch(JSON.stringify(mailDraft),/fixture-secret/);
    assert.equal((await request(mailPath,{...mailDraft,destinatario:'rh@empresa.test',recorte_id:crop.data.id},'PUT')).status,200);
    const currentMail=(await request(mailPath)).data;
    const sendBody={versao:currentMail.versao,revisao:currentMail.revisao,confirmado:true};
    assert.equal((await request(mailPath+'/enviar',sendBody,'POST',false)).status,401);
    assert.equal((await request(mailPath+'/enviar',{...sendBody,confirmado:false})).status,400);
    assert.equal((await request(mailPath+'/enviar',{...sendBody,revisao:0})).status,412);
    const deliveries=await Promise.all([request(mailPath+'/enviar',sendBody),request(mailPath+'/enviar',sendBody)]);
    assert.ok(deliveries.some(r=>r.status===200),JSON.stringify(deliveries));
    assert.ok(deliveries.every(r=>[200,409].includes(r.status)));
    assert.equal((await request(mailPath+'/enviar',sendBody)).data.ja_enviado,true);
    assert.equal((await request(mailPath)).data.envios[0].estado,'enviado');
    await request(mailPath,{...currentMail,destinatario:'timeout@empresa.test',assunto:'Teste de timeout'},'PUT');
    const timeoutMail=(await request(mailPath)).data;
    const uncertain=await request(mailPath+'/enviar',{versao:timeoutMail.versao,revisao:timeoutMail.revisao,confirmado:true});
    assert.equal(uncertain.status,502);assert.doesNotMatch(JSON.stringify(uncertain),/fixture-secret/);
    assert.equal((await request(mailPath)).data.envios[0].estado,'incerto');
    assert.equal((await request(mailPath+'/enviar',{versao:timeoutMail.versao,revisao:timeoutMail.revisao,confirmado:true})).status,409);
    const cropDownload=await fetch(base+cropPath+'/'+crop.data.id+'/pdf',{headers:{Authorization:'Bearer '+token}});
    assert.equal(cropDownload.status,200);assert.equal(cropDownload.headers.get('content-type'),'application/pdf');
    assert.equal(Buffer.from(await cropDownload.arrayBuffer()).subarray(0,5).toString(),'%PDF-');
    const revisedAgain=await request(analysisPath,{...review,versao:cached.data.versao},'PUT');
    assert.equal(revisedAgain.status,200);
    assert.equal((await request(cropPath+'/'+crop.data.id+'/aprovar',{conferido:true})).status,412);
    assert.equal((await request(cropPath,cropBody)).status,412);
    assert.equal((await request(cropPath)).data.recortes.length,1);
    assert.equal((await request('/tarefas/'+task.data.id+'/solicitacoes/'+draft.data.id+'/recortes/'+crop.data.id+'/paginas/1')).status,404);
    const pendingReview=await request(analysisPath,{...review,versao:revisedAgain.data.versao,concluida:false},'PUT');
    assert.equal(pendingReview.status,200);
    const pendingCrop=await request(cropPath,{...cropBody,versao_analise:pendingReview.data.versao});
    assert.equal(pendingCrop.status,201);
    assert.equal((await request(cropPath+'/'+pendingCrop.data.id+'/aprovar',{conferido:true})).status,400);
    const invalidDraft = await request('/tarefas/' + task.data.id + '/solicitacoes',{ canal:'Email',documentos:[doc.data.id,cnisPdf.data.id],tipos_documentos:{ [doc.data.id]:'Calculo',[cnisPdf.data.id]:'CNIS' } });
    const invalidPath = '/tarefas/' + task.data.id + '/solicitacoes/' + invalidDraft.data.id + '/analise';
    assert.equal((await request(invalidPath,{})).status,422);
    assert.equal((await request(invalidPath)).data,null);
    const foreignCpfPdf = await request('/tarefas/' + task.data.id + '/documentos',{ nome:'cnis-divergente.pdf',mime:'application/pdf',conteudo:pdf([...cnisItems,['CPF: 111.111.111-11',60,770],['CPF: 222.222.222-22',300,770]]).toString('base64') });
    const foreignCpfDraft = await request('/tarefas/' + task.data.id + '/solicitacoes',{ canal:'Email',documentos:[calcPdf.data.id,foreignCpfPdf.data.id],tipos_documentos:{ [calcPdf.data.id]:'Calculo',[foreignCpfPdf.data.id]:'CNIS' } });
    const cpfResult = await request('/tarefas/' + task.data.id + '/solicitacoes/' + foreignCpfDraft.data.id + '/analise',{});
    assert.equal(cpfResult.status,422);
    assert.match(cpfResult.data.error,/CPF/);
    assert.equal((await request('/clientes/' + clientId)).data.dados.cidade, 'Fraiburgo');
    const privateDetail=await request('/clientes/'+clientId);
    await request('/clientes/'+clientId,{nome:privateDetail.data.nome,cpf:'12345678901',dados:{...privateDetail.data.dados,rg:'RG_PRIVADO',logradouro:'RUA_PRIVADA',observacoes:'NOTA_PRIVADA'}},'PUT');
    const listPrivacy=await request('/clientes?pagina=1&q=12345678901');
    assert.equal(listPrivacy.data.items.length,1);assert.equal(listPrivacy.data.items[0].cpf,'***.***.***-01');
    assert.doesNotMatch(JSON.stringify(listPrivacy.data),/RG_PRIVADO|RUA_PRIVADA|NOTA_PRIVADA|12345678901/);
    const selector=await request('/clientes?selecao=1');assert.deepEqual(Object.keys(selector.data.find(c=>c.id===clientId)).sort(),['id','nome']);
    const dashboard=await request('/painel');assert.ok(dashboard.data.totais.clientes>=1);assert.ok(dashboard.data.casos.length<=5);assert.ok(dashboard.data.tarefas.length<=6);
    assert.equal((await request('/painel',undefined,undefined,false)).status,401);
    assert.doesNotMatch(JSON.stringify(dashboard.data),/RG_PRIVADO|RUA_PRIVADA|NOTA_PRIVADA|12345678901/);
    assert.equal((await fetch(base+'/painel',{headers:{Authorization:'Bearer '+token}})).headers.get('cache-control'),'no-store');
    const scoped=await request('/processos?cliente_id='+clientId);assert.ok(scoped.data.every(p=>p.cliente_id===clientId));
    for (const [path, expectedId] of [['/clientes', clientId], ['/processos', caseId], ['/tarefas', task.data.id]]) {
      const lista = await request(path);
      assert.equal(lista.status, 200);
      assert.ok(Array.isArray(lista.data));
      assert.ok(lista.data.some(item => item.id === expectedId));
    }
    assert.equal((await request('/processos/999999999')).status, 404);
  } finally {
    if (server) {
      server.kill();
      await delay(150);
    }
    if (caseId) {
      for (const table of ['tarefas', 'documentos', 'movimentacoes']) await pool.query(`DELETE FROM ${table} WHERE processo_id=$1`, [caseId]);
      await pool.query('DELETE FROM processos WHERE id=$1', [caseId]);
    }
    if (clientId) await pool.query('DELETE FROM clientes WHERE id=$1', [clientId]);
    if (otherCaseId) {
      await pool.query('DELETE FROM documentos WHERE processo_id=$1',[otherCaseId]);
      await pool.query('DELETE FROM processos WHERE id=$1',[otherCaseId]);
    }
    if (otherClientId) await pool.query('DELETE FROM clientes WHERE id=$1',[otherClientId]);
    if (sectorId) {
      await pool.query('DELETE FROM fluxos WHERE setor_id=$1',[sectorId]);
      await pool.query('DELETE FROM setores WHERE id=$1',[sectorId]);
    }
    if (userId) await pool.query('DELETE FROM usuarios WHERE id=$1', [userId]);
    if (testCnpj) await pool.query('DELETE FROM empresa_contatos WHERE cnpj=$1',[testCnpj]);
    await pool.end();
  }
});

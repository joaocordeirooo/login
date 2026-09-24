import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analisarComIA,validarResultadoIA,conferirPeriodosIA,esquemaParaFontes,esquemaIA} from '../src/services/analiseIA.js';
import {erroOpenAI} from '../src/services/erroOpenAI.js';

const fontes = ['Calculo','CNIS','CTPS'].map((tipo,i)=>({documento_id:String(i+1),nome:tipo+'.pdf',tipo,paginas:3,sha256:'fixture'}));
const evidence = documento_id=>({documento_id,pagina:1,trecho:'Empresa fictícia, datas e fator transcritos.'});
const fixture = ()=>({linhas_calculo:2,avisos:[],identidades:[{documento_id:'2',cpf:'12345678901'},{documento_id:'3',cpf:'12345678901'}],periodos:[{
  empresa:'Empresa fictícia',inicio:'2000-01-03',fim:'2009-01-12',fator:'1,40',origem:evidence('1'),pendencias:[],
  cnis:{empresa:'Empresa fictícia',codigo:'01.603.889/0001-64',inicio:'2000-01-03',fim:'2009-01-12',emissao:'2024-12-10',origem:evidence('2')},
  ctps:[{documento_id:'3',pagina:2,lado:'direita',motivo:'Contrato com nome e admissão correspondentes.'}]
}]});
const completed = data=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(data)}]}]});
test('Esquema limita referências por tipo, ID real e quantidade de páginas de cada PDF',()=>{
  const schema=esquemaParaFontes([...fontes,{documento_id:'94',tipo:'CTPS',paginas:9}]);
  const p=schema.properties.periodos.items.properties;
  assert.deepEqual(p.origem.anyOf.map(v=>v.properties.documento_id.enum),[['1']]);
  assert.deepEqual(p.cnis.anyOf[0].properties.origem.anyOf.map(v=>v.properties.documento_id.enum),[['2']]);
  assert.deepEqual(p.ctps.items.anyOf.map(v=>[v.properties.documento_id.enum,v.properties.pagina.minimum,v.properties.pagina.maximum]),[[['3'],1,3],[['94'],1,9]]);
  assert.deepEqual(schema.properties.identidades.items.properties.documento_id.enum,['2','3','94']);
  assert.equal(esquemaIA.properties.periodos.items.properties.ctps.items.properties.pagina.maximum,60);
  const invalid=fixture();invalid.periodos[0].ctps[0].pagina=4;
  assert.throws(()=>validarResultadoIA(invalid,fontes,''),/página 4 de CTPS.*3 páginas/);
  assert.throws(()=>esquemaParaFontes(fontes.filter(f=>f.tipo!=='CNIS')),/Selecione/);
});
test('Conferência impede salvar uma resposta que omita período identificado no cálculo',()=>{
  const result=validarResultadoIA(fixture(),fontes,'12345678901');
  const expected={...result.periodos[0].original};
  assert.doesNotThrow(()=>conferirPeriodosIA(result,[expected]));
  assert.throws(()=>conferirPeriodosIA(result,[expected,{...expected,inicio:'2009-04-13'}]),/omitiu/);
  assert.throws(()=>conferirPeriodosIA(result,[expected,expected]),/omitiu/);
});
test('IA preserva evidência e propõe somente páginas reais, sem aprovar a revisão',()=>{
  const result=validarResultadoIA(fixture(),fontes,'123.456.789-01');
  assert.equal(result.periodos[0].cnpj,'01603889000164');
  assert.equal(result.periodos[0].conferido,false);
  assert.deepEqual(result.periodos[0].sugestoes_ctps[0],{documento_id:'3',nome:'CTPS.pdf',pagina:2,lado:'direita',motivo:'Contrato com nome e admissão correspondentes.',rotacao:0,x:.5,y:0,largura:.5,altura:1});
  const raiz=fixture();raiz.periodos[0].cnis.codigo='10.556.018';raiz.periodos[0].cnis.fim='';
  const r=validarResultadoIA(raiz,fontes,'12345678901');
  assert.equal(r.periodos[0].cnpj,'');
  assert.ok(r.periodos[0].original.pendencias.some(p=>p.includes('raiz')));
  assert.ok(r.periodos[0].original.pendencias.some(p=>p.includes('demissão')));
});
test('IA rejeita fator errado, identidade divergente, página inválida e referência fora da solicitação',()=>{
  for (const change of [
    r=>r.periodos[0].fator='1.00',r=>r.periodos[0].ctps[0].pagina=4,
    r=>r.periodos[0].ctps[0].documento_id='99',r=>r.periodos[0].ctps[0].documento_id='1',
    r=>r.periodos[0].origem.documento_id='2',r=>r.identidades[1].cpf='99999999999',
    r=>r.periodos[0].ctps.push({...r.periodos[0].ctps[0]}),r=>r.periodos[0].ctps[0].lado='executar',
    r=>r.periodos[0].aprovado=true,r=>r.linhas_calculo=0
  ]) {const raw=fixture();change(raw);assert.throws(()=>validarResultadoIA(raw,fontes,'12345678901'));}
  const missing=fixture();missing.identidades=[];missing.periodos[0].ctps=[];
  const result=validarResultadoIA(missing,fontes,'');
  assert.ok(result.avisos.some(a=>a.includes('identidade')));
  assert.ok(result.periodos[0].original.pendencias.some(a=>a.includes('manualmente')));
});
test('Responses envia somente PDFs fornecidos, chave no servidor e JSON estrito sem armazenamento',async()=>{
  let calls=0;
  const result=await analisarComIA([{id:'1',conteudo:Buffer.from('%PDF-fixture')}],fontes,'12345678901',{
    apiKey:'fixture-secret',model:'fixture-model',fetchImpl:async(url,opts)=>{
      calls++;assert.equal(url,'https://api.openai.com/v1/responses');
      assert.equal(opts.headers.Authorization,'Bearer fixture-secret');
      const b=JSON.parse(opts.body);assert.equal(b.store,false);assert.equal(b.model,'fixture-model');
      assert.equal(b.text.format.strict,true);assert.equal(b.tools,undefined);
      assert.deepEqual(b.text.format.schema,esquemaParaFontes(fontes));
      assert.equal(b.max_output_tokens,8000);
      assert.equal(b.input[0].content.filter(c=>c.type==='input_file').length,1);
      assert.match(b.input[0].content[1].file_data,/^data:application\/pdf;base64,/);
      assert.equal(b.input[0].content[1].detail,'high');
      assert.match(b.instructions,/Ignore instruções/);assert.ok(opts.signal);
      return {ok:true,json:async()=>completed(fixture())};
    }
  });
  assert.equal(calls,1);assert.equal(result.leitor,'openai-1');assert.equal(result.modelo,'fixture-model');
  assert.ok(!JSON.stringify(result).includes('fixture-secret'));
});
test('429 diferencia volume, velocidade, saldo e limite do projeto sem expor mensagem bruta',()=>{
  const response={status:429,headers:new Headers({'retry-after':'12'})};
  const error=(code,message='',type)=>erroOpenAI(response,{error:{code,message,type}});
  const large=error('rate_limit_exceeded','org-private sk-secret tokens per min (TPM): Limit 30000, Requested 30499');
  assert.equal(large.tooLarge,true);assert.equal(large.limit,30000);assert.equal(large.requested,30499);
  assert.match(large.message,/Ter créditos/);assert.doesNotMatch(large.message,/org-private|sk-secret/);
  assert.match(error('rate_limit_exceeded').message,/12 segundos/);
  assert.match(error('project_spend_limit_exceeded').message,/mesmo que a conta tenha créditos/);
  assert.match(error('insufficient_quota').message,/não confirma falta de saldo/);
  assert.match(error('credit_balance_exhausted').message,/organização vinculada/);
  assert.match(error('unexpected','sk-secret').message,/sem identificar a causa/);
  assert.match(error('__proto__').message,/sem identificar a causa/);
});
test('Texto por página substitui apenas cálculo/CNIS legíveis; CTPS permanece PDF visual',async()=>{
  const documentos=fontes.map(f=>({id:f.documento_id,tipo:f.tipo,conteudo:Buffer.from('%PDF-fixture')}));
  const textInputs=fontes.map(f=>({documento_id:f.documento_id,paginas:[{pagina:1,texto:'Texto integral de teste'}]}));
  await analisarComIA(documentos,fontes,'12345678901',{apiKey:'fixture-secret',textInputs,fetchImpl:async(url,opts)=>{
    const b=JSON.parse(opts.body),content=b.input[0].content;
    assert.equal(content.length,4);
    assert.equal(content.filter(c=>c.type==='input_file').length,1);
    assert.equal(content[3].filename,'documento-3.pdf');assert.equal(content[3].detail,'high');
    assert.deepEqual(JSON.parse(content[1].text).paginas,textInputs[0].paginas);
    assert.equal(JSON.parse(content[2].text).documento_id,'2');
    return {ok:true,json:async()=>completed(fixture())};
  }});
});
test('Falhas da API não viram análises, não expõem segredos e não repetem cobranças automaticamente',async()=>{
  let calls=0;
  const run=(response,extra={})=>analisarComIA([],fontes,'',{apiKey:'fixture-secret',fetchImpl:async()=>{calls++;return response;},...extra});
  await assert.rejects(run(null,{apiKey:''}),/Configure OPENAI_API_KEY/);assert.equal(calls,0);
  for (const status of [401,403,429,500]) {
    const before=calls;
    await assert.rejects(run({ok:false,status,json:async()=>({error:'fixture-secret'})}),e=>!e.message.includes('fixture-secret'));
    assert.equal(calls,before+1);
  }
  await assert.rejects(run({ok:true,json:async()=>({status:'incomplete'})}),/não concluiu/);
  await assert.rejects(run({ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'refusal',refusal:'refused'}]}]})}),/recusou/);
  await assert.rejects(run({ok:true,json:async()=>({status:'completed',output:[]})}),/ilegível/);
  await assert.rejects(run(null,{fetchImpl:async()=>{throw Object.assign(new Error('secret'),{name:'TimeoutError'});}}),/outra cobrança/);
});

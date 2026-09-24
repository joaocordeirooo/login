import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerCalculo,lerCnis,cruzar } from '../src/services/interpretarDocumentos.js';
import { fatorSelecionado,cnpjValido,dataISO } from '../src/utils/documentosExternos.js';
import { validarRevisao } from '../src/services/revisarSolicitacao.js';
import { calculationItems,cnisItems,document } from './helpers/pdf.js';

test('Fator exato, datas reais e CNPJ completo',()=>{
  for (const factor of ['1,4','1.4','1,40','1.40',1.4]) assert.equal(fatorSelecionado(factor),true);
  for (const factor of ['1.00','1.45','11.4','SIM','1.4 anos','1,4000']) assert.equal(fatorSelecionado(factor),false);
  assert.equal(cnpjValido('01.603.889/0001-64'),true);
  assert.equal(cnpjValido('10.556.018/0002-09'),true);
  assert.equal(cnpjValido('10.556.018/0002-08'),false);
  for (const cnpj of ['10556018','01603889000165','00000000000000']) assert.equal(cnpjValido(cnpj),false);
  assert.equal(dataISO('31/02/2026'),null);
  assert.equal(dataISO('2026-02-31'),null);
});
test('Leitura por coluna, seleção por período e CNIS sem baixa',()=>{
  const calc = lerCalculo(document([...calculationItems,['1.40',600,600]]));
  const cnis = lerCnis(document(cnisItems,'2'));
  assert.equal(calc.lidas,3); assert.equal(calc.periodos.length,2);
  const periods = cruzar(calc.periodos,cnis.vinculos);
  assert.equal(periods[0].cnpj,'01603889000164');
  assert.equal(periods[0].original.pendencias.length,0);
  assert.equal(periods[1].cnpj,'');
  assert.equal(periods[1].original.cnis.codigo,'10556018');
  assert.equal(periods[1].original.cnis.fim,null);
  assert.equal(periods[1].fim,'2026-02-13');
  assert.equal(periods[1].original.pendencias.length,3);
  assert.equal(periods[0].original.origem.pagina,1);
});
test('Correspondência ambígua ou nome divergente nunca inventa CNPJ',()=>{
  const p = lerCalculo(document(calculationItems)).periodos;
  const v = lerCnis(document(cnisItems)).vinculos;
  assert.equal(cruzar(p,[...v,{ ...v[0],codigo:'10556018000209' }])[0].cnpj,'');
  assert.equal(cruzar(p,[{ ...v[0],empresa:'OUTRA EMPRESA' }])[0].cnpj,'');
  assert.equal(cruzar(p,[...v,...v])[0].cnpj,'01603889000164');
  assert.equal(cruzar([{ ...p[0],inicio:'2001-01-01' }],v)[0].cnpj,'');
  assert.match(cruzar([p[0],p[0]],v)[0].original.pendencias[0],/mais de uma vez/);
});
test('Imagem ou formato desconhecido gera aviso e nenhum resultado presumido',()=>{
  assert.ok(lerCalculo(document([['Autenticado por',10,10]])).avisos.length);
  assert.equal(lerCalculo(document([['SIM 1.40',10,10]])).periodos.length,0);
  assert.ok(lerCnis(document([['Autenticado por',10,10]])).avisos.length);
});
test('Revisão exige CNPJ, notas para correções/exclusões e confirmação explícita',()=>{
  const resultado = { periodos:cruzar(lerCalculo(document(calculationItems)).periodos,lerCnis(document(cnisItems)).vinculos) };
  const payload = { periodos:structuredClone(resultado.periodos),concluida:true,avisos_conferidos:true };
  assert.throws(()=>validarRevisao(payload,resultado));
  payload.periodos[0].conferido = true;
  payload.periodos[1].cnpj = '10556018000209'; payload.periodos[1].conferido = true;
  assert.throws(()=>validarRevisao(payload,resultado));
  payload.periodos[1].observacoes = 'Conferido na CTPS, página 5. Fim solicitado mantido conforme cálculo.';
  assert.equal(validarRevisao(payload,resultado).concluida,true);
  assert.throws(()=>validarRevisao({ ...payload,avisos_conferidos:false },resultado));
  assert.throws(()=>validarRevisao({ ...payload,periodos:[payload.periodos[0],payload.periodos[0]] },resultado));
  payload.periodos[1].selecionado = false; payload.periodos[1].observacoes = '';
  assert.throws(()=>validarRevisao(payload,resultado));
  assert.equal(resultado.periodos[1].cnpj,'');
});

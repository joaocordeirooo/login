import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizarEmpresa} from '../src/services/cnpja.js';
test('CNPJA seleciona só contato e identificação do estabelecimento e rejeita outra empresa',()=>{
  const raw={taxId:'01603889000164',company:{name:'Empresa',members:[{cpf:'segredo'}]},emails:[{address:'rh@empresa.test'},{address:'rh@empresa.test'},{address:'invalid'}],phones:[{area:'49',number:'999999999'},{area:'xx',number:'invalid'}],address:{street:'descartar'},status:{text:'Ativa'}};
  const result=normalizarEmpresa(raw,raw.taxId);
  assert.deepEqual(Object.keys(result).sort(),['cnpj','emails','razao_social','situacao','telefones'].sort());
  assert.deepEqual(result.emails,['rh@empresa.test']);assert.deepEqual(result.telefones,['49999999999']);
  assert.doesNotMatch(JSON.stringify(result),/segredo|descartar/);
  assert.throws(()=>normalizarEmpresa(raw,'10556018000209'),/diferente/);
  assert.throws(()=>normalizarEmpresa(null,raw.taxId),/inválida/);
});

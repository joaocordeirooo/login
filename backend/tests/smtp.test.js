import {test} from 'node:test';
import assert from 'node:assert/strict';
import {configuracaoSMTP,emailValido,falhaSMTPConfirmada} from '../src/services/smtp.js';
test('SMTP exige TLS e mantém credenciais fora da mensagem; valida remetente e destinatário único',()=>{
  const env={SMTP_HOST:'smtp.gmail.com',SMTP_PORT:'587',SMTP_SECURE:'false',SMTP_USER:'user@example.com',SMTP_PASS:'fixture',SMTP_FROM:'Escritório <user@example.com>'};
  const c=configuracaoSMTP(env);
  assert.equal(c.options.requireTLS,true);assert.equal(c.options.secure,false);
  assert.equal(c.options.tls.rejectUnauthorized,true);assert.equal(c.options.disableFileAccess,true);
  assert.deepEqual(c.from,{name:'Escritório',address:'user@example.com'});
  assert.equal(configuracaoSMTP({...env,SMTP_PORT:'465',SMTP_SECURE:'true'}).options.secure,true);
  for(const patch of [{SMTP_PORT:'25'},{SMTP_SECURE:'true'},{SMTP_PASS:''},{SMTP_FROM:'Name user@example.com'},{SMTP_FROM:'a@example.com\r\nBcc: b@example.com'}])assert.throws(()=>configuracaoSMTP({...env,...patch}));
  for(const address of ['a@b.com,b@c.com','a@b.com\r\n','Name <a@b.com>','file:///etc/passwd'])assert.equal(emailValido(address),false);
});
test('SMTP não presume falha segura quando a conexão cai após transmissão',()=>{
  assert.equal(falhaSMTPConfirmada({code:'EAUTH'}),true);
  assert.equal(falhaSMTPConfirmada({responseCode:550}),true);
  assert.equal(falhaSMTPConfirmada({code:'ETIMEDOUT'}),false);
  assert.equal(falhaSMTPConfirmada({code:'ESOCKET'}),false);
});

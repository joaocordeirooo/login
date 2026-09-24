import nodemailer from 'nodemailer';
import {fail} from '../utils/validacao.js';

export const emailValido=value=>typeof value==='string' && value.length<=254 && /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value);
export function configuracaoSMTP(env=process.env) {
  const host=env.SMTP_HOST?.trim(),user=env.SMTP_USER?.trim(),pass=env.SMTP_PASS;
  const port=Number(env.SMTP_PORT || 587),secure=env.SMTP_SECURE==='true';
  if (!host || !emailValido(user) || !pass || ![465,587].includes(port) || !['true','false',undefined].includes(env.SMTP_SECURE) || secure!==(port===465)) fail('Confira SMTP_HOST, SMTP_PORT (587/465), SMTP_SECURE, SMTP_USER e SMTP_PASS no backend/.env.',503);
  const from=(env.SMTP_FROM || user).trim();
  const parts=/^([^<>\r\n]*)<([^<>\r\n]+)>$/.exec(from);
  const address=parts ? parts[2].trim() : from;
  if (!emailValido(address) || /[\r\n]/.test(from)) fail('SMTP_FROM deve ser um e-mail ou Nome <email@dominio.com>.',503);
  return {from:{name:parts?.[1].trim() || '',address},options:{host,port,secure,requireTLS:!secure,auth:{user,pass},tls:{minVersion:'TLSv1.2',rejectUnauthorized:true},connectionTimeout:15000,greetingTimeout:15000,socketTimeout:60000,logger:false,debug:false,disableFileAccess:true,disableUrlAccess:true}};
}
export function statusSMTP(){try{const c=configuracaoSMTP();return {disponivel:true,remetente:c.from.address};}catch{return {disponivel:false,remetente:''};}}
export async function verificarSMTP(){
  const c=configuracaoSMTP(),transport=nodemailer.createTransport(c.options);
  try{await transport.verify();return {conectado:true,remetente:c.from.address};}
  catch{fail('Não foi possível autenticar no SMTP. Confira a conexão e as credenciais. No Gmail, utilize uma senha de app.',502);}
  finally{transport.close();}
}
export async function enviarSMTP(mail){
  const c=configuracaoSMTP(),transport=nodemailer.createTransport(c.options);
  try{
    const info=await transport.sendMail({...mail,from:c.from,disableFileAccess:true,disableUrlAccess:true});
    if (!info.accepted?.length || info.rejected?.length) throw Object.assign(new Error('Rejected'),{code:'EENVELOPE'});
  }finally{transport.close();}
}
export function falhaSMTPConfirmada(error){
  return ['EAUTH','EENVELOPE','EDNS','ECONNECTION'].includes(error?.code) || (Number(error?.responseCode)>=400 && Number(error?.responseCode)<=599);
}

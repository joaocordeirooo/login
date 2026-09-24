import {randomUUID} from 'node:crypto';
import pool from '../config/database.js';
import {fail} from '../utils/validacao.js';
import {periodoDaAnalise} from '../services/validarRecorte.js';
import {configuracaoSMTP,emailValido,enviarSMTP,falhaSMTPConfirmada} from '../services/smtp.js';

export async function historicoEnvios(sid,pid){
  return (await pool.query('SELECT revisao,estado,destinatario,criado_em,atualizado_em FROM solicitacao_envios WHERE solicitacao_id=$1 AND periodo_id=$2 ORDER BY id DESC LIMIT 10',[sid,pid])).rows;
}
export async function enviarMensagem(sid,pid,body,autor){
  if (body.confirmado!==true || !Number.isInteger(body.revisao)) fail('Revise e confirme a mensagem antes de enviar.');
  const config=configuracaoSMTP(),cx=await pool.connect();let envio,mail;
  try{
    await cx.query('BEGIN');
    const analise=(await cx.query('SELECT * FROM solicitacao_analises WHERE solicitacao_id=$1 FOR UPDATE',[sid])).rows[0];
    periodoDaAnalise(analise,pid,body.versao);
    const canal=(await cx.query('SELECT canal FROM solicitacoes_externas WHERE id=$1',[sid])).rows[0]?.canal;
    if(canal!=='Email') fail('Esta solicitação é de WhatsApp. Crie uma solicitação por e-mail para enviar.');
    if(!analise.revisao?.concluida) fail('Conclua a revisão dos períodos antes de enviar.');
    const d=(await cx.query('SELECT * FROM solicitacao_mensagens WHERE solicitacao_id=$1 AND periodo_id=$2 FOR UPDATE',[sid,pid])).rows[0];
    if(!d || d.revisao!==body.revisao || d.versao_analise!==body.versao) fail('O rascunho mudou. Reabra e revise antes de enviar.',412);
    const previous=(await cx.query("SELECT estado,revisao FROM solicitacao_envios WHERE solicitacao_id=$1 AND periodo_id=$2 AND (revisao=$3 OR estado IN ('enviando','incerto')) ORDER BY id DESC",[sid,pid,d.revisao])).rows;
    if(previous.some(e=>['enviando','incerto'].includes(e.estado))) fail('Há um envio em andamento ou sem confirmação. Confira a pasta Enviados antes de qualquer nova tentativa. O reenvio automático está bloqueado.',409);
    if(previous.some(e=>e.estado==='enviado')) {await cx.query('COMMIT');return {enviado:true,ja_enviado:true};}
    if(!emailValido(d.destinatario)) fail('Informe um único e-mail válido para o destinatário.');
    const attachments=(await cx.query("SELECT d.id,d.nome,d.conteudo FROM documentos d JOIN solicitacao_documentos sd ON sd.documento_id=d.id WHERE sd.solicitacao_id=$1 AND sd.tipo='Apoio' AND d.id=ANY($2::bigint[])",[sid,d.anexos])).rows;
    if(attachments.length!==d.anexos.length) fail('Um anexo não está mais disponível nesta solicitação.');
    if(d.recorte_id){
      const crop=(await cx.query('SELECT id,nome,conteudo FROM solicitacao_recortes WHERE id=$1 AND solicitacao_id=$2 AND periodo_id=$3 AND versao_analise=$4 AND aprovado_em IS NOT NULL',[d.recorte_id,sid,pid,body.versao])).rows[0];
      if(!crop) fail('O recorte precisa estar aprovado e corresponder à revisão atual.');
      attachments.push(crop);
    }
    if(attachments.reduce((n,a)=>n+a.conteudo.length,0)>18*1024*1024) fail('Os anexos ultrapassam 18 MB. Reduza os arquivos antes de enviar.');
    const messageId=`<${randomUUID()}@${config.from.address.split('@')[1]}>`;
    envio=(await cx.query(`INSERT INTO solicitacao_envios(solicitacao_id,periodo_id,revisao,versao_analise,message_id,estado,remetente,destinatario,assunto,mensagem,anexos,autor_id)
      VALUES($1,$2,$3,$4,$5,'enviando',$6,$7,$8,$9,$10,$11)
      ON CONFLICT(solicitacao_id,periodo_id,revisao) DO UPDATE SET estado='enviando',message_id=$5,atualizado_em=NOW() RETURNING id`,
    [sid,pid,d.revisao,d.versao_analise,messageId,config.from.address,d.destinatario,d.assunto,d.mensagem,JSON.stringify({apoio:d.anexos,recorte_id:d.recorte_id,arquivos:attachments.map(a=>({nome:a.nome,tamanho:a.conteudo.length}))}),autor])).rows[0];
    mail={messageId,to:{address:d.destinatario},subject:d.assunto,text:d.mensagem,attachments:attachments.map(a=>({filename:a.nome.replace(/[\r\n/\\]/g,'_'),content:a.conteudo}))};
    await cx.query('COMMIT');
  }catch(e){await cx.query('ROLLBACK');throw e;}finally{cx.release();}
  // Persist intent before SMTP: a lost response must never trigger an automatic resend.
  try{await enviarSMTP(mail);}
  catch(e){
    const definite=falhaSMTPConfirmada(e);
    await pool.query('UPDATE solicitacao_envios SET estado=$2,atualizado_em=NOW() WHERE id=$1',[envio.id,definite?'falhou':'incerto']);
    fail(definite?'O servidor de e-mail recusou o envio ou a conexão. Confira as credenciais, o destinatário e teste a conexão.':'Não foi possível confirmar o envio. Confira a pasta Enviados; o reenvio está bloqueado para evitar duplicação.',502);
  }
  await pool.query("UPDATE solicitacao_envios SET estado='enviado',atualizado_em=NOW() WHERE id=$1",[envio.id]);
  return {enviado:true};
}

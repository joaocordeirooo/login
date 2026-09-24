import PropTypes from 'prop-types';
import {useEffect,useState} from 'react';
import {ArrowLeft,CheckCircle2,Paperclip} from 'lucide-react';
import {api,save} from '@/lib/api';
import Field from '@/components/common/Field.jsx';
import ErrorBox from '@/components/common/ErrorBox.jsx';
export default function MessageDraft({base,period,canal,onBack}){
  const [draft,setDraft]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[confirm,setConfirm]=useState(false);
  const path=base+`/periodos/${period.id}/mensagem`;
  const [dirty,setDirty]=useState(false);
  useEffect(()=>{let active=true;api(path).then(d=>{if(active)setDraft(d);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[path]);
  async function persist(e){e.preventDefault();setBusy(true);setError('');setNotice('');try{if(dirty || !draft.revisao || draft.desatualizada)await save(path,draft,'PUT');setDraft(await api(path));setDirty(false);setNotice('Rascunho salvo. Confira os dados antes de enviar.');}catch(e){setError(e.message);}finally{setBusy(false);}}
  async function prepareSend(){setBusy(true);setError('');setNotice('');try{if(dirty || !draft.revisao || draft.desatualizada)await save(path,draft,'PUT');setDraft(await api(path));setDirty(false);setConfirm(true);}catch(e){setError(e.message);}finally{setBusy(false);}}
  async function send(){setBusy(true);setError('');try{await save(path+'/enviar',{versao:draft.versao,revisao:draft.revisao,confirmado:true});setConfirm(false);setNotice('E-mail aceito pelo servidor SMTP. A entrega ao destinatário ainda pode depender do provedor.');setDraft(await api(path));}catch(e){setConfirm(false);setError(e.message);try{setDraft(await api(path));}catch{/* Keep the existing review visible. */}}finally{setBusy(false);}}
  async function test(){setBusy(true);setError('');setNotice('');try{const r=await save('/tarefas/email/testar',{});setDraft(old=>({...old,smtp:{disponivel:true,remetente:r.remetente}}));setNotice('Conexão autenticada: '+r.remetente+'. Nenhum e-mail foi enviado.');}catch(e){setError(e.message);}finally{setBusy(false);}}
  const blocked=draft?.envios?.some(e=>['enviando','incerto'].includes(e.estado));
  return <><button className="secondary" disabled={busy} onClick={onBack}><ArrowLeft size={16}/>Voltar aos vínculos</button><h3 className="automation-subtitle">Revisar solicitação · {period.empresa}</h3><ErrorBox>{error}</ErrorBox>{!draft ? <p>Carregando mensagem…</p> : <>
    {draft.desatualizada && <p className="analysis-warning">O período foi revisado depois deste rascunho. Confira os campos e escolha novamente um recorte atual.</p>}
    {notice && <p role="status" className="analysis-warning">{notice}</p>}
    {draft.envios?.map((e,i)=><p className="muted" key={i}>Envio · {e.destinatario} · {({enviado:'Aceito pelo SMTP',enviando:'Em andamento ou aguardando confirmação',incerto:'Sem confirmação — confira a pasta Enviados',falhou:'Falhou'})[e.estado]} · {new Date(e.atualizado_em).toLocaleString('pt-BR')}</p>)}
    <form onSubmit={persist} onChange={()=>setDirty(true)}><fieldset className="analysis-fields" disabled={busy || confirm}>
      <Field label="Destinatário (e-mail)" value={draft.destinatario} onChange={e=>setDraft({...draft,destinatario:e.target.value})}/>
      <Field label="Função no período (conferir na CTPS)" value={draft.funcao} onChange={e=>setDraft({...draft,funcao:e.target.value})}/>
      <Field label="Assunto" required value={draft.assunto} onChange={e=>setDraft({...draft,assunto:e.target.value})}/>
      <Field label="Mensagem" type="textarea" value={draft.mensagem} onChange={e=>setDraft({...draft,mensagem:e.target.value})}/>
      <Field label="CTPS aprovada para anexar" options={draft.recortes.map(r=>({value:r.id,label:r.nome}))} value={draft.recorte_id || ''} onChange={e=>setDraft({...draft,recorte_id:e.target.value || null})}/>
      <h3><Paperclip size={16}/>Anexos de apoio</h3>{draft.anexos_disponiveis.map(d=><label className="check" key={d.id}><input type="checkbox" checked={draft.anexos.includes(d.id)} onChange={e=>setDraft({...draft,anexos:e.target.checked?[...draft.anexos,d.id]:draft.anexos.filter(id=>id!==d.id)})}/>{d.nome}</label>)}
      {!draft.recortes.length && <p className="muted">Aprove o recorte da CTPS após a revisão dos períodos para disponibilizá-lo como anexo.</p>}
      <p className="muted">{canal==='WhatsApp'?'Canal solicitado: WhatsApp. A conexão de envio e a confirmação do número ainda estão pendentes.':draft.smtp?.disponivel?'Remetente: '+draft.smtp.remetente:'Configure as variáveis SMTP no backend/.env e reinicie o servidor.'}</p>
      <button type="submit"><CheckCircle2 size={16}/>Salvar rascunho revisado</button>
      {canal==='Email' && <div className="automation-actions"><button type="button" className="secondary" onClick={test}>Testar conexão SMTP</button><button type="button" disabled={!draft.smtp?.disponivel || blocked || !draft.destinatario || (!dirty && draft.envios?.some(e=>e.estado==='enviado' && e.revisao===draft.revisao))} onClick={prepareSend}>Revisar envio de e-mail</button></div>}
    </fieldset></form>
    {confirm && <section className="analysis-warning" aria-label="Confirmar envio"><h3>Enviar este e-mail?</h3><p>De: {draft.smtp.remetente}<br/>Para: {draft.destinatario}<br/>Assunto: {draft.assunto}</p><p>Anexos: {[...draft.anexos_disponiveis.filter(a=>draft.anexos.includes(a.id)).map(a=>a.nome),...draft.recortes.filter(r=>String(r.id)===String(draft.recorte_id)).map(r=>r.nome)].join(', ') || 'Nenhum'}</p><div className="automation-actions"><button disabled={busy} className="secondary" onClick={()=>setConfirm(false)}>Voltar à edição</button><button disabled={busy} onClick={send}>{busy?'Enviando…':'Confirmar e enviar agora'}</button></div></section>}
    </>}</>;
}
MessageDraft.propTypes={base:PropTypes.string.isRequired,period:PropTypes.object.isRequired,canal:PropTypes.string.isRequired,onBack:PropTypes.func.isRequired};


import PropTypes from 'prop-types';
import {useEffect,useRef,useState} from 'react';
import {Building2,CheckCircle2,FileText,Play,Scissors,Mail,X,ArrowLeft,LoaderCircle,Search} from 'lucide-react';
import {api,save} from '@/lib/api';
import ErrorBox from '@/components/common/ErrorBox.jsx';
import Field from '@/components/common/Field.jsx';
import RequestAnalysis from './RequestAnalysis.jsx';
import CtpsCropEditor from './CtpsCropEditor.jsx';
import MessageDraft from './MessageDraft.jsx';
import date from '@/lib/date.js';

export default function AutomationModal({taskId,documents,request,onClose,onChanged,onDownload}) {
  const dialog=useRef(null),[sid,setSid]=useState(request?.id || ''),[summary,setSummary]=useState(null),[stage,setStage]=useState(request?'loading':'sources');
  const [selection,setSelection]=useState({}),[canal,setCanal]=useState(request?.canal || 'Email');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[progress,setProgress]=useState(''),[issues,setIssues]=useState({});
  const [detail,setDetail]=useState(null),[period,setPeriod]=useState(null),[configured,setConfigured]=useState(null);
  const base=`/tarefas/${taskId}/solicitacoes/${sid}`;
  useEffect(()=>{const node=dialog.current;node.showModal();const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{node.close();document.body.style.overflow=old;};},[]);
  useEffect(()=>{
    let active=true;
    api('/tarefas/ia/configuracao').then(r=>{if(active)setConfigured(r.disponivel);}).catch(e=>{if(active)setError(e.message);});
    if(request)api(`/tarefas/${taskId}/solicitacoes/${request.id}/automacao`).then(r=>{if(active){setSummary(r);setStage(r?'results':'sources');setSelection(Object.fromEntries(request.documentos.map(d=>[d.id,d.tipo])));}}).catch(e=>{if(active){setError(e.message);setStage('sources');}});
    return()=>{active=false;};
  },[taskId,request]);
  async function refresh(){const result=await api(base+'/automacao');setSummary(result);return result;}
  async function execute(){
    setBusy(true);setError('');setStage('running');let current=sid;
    try {
      if(!current){setProgress('Salvando os documentos da solicitação…');const result=await save(`/tarefas/${taskId}/solicitacoes`,{canal,documentos:Object.keys(selection),tipos_documentos:selection});current=result.id;setSid(current);await onChanged();}
      const path=`/tarefas/${taskId}/solicitacoes/${current}`;
      setProgress('A IA está lendo o cálculo, o CNIS e os vínculos da CTPS…');
      await save(path+'/analise?resumo=1',{modo:'ia'});
      const result=await api(path+'/automacao');setSummary(result);const nextIssues={};
      for(const p of result.periodos){
        const notes=[];
        if(p.cnpj){setProgress('Consultando o contato de '+p.empresa+'…');try{await save(path+`/periodos/${p.id}/contato`,{versao:result.versao});}catch(e){notes.push(e.message);}}
        if(!p.recorte && p.sugestoes_ctps.length){setProgress('Preparando a CTPS de '+p.empresa+'…');try{await save(path+'/recortes',{periodo_id:p.id,versao_analise:result.versao,trechos:p.sugestoes_ctps});}catch(e){notes.push(e.message);}}
        if(notes.length)nextIssues[p.id]=notes.join(' ');
      }
      setIssues(nextIssues);setSummary(await api(path+'/automacao'));setStage('results');
    }catch(e){setError(e.message);setStage('sources');}finally{setBusy(false);}
  }
  async function lookup(p){setBusy(true);try{await save(base+`/periodos/${p.id}/contato`,{versao:summary.versao});setIssues(old=>({...old,[p.id]:''}));await refresh();}catch(e){setIssues(old=>({...old,[p.id]:e.message}));}finally{setBusy(false);}}
  async function showCrop(p){setBusy(true);setError('');try{
    if(!p.recorte && p.sugestoes_ctps.length){try{await save(base+'/recortes',{periodo_id:p.id,versao_analise:summary.versao,trechos:p.sugestoes_ctps});}catch(e){setError(e.message+' Você pode selecionar os trechos manualmente abaixo.');}}
    setDetail(await api(base+'/analise?recortes=1'));setPeriod(p);setStage('crop');
  }catch(e){setError(e.message);}finally{setBusy(false);}}
  async function back(){setError('');setBusy(true);try{await refresh();setStage('results');}catch(e){setError(e.message);}finally{setBusy(false);}}
  const ready=['Calculo','CNIS','CTPS'].every(t=>Object.values(selection).includes(t)),rows=summary?.periodos || [];
  const hasContact=p=>!!(p.mensagem?.destinatario || p.contato?.emails.length);
  return <dialog ref={dialog} className={'automation-modal '+(['review','crop'].includes(stage)?'automation-wide':'')} onCancel={e=>{e.preventDefault();if(!busy)onClose();}} aria-labelledby="automation-title">
    <header className="automation-head"><div><span className="eyebrow">DOCUMENTOS EXTERNOS</span><h2 id="automation-title">Automação · Solicitação de PPP</h2></div><button type="button" className="ghost" aria-label="Fechar automação" disabled={busy} onClick={onClose}><X size={20}/></button></header>
    <div className="automation-body"><ErrorBox>{error}</ErrorBox>
      {stage==='loading' && <p role="status">Carregando solicitação…</p>}
      {stage==='sources' && <><p className="muted">Selecione as fontes. A IA identifica os períodos com fator 1,4, prepara a CTPS e o CNPJA busca os contatos por CNPJ.</p>
        <div className="automation-sources">{[['Calculo','Cálculo previdenciário'],['CNIS','CNIS do cliente'],['CTPS','CTPS digitalizada'],['Apoio','Procuração / apoio (opcional)']].map(([type,label])=><section className="automation-source" key={type}><div className="section-title"><h3><FileText size={18}/>{label}</h3>{Object.values(selection).includes(type) && <CheckCircle2 size={17}/>}</div>
          {documents.filter(d=>!selection[d.id] || selection[d.id]===type).map(d=><label className="check" key={d.id}><input type="checkbox" disabled={!!sid} checked={selection[d.id]===type} onChange={e=>setSelection(old=>{const next={...old};if(e.target.checked)next[d.id]=type;else delete next[d.id];return next;})}/><span>{d.nome}</span></label>)}
        </section>)}</div><div className="automation-service"><Building2 size={18}/><div><strong>Base de contatos · CNPJA</strong><p className="muted">Consulta somente com CNPJ completo. Contatos encontrados precisam de conferência.</p></div></div>
        <Field label="Canal desejado" options={[{value:'Email',label:'E-mail'},{value:'WhatsApp',label:'WhatsApp'}]} value={canal} disabled={!!sid} onChange={e=>setCanal(e.target.value)}/>
        <p className="muted">Cálculo, CNIS e CTPS são analisados pela OpenAI. A procuração fica disponível como anexo e não é enviada à IA.</p>
        {configured===false && <p className="analysis-warning">Configure a conexão OpenAI no servidor antes de executar.</p>}
        {sid && <p className="muted">As fontes desta solicitação já estão salvas. Para trocar os arquivos, abra uma nova automação.</p>}
        <footer className="automation-actions"><button className="secondary" onClick={onClose}>Cancelar</button><button disabled={!ready || !configured || busy || !canal} onClick={execute}><Play size={17}/>Executar automação</button></footer></>}
      {stage==='running' && <div className="automation-running" role="status"><LoaderCircle className="automation-spin" size={36}/><h3>{progress}</h3><p className="muted">A análise pode levar alguns minutos. Ao terminar, confira os vínculos e os recortes antes de preparar a mensagem.</p></div>}
      {stage==='results' && <><div className="automation-summary">{[['Vínculos especiais',rows.length],['Com contato',rows.filter(hasContact).length],['Pendências',rows.filter(p=>!p.conferido || !p.cnpj || !hasContact(p) || !p.recorte?.aprovado_em).length]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
        <div className="automation-company-list">{rows.map(p=><article className="automation-company" key={p.id}><div className="automation-company-top"><div className="automation-company-icon"><Building2 size={22}/></div><div><h3>{p.empresa}</h3><p className="muted">{date(p.inicio)} a {date(p.fim)}</p></div><span className="badge">{!p.cnpj?'Conferir CNPJ':!hasContact(p)?'Sem contato':p.recorte?.aprovado_em?'CTPS aprovada':'Conferir CTPS'}</span></div>
          <div className="automation-company-grid"><div><small>CONTATO</small><strong>{p.mensagem?.destinatario || p.contato?.emails[0] || 'Não localizado'}</strong>{p.contato && <><small>CNPJA · {date(p.contato.consultado_em)}</small>{p.contato.telefones?.[0] && <small>Telefone: {p.contato.telefones[0]}</small>}</>}</div><div><small>CTPS</small><strong>{p.recorte ? `${p.recorte.paginas} ${p.recorte.paginas===1 ? 'trecho preparado' : 'trechos preparados'}` : p.sugestoes_ctps.length ? `${p.sugestoes_ctps.length} sugestões da IA` : 'Selecionar páginas'}</strong></div><div><small>MENSAGEM</small><strong>{p.mensagem?'Rascunho salvo':'A preparar'}</strong></div></div>
          {!p.cnpj && <p className="automation-warning">CNPJ incompleto ou pendente. Confira o vínculo antes de consultar.</p>}{issues[p.id] && <p role="alert" className="automation-warning">{issues[p.id]}</p>}
          <div className="automation-actions"><button className="secondary" disabled={busy || !p.cnpj} onClick={()=>lookup(p)}><Search size={15}/>Buscar contato</button><button className="secondary" disabled={busy} onClick={()=>showCrop(p)}><Scissors size={15}/>{p.recorte?'Ver CTPS separada':'Preparar CTPS'}</button><button disabled={busy} onClick={()=>{setPeriod(p);setStage('message');}}><Mail size={15}/>Revisar mensagem</button></div>
        </article>)}{!rows.length && <p className="empty">Nenhum período selecionado. Abra a revisão para conferir o cálculo.</p>}</div>
        <footer className="automation-footer"><button className="secondary" disabled={busy} onClick={()=>setStage('review')}>Conferir períodos e CNPJs</button><span>Revise a mensagem e confirme o envio por e-mail. WhatsApp ainda não está conectado.</span></footer></>}
      {stage==='review' && <><button className="secondary" onClick={back}><ArrowLeft size={16}/>Voltar aos vínculos</button><RequestAnalysis taskId={taskId} requestId={String(sid)} onDownload={onDownload}/></>}
      {stage==='crop' && detail && <><button className="secondary" onClick={back}><ArrowLeft size={16}/>Voltar aos vínculos</button><CtpsCropEditor key={period.id+'-'+detail.versao} taskId={taskId} requestId={String(sid)} record={detail} initialPeriod={period.id} onReviewPeriods={()=>setStage('review')}/></>}
      {stage==='message' && <MessageDraft base={base} period={period} canal={canal} onBack={back}/>}
    </div>
  </dialog>;
}
AutomationModal.propTypes={taskId:PropTypes.string.isRequired,documents:PropTypes.array.isRequired,request:PropTypes.object,onClose:PropTypes.func.isRequired,onChanged:PropTypes.func.isRequired,onDownload:PropTypes.func.isRequired};




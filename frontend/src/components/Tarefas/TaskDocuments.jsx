import PropTypes from 'prop-types';
import {useState} from 'react';
import {FileText,Upload,Sparkles,ArrowRight} from 'lucide-react';
import {api,save} from '@/lib/api';
import useLoad from '@/hooks/useLoad.js';
import ErrorBox from '@/components/common/ErrorBox.jsx';
import Loading from '@/components/common/Loading.jsx';
import AutomationModal from './AutomationModal.jsx';

export default function TaskDocuments({taskId}){
  const state=useLoad('/tarefas/'+taskId),[modal,setModal]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function upload(e){
    const file=e.target.files[0];e.target.value='';if(!file)return;
    if(!file.size || file.size>10*1024*1024){setError('Escolha um arquivo não vazio, com até 10 MB.');return;}
    setBusy(true);setError('');try{
      const conteudo=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=()=>reject(new Error('Falha ao ler arquivo.'));r.readAsDataURL(file);});
      await save('/tarefas/'+taskId+'/documentos',{nome:file.name,mime:file.type || 'application/octet-stream',conteudo});await state.reload();
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function download(d){setError('');try{const blob=await api('/documentos/'+d.id,{download:true}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=d.nome;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){setError(e.message);}}
  return <div className="form-section"><ErrorBox>{error}</ErrorBox><Loading state={state}>{state.data && <>
    <div className="automation-launch"><div className="automation-launch-icon"><Sparkles size={24}/></div><div><h2>Solicitação de documentos externos</h2><p>Identifique os vínculos especiais, localize contatos e prepare a CTPS de cada empresa.</p></div><button disabled={busy} onClick={()=>setModal({nova:true})}><Sparkles size={17}/>Solicitar PPPs</button></div>
    <div className="section-title"><h3>Documentos da tarefa</h3><label className="automation-upload"><Upload size={16}/>Anexar arquivo<input type="file" disabled={busy} onChange={upload}/></label></div>
    {state.data.documentos.filter(d=>d.anexado).map(d=><div className="list-row" key={d.id}><span><FileText size={16}/> {d.nome}</span><button className="secondary" onClick={()=>download(d)}>Baixar</button></div>)}
    {!state.data.documentos.some(d=>d.anexado) && <p className="muted">Nenhum arquivo anexado à tarefa. Você também pode selecionar os documentos já cadastrados nos casos deste cliente.</p>}
    <div className="form-section"><h3>Solicitações preparadas</h3>{state.data.solicitacoes.map(s=><button className="automation-history" key={s.id} onClick={()=>setModal(s)}><span><strong>Solicitação #{s.id}</strong><small>{s.canal==='Email'?'E-mail':s.canal} · {new Date(s.criado_em).toLocaleDateString('pt-BR')} · {s.documentos.length} documentos · Não enviada</small></span><ArrowRight size={18}/></button>)}{!state.data.solicitacoes.length && <p className="muted">As automações preparadas aparecerão aqui para continuar a revisão.</p>}</div>
    {modal && <AutomationModal taskId={taskId} documents={state.data.documentos} request={modal.nova?null:modal} onClose={()=>setModal(null)} onChanged={state.reload} onDownload={download}/>}
  </>}</Loading></div>;
}
TaskDocuments.propTypes={taskId:PropTypes.string.isRequired};

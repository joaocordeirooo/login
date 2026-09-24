import PropTypes from 'prop-types';
import { useEffect,useRef,useState } from 'react';
import { api,save } from '@/lib/api';
import ErrorBox from '@/components/common/ErrorBox.jsx';
import Field from '@/components/common/Field.jsx';

const full = { x:0,y:0,largura:1,altura:1 };
const fit = n => Math.max(0,Math.min(1,n));

function PdfPage({ path,onViewed }) {
  const [result,setResult]=useState(null),[error,setError]=useState('');
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    setResult(null);setError('');
    api(path,{ signal:controller.signal }).then(setResult).catch(e=>{ if (!controller.signal.aborted) setError(e.message); });
    return ()=>controller.abort();
  },[path,retry]);
  return <><ErrorBox>{error}</ErrorBox>{error && <button className="secondary" onClick={()=>setRetry(retry+1)}>Tentar carregar prévia novamente</button>}{result ? <img className="ctps-output-page" src={'data:image/png;base64,'+result.imagem} alt="Página do PDF recortado" onLoad={onViewed} /> : !error && <p role="status">Carregando página…</p>}</>;
}
PdfPage.propTypes={ path:PropTypes.string.isRequired,onViewed:PropTypes.func.isRequired };

function CropReview({ base,recorte,currentVersion,reviewDone,onApproved,onReuse,onReviewPeriods,initialOpen=false }) {
  const [open,setOpen]=useState(initialOpen),[page,setPage]=useState(1),[seen,setSeen]=useState([]),[checked,setChecked]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const stale=recorte.versao_analise!==currentVersion;
  const allSeen=seen.length===recorte.paginas;
  async function approve() {
    setBusy(true);setError('');
    try { await save(`${base}/recortes/${recorte.id}/aprovar`,{ conferido:true });await onApproved(); }
    catch(e) {setError(e.message);}finally{setBusy(false);}
  }
  async function download() {
    setError('');
    try {
      const blob=await api(`${base}/recortes/${recorte.id}/pdf`,{download:true});
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=recorte.nome;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(e){setError(e.message);}
  }
  return <article className="ctps-result"><h3>{recorte.periodo.empresa} · PDF #{recorte.id}</h3><p className="muted">{recorte.paginas} páginas · {stale ? 'Revisão alterada: gere uma nova versão' : recorte.aprovado_em ? 'Recorte aprovado' : 'Aguardando conferência visual'}</p><ErrorBox>{error}</ErrorBox>
    {!recorte.aprovado_em && !reviewDone && <div className="analysis-warning"><strong>Falta concluir a revisão dos períodos e CNPJs.</strong><p>A conferência visual do PDF é uma etapa separada. Conclua a revisão dos vínculos para liberar a aprovação. Ao salvar a revisão, gere um novo PDF reutilizando os trechos já selecionados.</p>{onReviewPeriods && <button className="secondary" onClick={onReviewPeriods}>Revisar períodos e CNPJs</button>}</div>}
    <div className="task-toolbar"><button className="secondary" onClick={()=>setOpen(!open)}>{open?'Fechar prévia':'Conferir PDF recortado'}</button><button className="secondary" onClick={download}>Baixar PDF</button><button className="secondary" onClick={()=>onReuse(recorte)}>Corrigir / reutilizar seleção</button></div>
    {open && <><div className="ctps-navigation"><button className="secondary" disabled={page===1} onClick={()=>setPage(page-1)}>Anterior</button><span>Página {page} de {recorte.paginas}</span><button className="secondary" disabled={page===recorte.paginas} onClick={()=>setPage(page+1)}>Próxima</button></div>
      <PdfPage key={page} path={`${base}/recortes/${recorte.id}/paginas/${page}`} onViewed={()=>setSeen(old=>old.includes(page)?old:[...old,page])} />
      {!recorte.aprovado_em && !stale && <><label className="check"><input type="checkbox" checked={checked} disabled={!allSeen} onChange={e=>setChecked(e.target.checked)} />Conferi todas as páginas: pertencem ao vínculo e estão legíveis.</label>{!allSeen && <p className="muted">Abra todas as {recorte.paginas} páginas antes de confirmar.</p>}{!reviewDone && <p className="muted">Conclua a revisão dos períodos antes de aprovar o recorte.</p>}<button disabled={busy || !checked || !allSeen || !reviewDone} onClick={approve}>{busy?'Salvando…':'Aprovar recorte'}</button></>}
    </>}
  </article>;
}
CropReview.propTypes={base:PropTypes.string.isRequired,recorte:PropTypes.object.isRequired,currentVersion:PropTypes.number.isRequired,reviewDone:PropTypes.bool.isRequired,onApproved:PropTypes.func.isRequired,onReuse:PropTypes.func.isRequired,onReviewPeriods:PropTypes.func,initialOpen:PropTypes.bool};

export default function CtpsCropEditor({ taskId,requestId,record,initialPeriod,onReviewPeriods }) {
  const base=`/tarefas/${taskId}/solicitacoes/${requestId}`;
  const periods=(record.revisao?.periodos || record.resultado.periodos).filter(p=>p.selecionado);
  const [data,setData]=useState(null),[source,setSource]=useState(''),[page,setPage]=useState(1),[rotation,setRotation]=useState(0);
  const [period,setPeriod]=useState(initialPeriod || periods[0]?.id || ''),[area,setArea]=useState(full),[pieces,setPieces]=useState([]),[editing,setEditing]=useState(null);
  const [image,setImage]=useState(null),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [pageCounts,setPageCounts]=useState({});
  const [retry,setRetry]=useState(0);
  const surface=useRef(null),start=useRef(null),editor=useRef(null),results=useRef(null);
  const hasInitialCrop=!!initialPeriod && !!data?.recortes.some(r=>r.periodo_id===initialPeriod);
  useEffect(()=>{if(hasInitialCrop)results.current?.scrollIntoView({block:'start'});},[initialPeriod,hasInitialCrop]);
  const suggestions=record.resultado.periodos.find(p=>p.id===period)?.sugestoes_ctps || [];
  const samePiece=(a,b)=>['documento_id','pagina','rotacao','x','y','largura','altura'].every(k=>a[k]===b[k]);
  function suggestionPiece(s) {return {documento_id:s.documento_id,pagina:s.pagina,rotacao:s.rotacao,x:s.x,y:s.y,largura:s.largura,altura:s.altura};}
  function toggleSuggestion(s,checked) {
    const p=suggestionPiece(s);
    setPieces(old=>checked ? [...old,p] : old.filter(other=>!samePiece(other,p)));
    setEditing(null);setMessage('Seleção atualizada. Confira e ajuste os trechos antes de gerar o PDF.');
  }
  const imageKey=`${source}/${page}/${rotation}`;
  async function reload() { const result=await api(base+'/recortes');setData(result);return result; }
  useEffect(()=>{
    let active=true;
    api(base+'/recortes').then(result=>{if(active){setData(result);setSource(result.fontes[0]?.id || '');}}).catch(e=>{if(active)setError(e.message);});
    return ()=>{active=false;};
  },[base]);
  useEffect(()=>{
    setImage(null);setLoaded(false);
    if(!source)return;
    const controller=new AbortController();setLoading(true);setError('');
    api(`${base}/ctps/${source}/paginas/${page}?rotacao=${rotation}`,{signal:controller.signal}).then(result=>{if(!controller.signal.aborted){setImage({...result,key:imageKey});setPageCounts(counts=>({...counts,[source]:result.paginas}));}})
      .catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[base,source,page,rotation,imageKey,retry]);
  const ready=loaded && image?.key===imageKey && !loading;
  const valid=Object.values(area).every(Number.isFinite) && area.x>=0 && area.y>=0 && area.largura>=.01 && area.altura>=.01 && area.x+area.largura<=1.000001 && area.y+area.altura<=1.000001;
  function position(e) {const r=surface.current.getBoundingClientRect();return {x:fit((e.clientX-r.left)/r.width),y:fit((e.clientY-r.top)/r.height)};}
  function pointerDown(e) {if(!ready || busy)return;e.preventDefault();start.current=position(e);surface.current.setPointerCapture(e.pointerId);setArea({...start.current,largura:0,altura:0});}
  function pointerMove(e) {if(!start.current)return;const p=position(e),s=start.current;setArea({x:Math.min(p.x,s.x),y:Math.min(p.y,s.y),largura:Math.abs(p.x-s.x),altura:Math.abs(p.y-s.y)});}
  function pointerUp(e) {if(start.current){pointerMove(e);start.current=null;}}
  function resetPage(n) {setPage(n);setArea(full);setEditing(null);}
  function editPiece(p,index) {setSource(p.documento_id);setPage(p.pagina);setRotation(p.rotacao);setArea({x:p.x,y:p.y,largura:p.largura,altura:p.altura});setEditing(index);editor.current?.scrollIntoView({behavior:'smooth',block:'start'});}
  function addPiece() {
    if(!ready || !valid)return;
    const piece={documento_id:String(source),pagina:page,rotacao:rotation,...area};
    setPieces(editing===null?[...pieces,piece]:pieces.map((p,i)=>i===editing?piece:p));setEditing(null);setMessage('Trecho incluído. Selecione outros trechos ou gere a prévia.');
  }
  function movePiece(index,delta) {const next=[...pieces];[next[index],next[index+delta]]=[next[index+delta],next[index]];setPieces(next);setEditing(null);}
  function reuse(recorte) {setPeriod(recorte.periodo_id);setPieces(recorte.trechos);setEditing(null);setMessage('Seleção carregada. Ajuste os trechos e gere uma nova versão para conferir.');editor.current?.scrollIntoView({behavior:'smooth',block:'start'});}
  async function generate() {
    setBusy(true);setError('');setMessage('');
    try {await save(base+'/recortes',{periodo_id:period,versao_analise:record.versao,trechos:pieces});await reload();setMessage('PDF gerado. Abra “Conferir PDF recortado” abaixo e revise todas as páginas.');}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <section className="form-section ctps-editor" ref={editor}><h2>Recorte da CTPS por vínculo</h2><ErrorBox>{error}</ErrorBox>{message && <p role="status">{message}</p>}
    {!data ? <p>Carregando CTPS…</p> : <>
      {!data.fontes.length ? <p className="muted">Esta solicitação não tem arquivo classificado como CTPS. Crie uma nova solicitação incluindo a carteira.</p> : <>
        <p className="muted">Escolha o vínculo e confira as sugestões disponíveis. Você também pode arrastar sobre a página para ajustar o trecho e juntar contrato e anotações em um PDF.</p>
        <fieldset className="analysis-fields" disabled={busy}>
          <div className="form-grid"><Field label="Vínculo do recorte" options={periods.map(p=>({value:p.id,label:`${p.empresa} · ${p.inicio} a ${p.fim}`}))} value={period} onChange={e=>{setPeriod(e.target.value);setPieces([]);setEditing(null);}} />
            <Field label="CTPS de origem" options={data.fontes.map(d=>({value:d.id,label:d.nome}))} value={source} onChange={e=>{setSource(e.target.value);resetPage(1);setRotation(0);}} /></div>
          {record.resultado.leitor==='openai-1' && <section className="ctps-suggestions"><h3>Páginas sugeridas pela IA</h3><p className="muted">A numeração abaixo é a do PDF. Selecione as sugestões que deseja incluir e use “Visualizar sugestão” para conferir a região indicada.</p>
            {!suggestions.length && <p>Nenhuma página localizada para este vínculo. Use o editor abaixo para selecionar manualmente.</p>}
            {suggestions.map((s,i)=>{const included=pieces.some(p=>samePiece(p,s));return <div className="ctps-suggestion" key={i}><label className="check"><input type="checkbox" checked={included} disabled={!included && pieces.length>=12} onChange={e=>toggleSuggestion(s,e.target.checked)} /><span>{s.nome} · página {s.pagina} · {s.lado==='inteira'?'página inteira':'metade '+s.lado}</span></label><p className="note muted">{s.motivo}</p><button type="button" className="secondary" onClick={()=>editPiece(s,included ? pieces.findIndex(p=>samePiece(p,s)) : null)}>Visualizar sugestão {i+1}</button></div>;})}
          </section>}
          <div className="ctps-navigation"><button type="button" className="secondary" disabled={loading || page===1} onClick={()=>resetPage(page-1)}>Página anterior</button><select aria-label="Ir para página da CTPS" value={page} disabled={loading || !source} onChange={e=>resetPage(Number(e.target.value))}>{Array.from({length:pageCounts[source] || 1},(_,i)=><option key={i} value={i+1}>Página {i+1} de {pageCounts[source] || 1}</option>)}</select><button type="button" className="secondary" disabled={loading || page>=(pageCounts[source] || 1)} onClick={()=>resetPage(page+1)}>Próxima página</button><button type="button" className="secondary" disabled={!ready} onClick={()=>{setRotation((rotation+90)%360);setArea(full);setEditing(null);}}>Girar 90°</button></div>
          {loading && <p role="status">Renderizando página…</p>}
          {!loading && !image && source && <button type="button" className="secondary" onClick={()=>setRetry(retry+1)}>Tentar carregar página novamente</button>}
          {image?.key===imageKey && <div className="ctps-crop-surface" ref={surface} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={()=>{start.current=null;}}>
            <img src={'data:image/png;base64,'+image.imagem} alt={`CTPS, página ${page}. Arraste para selecionar ou use os campos abaixo.`} draggable={false} onLoad={()=>setLoaded(true)} />
            <div className="ctps-crop-area" style={{left:`${area.x*100}%`,top:`${area.y*100}%`,width:`${area.largura*100}%`,height:`${area.altura*100}%`}} />
          </div>}
          <div className="task-toolbar"><button type="button" className="secondary" onClick={()=>setArea(full)}>Página inteira</button><button type="button" className="secondary" onClick={()=>setArea({...full,largura:.5})}>Metade esquerda</button><button type="button" className="secondary" onClick={()=>setArea({...full,x:.5,largura:.5})}>Metade direita</button></div>
          <div className="ctps-coordinates">{[['x','Esquerda (%)'],['y','Topo (%)'],['largura','Largura (%)'],['altura','Altura (%)']].map(([key,label])=><label key={key}>{label}<input type="number" min="0" max="100" step="0.1" value={Math.round(area[key]*1000)/10} onChange={e=>setArea({...area,[key]:Number(e.target.value)/100})} /></label>)}</div>
          {!valid && <p className="muted">Selecione uma área dentro da página, com pelo menos 1% de largura e altura.</p>}
          <button type="button" disabled={!ready || !valid || !period || (pieces.length>=12 && editing===null)} onClick={addPiece}>{editing===null?'Adicionar trecho':'Atualizar trecho'}</button>
          <h3 className="ctps-selection-title">Trechos na ordem do PDF ({pieces.length}/12)</h3>
          {pieces.map((p,i)=><div className="ctps-piece" key={i}><span>{i+1}. {data.fontes.find(d=>String(d.id)===p.documento_id)?.nome} · página {p.pagina} · rotação {p.rotacao}°</span><div className="task-toolbar"><button type="button" className="secondary" onClick={()=>editPiece(p,i)}>Editar trecho {i+1}</button><button type="button" className="secondary" disabled={i===0} onClick={()=>movePiece(i,-1)} aria-label={`Subir trecho ${i+1}`}>↑</button><button type="button" className="secondary" disabled={i===pieces.length-1} onClick={()=>movePiece(i,1)} aria-label={`Descer trecho ${i+1}`}>↓</button><button type="button" className="secondary" onClick={()=>{setPieces(pieces.filter((_,n)=>n!==i));setEditing(null);}}>Remover</button></div></div>)}
          <button type="button" disabled={!pieces.length || !period || editing!==null} onClick={generate}>{busy?'Gerando PDF…':'Gerar PDF para conferência'}</button>
        </fieldset>
      </>}
      <div className="form-section" ref={results}><h3>PDFs gerados</h3>{!data.recortes.length && <p className="muted">Nenhum recorte gerado ainda.</p>}{data.recortes.map(r=><CropReview key={r.id} base={base} recorte={r} currentVersion={record.versao} reviewDone={!!record.revisao?.concluida} onApproved={reload} onReuse={reuse} onReviewPeriods={onReviewPeriods} initialOpen={!!initialPeriod && r.id===data.recortes.find(c=>c.periodo_id===initialPeriod)?.id} />)}</div>
    </>}
  </section>;
}
CtpsCropEditor.propTypes={taskId:PropTypes.string.isRequired,requestId:PropTypes.string.isRequired,record:PropTypes.object.isRequired,initialPeriod:PropTypes.string,onReviewPeriods:PropTypes.func};


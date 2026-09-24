import PropTypes from 'prop-types';
import { useEffect,useState } from 'react';
import { api,save } from '@/lib/api';
import Field from '@/components/common/Field.jsx';
import ErrorBox from '@/components/common/ErrorBox.jsx';
import date from '@/lib/date.js';
import CtpsCropEditor from './CtpsCropEditor.jsx';

const formatCnpj = n => n?.length===14 ? n.replace(/^(..)(...)(...)(....)(..)$/,'$1.$2.$3/$4-$5') : n || 'Não informado';

export default function RequestAnalysis({ taskId,requestId,onDownload,initialRecord }) {
  const path = `/tarefas/${taskId}/solicitacoes/${requestId}/analise`;
  const [record,setRecord] = useState(null), [rows,setRows] = useState([]), [ack,setAck] = useState(false);
  const [loading,setLoading] = useState(true), [busy,setBusy] = useState(false), [error,setError] = useState(''), [message,setMessage] = useState('');
  const [dirty,setDirty] = useState(false);
  const [mode,setMode] = useState('ia');
  function accept(data) {
    setRecord(data); setRows(data?.revisao?.periodos || data?.resultado.periodos || []);
    setAck(data?.revisao?.avisos_conferidos || false); setDirty(false);
  }
  useEffect(()=>{
    let active = true;
    (initialRecord ? Promise.resolve(initialRecord) : api(path)).then(data=>{ if (active) { setRecord(data); setRows(data?.revisao?.periodos || data?.resultado.periodos || []); setAck(data?.revisao?.avisos_conferidos || false); } })
      .catch(e=>{ if (active) setError(e.message); }).finally(()=>{ if (active) setLoading(false); });
    return ()=>{ active = false; };
  },[path,initialRecord]);
  async function analyze() {
    setBusy(true); setError(''); setMessage('');
    try { accept(await save(path,{modo:mode})); } catch(e) { setError(e.message); } finally { setBusy(false); }
  }
  function change(row,key,value) {
    setRows(rows.map(r=>r.id===row.id ? { ...r,[key]:value,...(key!=='conferido' ? { conferido:false } : {}) } : r));
    setDirty(true); setMessage('');
  }
  async function persist(concluida) {
    setBusy(true); setError(''); setMessage('');
    try {
      accept(await save(path,{ periodos:rows,versao:record.versao,avisos_conferidos:ack,concluida },'PUT'));
      setMessage(concluida ? 'Revisão concluída. Prepare e confira o recorte da CTPS abaixo. Nenhuma mensagem foi enviada.' : 'Correções salvas. A revisão continua em andamento.');
    } catch(e) { setError(e.message); } finally { setBusy(false); }
  }
  if (loading) return <p role="status">Carregando análise…</p>;
  return <section className="request-analysis"><ErrorBox>{error}</ErrorBox>{message && <p role="status">{message}</p>}
    {!record ? <><p>A IA lê o cálculo, cruza os períodos com fator 1,4 com o CNIS e sugere páginas da CTPS digitalizada para cada vínculo.</p><Field label="Forma de análise" options={[{value:'ia',label:'IA · cálculo, CNIS e CTPS'},{value:'local',label:'Leitura local · cálculo e CNIS com texto'}]} value={mode} disabled={busy} onChange={e=>setMode(e.target.value)} /><p className="muted">{mode==='ia' ? 'Os PDFs selecionados como cálculo, CNIS e CTPS serão enviados à OpenAI. A análise pode levar alguns minutos. Confira os resultados antes de gerar o recorte.' : 'A leitura local reconhece tabelas com texto como as do exemplo. A seleção das páginas da CTPS será manual.'}</p><button disabled={busy} onClick={analyze}>{busy ? 'Analisando documentos…' : mode==='ia' ? 'Analisar com IA' : 'Analisar documentos'}</button></> : <>
      <div className="section-title"><h3>{record.revisao?.concluida && !dirty ? 'Revisão concluída' : 'Revisar períodos e empresas'}</h3><span className="badge">{rows.length} períodos · fator 1,4</span></div>
      <p className="muted">{record.resultado.linhas_calculo} linhas do cálculo reconhecidas. Confira os PDFs antes de concluir; o fim solicitado não confirma uma demissão.</p>
      <p className="muted">{record.resultado.leitor==='openai-1' ? 'Análise com IA · páginas sugeridas disponíveis no editor abaixo.' : 'Análise local salva. Para obter sugestões da IA, crie uma nova solicitação com os mesmos documentos.'}</p>
      {!!record.resultado.avisos.length && <div className="analysis-warning"><strong>Conferência dos documentos</strong><ul>{record.resultado.avisos.map((a,i)=><li key={i}>{a}</li>)}</ul></div>}
      {!rows.length && <p>Nenhum período selecionado automaticamente. Confira a classificação e o formato dos PDFs; se necessário, crie uma nova solicitação com os arquivos corrigidos.</p>}
      <form onSubmit={e=>{ e.preventDefault(); persist(false); }}>
        <fieldset disabled={busy} className="analysis-fields">
          {rows.map(row=>{
            const original = record.resultado.periodos.find(p=>p.id===row.id).original;
            return <section className="analysis-period" key={row.id}>
              <div className="section-title"><h3>Período {row.id} · {original.empresa}</h3><label className="check"><input type="checkbox" checked={row.selecionado} onChange={e=>change(row,'selecionado',e.target.checked)} />Incluir na solicitação</label></div>
              <p className="muted">Extraído do cálculo: {date(original.inicio)} a {date(original.fim)} · fator 1,4</p>
              {!!original.pendencias.length && <div className="analysis-warning"><strong>Pontos identificados na extração</strong><ul>{original.pendencias.map((p,i)=><li key={i}>{p}</li>)}</ul></div>}
              <div className="form-grid">
                <Field label="Empresa" required value={row.empresa} onChange={e=>change(row,'empresa',e.target.value)} />
                <Field label="CNPJ completo do estabelecimento" value={row.cnpj} onChange={e=>change(row,'cnpj',e.target.value)} />
                <Field label="Início do período solicitado" required type="date" value={row.inicio} onChange={e=>change(row,'inicio',e.target.value)} />
                <Field label="Fim do período solicitado" required type="date" value={row.fim} onChange={e=>change(row,'fim',e.target.value)} />
                <Field label="Conferência e fonte das correções (ex.: CTPS, página 5)" type="textarea" wide value={row.observacoes} onChange={e=>change(row,'observacoes',e.target.value)} />
              </div>
              <details className="analysis-evidence"><summary>Ver dados originais e páginas de origem</summary>
                <p><strong>Cálculo:</strong> {original.origem.nome}, página {original.origem.pagina} <button type="button" className="secondary" onClick={()=>onDownload({ id:original.origem.documento_id,nome:original.origem.nome })}>Baixar cálculo</button></p>
                <p className="note muted">{original.origem.trecho}</p>
                {original.candidatos.map((v,i)=><div key={i}><p><strong>CNIS:</strong> {v.empresa} · {formatCnpj(v.codigo)} · admissão {date(v.inicio)} · saída {v.fim ? date(v.fim) : 'não informada'}</p><p>{v.origem.nome}, página {v.origem.pagina} <button type="button" className="secondary" onClick={()=>onDownload({ id:v.origem.documento_id,nome:v.origem.nome })}>Baixar CNIS</button></p><p className="note muted">{v.origem.trecho}</p></div>)}
                {!original.candidatos.length && <p className="muted">Nenhum vínculo exato encontrado. Consulte os vínculos reconhecidos abaixo e confira os documentos.</p>}
              </details>
              {row.selecionado && <label className="check"><input type="checkbox" checked={row.conferido} onChange={e=>change(row,'conferido',e.target.checked)} />Conferi este período, o CNPJ e as pendências nos documentos.</label>}
            </section>;
          })}
          {!!rows.length && <><label className="check"><input type="checkbox" checked={ack} onChange={e=>{ setAck(e.target.checked); setDirty(true); }} />Conferi a identidade do cliente, a lista de períodos e os avisos da análise com os PDFs.</label>
            <div className="actions"><button type="submit">Salvar correções</button><button type="button" className="secondary" disabled={!ack || !rows.some(r=>r.selecionado) || rows.some(r=>r.selecionado && !r.conferido)} onClick={()=>persist(true)}>Concluir revisão</button></div></>}
        </fieldset>
      </form>
      {dirty && <p role="status" className="muted">Há alterações ainda não salvas.</p>}
      {record.revisado_em && <p className="muted">Última revisão salva em {new Date(record.revisado_em).toLocaleString('pt-BR')}.</p>}
      <details className="analysis-evidence"><summary>Todos os vínculos de empresa reconhecidos no CNIS</summary>
        {record.resultado.vinculos_cnis.map((v,i)=><p key={i}>{v.empresa} · {formatCnpj(v.codigo)} · {date(v.inicio)} a {v.fim ? date(v.fim) : 'sem baixa'} · {v.origem.nome}, página {v.origem.pagina}</p>)}
      </details>
      {dirty ? <p className="muted">Salve as alterações dos períodos para trabalhar nos recortes da CTPS.</p> : <CtpsCropEditor key={record.versao} taskId={taskId} requestId={requestId} record={record} />}
    </>}
  </section>;
}
RequestAnalysis.propTypes = { taskId:PropTypes.string.isRequired,requestId:PropTypes.string.isRequired,onDownload:PropTypes.func.isRequired,initialRecord:PropTypes.object };

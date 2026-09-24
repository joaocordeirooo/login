import PropTypes from 'prop-types';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api,save } from '@/lib/api';
import useLoad from '@/hooks/useLoad.js';
import ErrorBox from '@/components/common/ErrorBox.jsx';
import Loading from '@/components/common/Loading.jsx';
import Heading from '@/components/common/Heading.jsx';
import Field from '@/components/common/Field.jsx';
import Badge from '@/components/common/Badge.jsx';
import TaskDocuments from './TaskDocuments.jsx';
import date from '@/lib/date.js';

const options = rows => rows?.map(r => ({ value:r.id,label:r.nome })) || [];
export default function Tasks({ processId }) {
  const state = useLoad('/tarefas'+(processId ? '?processo_id='+processId : '')), cases = useLoad('/processos?selecao=1'), catalog = useLoad('/tarefas/catalogo');
  const [form,setForm] = useState(null), [error,setError] = useState(''), [busy,setBusy] = useState(false);
  const [filter,setFilter] = useState('Pendentes'), [search,setSearch] = useState(''), [sector,setSector] = useState(''), [flow,setFlow] = useState('');
  const [organizing,setOrganizing] = useState(false), [sectorName,setSectorName] = useState(''), [flowName,setFlowName] = useState(''), [flowSector,setFlowSector] = useState('');
  const [page,setPage] = useState(1);
  const change = key => e => setForm({ ...form,[key]:e.target.value,...(key === 'setor_id' ? { fluxo_id:'' } : {}) });
  async function open(task) {
    setError('');
    try {const detail=task ? await api('/tarefas/'+task.id) : null;
    setForm(detail ? { ...detail,vencimento:detail.vencimento.slice(0,10) } : { processo_id:processId || '',titulo:'',setor_id:'',fluxo_id:'',responsavel_id:'',vencimento:'',prioridade:'Normal',descricao:'' });}catch(e){setError(e.message);}
  }
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const result = await save('/tarefas' + (form.id ? '/' + form.id : ''),form,form.id ? 'PUT' : 'POST');
      setForm({ ...result,vencimento:result.vencimento.slice(0,10) });
      await state.reload();
    } catch(e) { setError(e.message); } finally { setBusy(false); }
  }
  async function toggle(t) {
    setBusy(true); setError('');
    try { await save('/tarefas/' + t.id,{ concluida:!t.concluida },'PATCH'); await state.reload(); }
    catch(e) { setError(e.message); } finally { setBusy(false); }
  }
  async function organize(e,type) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await save('/tarefas/' + (type === 'setor' ? 'setores' : 'fluxos'),type === 'setor' ? { nome:sectorName } : { nome:flowName,setor_id:flowSector });
      if (type === 'setor') setSectorName(''); else setFlowName('');
      await catalog.reload();
    } catch(e) { setError(e.message); } finally { setBusy(false); }
  }
  const list = (state.data || []).filter(t => (!processId || String(t.processo_id) === String(processId)) &&
    (filter === 'Todas' || (filter === 'Concluídas' ? t.concluida : !t.concluida)) && (!sector || String(t.setor_id) === sector) && (!flow || String(t.fluxo_id) === flow) &&
    [t.titulo,t.cliente,t.responsavel,t.processo,t.id].join(' ').toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  const pages = Math.max(1,Math.ceil(list.length/15)), current = Math.min(page,pages);
  return <>
    {!processId && <Heading title="Tarefas e prazos" subtitle="Organize as entregas por setor e fluxo de trabalho." />}
    <div className="task-toolbar"><button onClick={() => open()}>Nova tarefa</button><button className="secondary" onClick={() => setOrganizing(!organizing)}>Setores e fluxos</button></div>
    <ErrorBox>{error || cases.error || catalog.error}</ErrorBox>
    {organizing && <div className="card"><h2>Setores e fluxos de trabalho</h2><div className="form-grid">
      <form onSubmit={e => organize(e,'setor')}><Field label="Novo setor" required value={sectorName} onChange={e => setSectorName(e.target.value)} /><button disabled={busy}>Adicionar setor</button></form>
      <form onSubmit={e => organize(e,'fluxo')}><Field label="Setor do fluxo" required options={options(catalog.data?.setores)} value={flowSector} onChange={e => setFlowSector(e.target.value)} /><Field label="Novo fluxo" required value={flowName} onChange={e => setFlowName(e.target.value)} /><button disabled={busy}>Adicionar fluxo</button></form>
    </div><p className="muted">{catalog.data?.setores.length || 0} setores · {catalog.data?.fluxos.length || 0} fluxos cadastrados</p></div>}
    {form && <section className="card"><div className="section-title"><h2>{form.id ? 'Tarefa #' + form.id : 'Nova tarefa'}</h2><button className="secondary" disabled={busy} onClick={() => setForm(null)}>Fechar</button></div>
      <form onSubmit={submit}><div className="form-grid">
        <Field label="Setor" required options={options(catalog.data?.setores)} value={form.setor_id} onChange={change('setor_id')} />
        <Field label="Fluxo de trabalho" required options={options(catalog.data?.fluxos.filter(f => String(f.setor_id) === String(form.setor_id)))} value={form.fluxo_id} onChange={change('fluxo_id')} />
        {!processId && !form.id && <Field label="Cliente / caso" required options={cases.data?.map(p => ({ value:p.id,label:p.cliente + ' · ' + p.titulo })) || []} value={form.processo_id} onChange={change('processo_id')} />}
        <Field label="Título" required value={form.titulo} onChange={change('titulo')} />
        <Field label="Usuário responsável" required options={options(catalog.data?.usuarios)} value={form.responsavel_id} onChange={change('responsavel_id')} />
        <Field label="Data final esperada" type="date" required value={form.vencimento} onChange={change('vencimento')} />
        <Field label="Prioridade" required options={['Normal','Alta','Urgente']} value={form.prioridade} onChange={change('prioridade')} />
        <Field label="Descrição" type="textarea" wide value={form.descricao} onChange={change('descricao')} />
      </div>{form.id && <p className="muted">Caso: {cases.data?.find(p => String(p.id) === String(form.processo_id))?.titulo} · {form.concluida ? 'Concluída' : 'Pendente'}</p>}
      <button disabled={busy || !catalog.data || !cases.data?.length}>{busy ? 'Salvando…' : 'Salvar tarefa'}</button>
      {!cases.data?.length && <p className="muted">Cadastre um caso para criar tarefas.</p>}</form>
      {form.id ? <TaskDocuments key={form.id} taskId={String(form.id)} /> : <p className="muted">Salve a tarefa para anexar arquivos e preparar uma solicitação externa.</p>}
    </section>}
    <div className="card"><div className="section-title"><h2>Atividades <small>({list.length})</small></h2></div>
      <div className="task-filters"><input aria-label="Pesquisar tarefas" placeholder="Pesquisar tarefa, cliente ou responsável…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <select aria-label="Situação" value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}>{['Pendentes','Concluídas','Todas'].map(f => <option key={f}>{f}</option>)}</select>
        <select aria-label="Filtrar setor" value={sector} onChange={e => { setSector(e.target.value); setFlow(''); setPage(1); }}><option value="">Todos os setores</option>{catalog.data?.setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select>
        <select aria-label="Filtrar fluxo" value={flow} onChange={e => { setFlow(e.target.value); setPage(1); }}><option value="">Todos os fluxos</option>{catalog.data?.fluxos.filter(f => !sector || String(f.setor_id) === sector).map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}</select>
      </div>
      <Loading state={state}><div className="table-wrap"><table className="task-table"><thead><tr>{['Código / tarefa','Situação','Prioridade','Setor','Fluxo','Responsável','Prazo','Cliente / caso','Ações'].map(h => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>
        {list.slice((current-1)*15,current*15).map(t => <tr key={t.id}><td><small>#{t.id}</small><button className="task-title" onClick={() => open(t)}>{t.titulo}</button></td><td><Badge>{t.concluida ? 'Concluída' : new Date(t.vencimento.slice(0,10) + 'T23:59:59') < new Date() ? 'Atrasada' : 'Pendente'}</Badge></td><td>{t.prioridade}</td><td>{t.setor}</td><td>{t.fluxo}</td><td>{t.responsavel || 'Não definido'}</td><td className="task-date">{date(t.vencimento)}</td><td><Link to={'/processos/' + t.processo_id}>{t.cliente}</Link><p className="muted">{t.processo}</p></td><td><button className="secondary" disabled={busy} onClick={() => toggle(t)}>{t.concluida ? 'Reabrir' : 'Concluir'}</button></td></tr>)}
      </tbody></table></div>{!list.length && <p className="empty">Nenhuma tarefa nesta seleção.</p>}
      <div className="task-pagination"><span>{list.length} tarefas · Página {current} de {pages}</span><button className="secondary" disabled={current === 1} onClick={() => setPage(current-1)}>Anterior</button><button className="secondary" disabled={current === pages} onClick={() => setPage(current+1)}>Próxima</button></div></Loading>
    </div>
  </>;
}
Tasks.propTypes = { processId:PropTypes.string };

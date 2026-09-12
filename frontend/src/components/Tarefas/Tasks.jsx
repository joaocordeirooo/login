import PropTypes from 'prop-types';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { save } from "@/lib/api";
import useLoad from '@/hooks/useLoad.js';
import ErrorBox from '@/components/common/ErrorBox.jsx';
import Loading from '@/components/common/Loading.jsx';
import Heading from '@/components/common/Heading.jsx';
import Field from '@/components/common/Field.jsx';
import Badge from '@/components/common/Badge.jsx';
import date from '@/lib/date.js';
function Tasks({
  processId
}) {
  const state = useLoad('/tarefas'),
    cases = useLoad('/processos'),
    [form, setForm] = useState({
      processo_id: processId || '',
      titulo: '',
      responsavel: '',
      vencimento: '',
      prioridade: 'Normal'
    }),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [filter, setFilter] = useState('Pendentes');
  const change = key => e => setForm({
    ...form,
    [key]: e.target.value
  });
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await save('/tarefas', form);
      setForm({
        ...form,
        titulo: '',
        vencimento: ''
      });
      await state.reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function toggle(t) {
    setBusy(true);
    setError('');
    try {
      await save('/tarefas/' + t.id, {
        concluida: !t.concluida
      }, 'PATCH');
      await state.reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const list = state.data?.filter(t => (!processId || String(t.processo_id) === processId) && (filter === 'Todas' || (filter === 'Concluídas' ? t.concluida : !t.concluida))) || [];
  return <>{!processId && <Heading title="Tarefas e prazos" subtitle="Planeje as atividades e acompanhe as entregas do escritório." />}<form className="card" onSubmit={submit}><h2>Nova tarefa</h2><div className="form-grid">{!processId && <Field label="Processo / caso" required options={cases.data?.map(p => ({
          value: p.id,
          label: p.cliente + ' · ' + p.titulo
        })) || []} value={form.processo_id} onChange={change('processo_id')} />}<Field label="O que precisa ser feito?" required value={form.titulo} onChange={change('titulo')} /><Field label="Vencimento" type="date" required value={form.vencimento} onChange={change('vencimento')} /><Field label="Responsável" value={form.responsavel} onChange={change('responsavel')} /><Field label="Prioridade" required options={['Normal', 'Alta', 'Urgente']} value={form.prioridade} onChange={change('prioridade')} /></div><button disabled={busy || !cases.data?.length}>{busy ? 'Salvando…' : 'Criar tarefa'}</button>{cases.data?.length === 0 && <p className="muted">Abra um caso antes de criar tarefas.</p>}</form><ErrorBox>{error || cases.error}</ErrorBox><div className="card"><div className="section-title"><h2>Atividades</h2><select aria-label="Filtrar tarefas" value={filter} onChange={e => setFilter(e.target.value)}>{['Pendentes', 'Concluídas', 'Todas'].map(f => <option key={f}>{f}</option>)}</select></div><Loading state={state}>{list.map(t => <div className="list-row" key={t.id}><div><Link to={'/processos/' + t.processo_id}><strong>{t.titulo}</strong></Link><p className="muted">{t.cliente} · {t.responsavel || 'Sem responsável'} · {date(t.vencimento)}</p><Badge>{t.concluida ? 'Concluído' : !t.concluida && new Date(t.vencimento.slice(0, 10) + 'T23:59:59') < new Date() ? 'Atrasada' : t.prioridade}</Badge></div><button disabled={busy} className="secondary" onClick={() => toggle(t)}>{t.concluida ? 'Reabrir' : 'Concluir'}</button></div>)}{!list.length && <p className="empty">Nenhuma tarefa nesta seleção.</p>}</Loading></div></>;
}
Tasks.propTypes = {
  processId: PropTypes.string
};
export default Tasks;

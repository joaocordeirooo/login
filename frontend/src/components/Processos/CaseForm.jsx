import PropTypes from 'prop-types';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { save } from "@/lib/api";
import useLoad from '@/hooks/useLoad.js';
import ErrorBox from '@/components/common/ErrorBox.jsx';
import Field from '@/components/common/Field.jsx';
import statuses from '@/lib/processos.js';
function CaseForm({
  initial,
  onSaved,
  onCancel
}) {
  const clients = useLoad('/clientes?selecao=1'),
    [search] = useSearchParams(),
    [form, setForm] = useState(initial || {
      cliente_id: search.get('cliente') || '',
      titulo: '',
      tipo: '',
      natureza: 'Administrativo',
      status: 'Em análise',
      numero: '',
      responsavel: '',
      descricao: ''
    }),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const change = key => e => setForm({
    ...form,
    [key]: e.target.value
  });
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      onSaved(await save('/processos' + (initial ? '/' + initial.id : ''), form, initial ? 'PUT' : 'POST'));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return <form className="card" onSubmit={submit}><div className="form-grid"><Field label="Cliente" required options={clients.data?.map(c => ({
        value: c.id,
        label: c.nome
      })) || []} value={form.cliente_id} onChange={change('cliente_id')} /><Field label="Título do caso" required value={form.titulo} onChange={change('titulo')} /><Field label="Tipo de processo (ex.: aposentadoria)" required value={form.tipo} onChange={change('tipo')} /><Field label="Natureza" required options={['Administrativo', 'Judicial', 'Consultivo']} value={form.natureza} onChange={change('natureza')} /><Field label="Número do processo / protocolo" value={form.numero} onChange={change('numero')} /><Field label="Situação" required options={statuses} value={form.status} onChange={change('status')} /><Field label="Responsável" value={form.responsavel} onChange={change('responsavel')} /><Field wide label="Resumo e objetivo do caso" type="textarea" value={form.descricao} onChange={change('descricao')} /></div>{clients.data?.length === 0 && <p>Cadastre um <Link to="/clientes/novo">cliente</Link> antes de abrir o caso.</p>}<ErrorBox>{error || clients.error}</ErrorBox><div className="actions"><button disabled={busy || !clients.data?.length}>{busy ? 'Salvando…' : 'Salvar caso'}</button><Link className="button secondary" onClick={onCancel} to={initial ? '/processos/' + initial.id : '/processos'}>Cancelar</Link></div></form>;
}
CaseForm.propTypes = {
  initial: PropTypes.object,
  onSaved: PropTypes.func.isRequired,
  onCancel: PropTypes.func
};
export default CaseForm;

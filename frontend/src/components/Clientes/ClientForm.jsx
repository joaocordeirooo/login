import PropTypes from 'prop-types';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { save } from "@/lib/api";
import ErrorBox from '@/components/common/ErrorBox.jsx';
import Field from '@/components/common/Field.jsx';
import groups from '@/lib/clientes.js';
function ClientForm({
  initial,
  onSaved,
  onCancel
}) {
  const [form, setForm] = useState(initial || {
      nome: '',
      cpf: '',
      dados: {}
    }),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      onSaved(await save('/clientes' + (initial ? '/' + initial.id : ''), form, initial ? 'PUT' : 'POST'));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return <form className="card" onSubmit={submit}><h2>Identificação do cliente</h2><div className="form-grid"><Field label="Nome completo" required value={form.nome} onChange={e => setForm({
        ...form,
        nome: e.target.value
      })} /><Field label="CPF" value={form.cpf} onChange={e => setForm({
        ...form,
        cpf: e.target.value
      })} /></div>{groups.map(([title, fields]) => <section className="form-section" key={title}><h3>{title}</h3><div className="form-grid">{fields.map(([key, label, type]) => <Field key={key} label={label} type={type} value={form.dados[key]} onChange={e => setForm({
          ...form,
          dados: {
            ...form.dados,
            [key]: e.target.value
          }
        })} />)}</div></section>)}<Field label="Observações gerais" type="textarea" value={form.dados.observacoes} onChange={e => setForm({
      ...form,
      dados: {
        ...form.dados,
        observacoes: e.target.value
      }
    })} /><ErrorBox>{error}</ErrorBox><div className="actions"><button disabled={busy}>{busy ? 'Salvando…' : 'Salvar cadastro'}</button><Link className="button secondary" onClick={onCancel} to={initial ? '/clientes/' + initial.id : '/clientes'}>Cancelar</Link></div></form>;
}
ClientForm.propTypes = {
  initial: PropTypes.object,
  onSaved: PropTypes.func.isRequired,
  onCancel: PropTypes.func
};
export default ClientForm;

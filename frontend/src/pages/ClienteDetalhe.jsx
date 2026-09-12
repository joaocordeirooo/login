import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import useLoad from '@/hooks/useLoad.js';
import Loading from '@/components/common/Loading.jsx';
import Heading from '@/components/common/Heading.jsx';
import CaseList from '@/components/Processos/CaseList.jsx';
import ClientForm from '@/components/Clientes/ClientForm.jsx';
import groups from '@/lib/clientes.js';
import date from '@/lib/date.js';
function ClientDetail() {
  const {
      id
    } = useParams(),
    state = useLoad('/clientes/' + id),
    cases = useLoad('/processos'),
    [editing, setEditing] = useState(false);
  return <Loading state={state}>{state.data && <><Link className="back" to="/clientes"><ArrowLeft size={16} />Clientes</Link><Heading title={state.data.nome} subtitle={'Cliente desde ' + date(state.data.criado_em)}><button className="secondary" onClick={() => setEditing(!editing)}>{editing ? 'Voltar ao cadastro' : 'Editar cadastro'}</button></Heading>{editing ? <ClientForm key={id} initial={state.data} onCancel={() => setEditing(false)} onSaved={() => {
        setEditing(false);
        state.reload();
      }} /> : <><div className="card"><h2>Cadastro do cliente</h2><div className="details"><div><small>CPF</small><p>{state.data.cpf || 'Não informado'}</p></div>{groups.flatMap(([, fields]) => fields).map(([key, label, type]) => <div key={key}><small>{label}</small><p>{type === 'date' ? date(state.data.dados[key]) : state.data.dados[key] || '—'}</p></div>)}</div>{state.data.dados.observacoes && <p className="note">{state.data.dados.observacoes}</p>}</div><div className="card"><div className="section-title"><h2>Processos e casos</h2><Link className="button" to={'/processos/novo?cliente=' + id}><Plus size={16} />Abrir caso</Link></div><Loading state={cases}><CaseList data={cases.data?.filter(p => String(p.cliente_id) === id) || []} /></Loading></div></>}</>}</Loading>;
}
export default ClientDetail;

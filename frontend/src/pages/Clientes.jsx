import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import useLoad from '@/hooks/useLoad.js';
import Loading from '@/components/common/Loading.jsx';
import Heading from '@/components/common/Heading.jsx';
function Clientes() {
  const state = useLoad('/clientes'),
    [q, setQ] = useState('');
  const list = state.data?.filter(c => (c.nome + ' ' + (c.cpf || '')).toLowerCase().includes(q.toLowerCase())) || [];
  return <><Heading title="Clientes" subtitle="O ponto de partida para conhecer e acompanhar cada história."><Link className="button" to="/clientes/novo"><Plus size={17} />Novo cliente</Link></Heading><div className="search"><Search size={18} /><input aria-label="Buscar clientes" placeholder="Buscar por nome ou CPF" value={q} onChange={e => setQ(e.target.value)} /></div><Loading state={state}><div className="card table-wrap"><table><thead><tr><th>Cliente</th><th>CPF</th><th>Contato</th><th>Casos</th></tr></thead><tbody>{list.map(c => <tr key={c.id}><td><Link to={'/clientes/' + c.id}>{c.nome}</Link></td><td>{c.cpf || 'Não informado'}</td><td>{c.dados.telefone || c.dados.email || '—'}</td><td>{c.processos}</td></tr>)}</tbody></table>{!list.length && <p className="empty">Nenhum cliente encontrado. Comece pelo primeiro cadastro.</p>}</div></Loading></>;
}
export default Clientes;

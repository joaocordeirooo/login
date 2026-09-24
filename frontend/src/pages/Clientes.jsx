import { useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import useLoad from '@/hooks/useLoad.js';
import Loading from '@/components/common/Loading.jsx';
import Heading from '@/components/common/Heading.jsx';
function Clientes() {
  const [q,setQ]=useState(''),[query,setQuery]=useState(''),[page,setPage]=useState(1);
  useEffect(()=>{const timer=setTimeout(()=>{setQuery(q);setPage(1);},250);return()=>clearTimeout(timer);},[q]);
  const state=useLoad(`/clientes?pagina=${page}&q=${encodeURIComponent(query)}`),list=state.data?.items || [];
  return <><Heading title="Clientes" subtitle="O ponto de partida para conhecer e acompanhar cada história."><Link className="button" to="/clientes/novo"><Plus size={17} />Novo cliente</Link></Heading><div className="search"><Search size={18} /><input aria-label="Buscar clientes" placeholder="Buscar por nome ou CPF" value={q} onChange={e => setQ(e.target.value)} /></div><Loading state={state}><div className="card table-wrap"><table><thead><tr><th>Cliente</th><th>CPF (final)</th><th>Contato</th><th>Casos</th></tr></thead><tbody>{list.map(c => <tr key={c.id}><td><Link to={'/clientes/' + c.id}>{c.nome}</Link></td><td>{c.cpf || 'Não informado'}</td><td>{c.dados.telefone || c.dados.email || '—'}</td><td>{c.processos}</td></tr>)}</tbody></table>{!list.length && <p className="empty">Nenhum cliente encontrado. Comece pelo primeiro cadastro.</p>}<div className="task-pagination"><span>{state.data?.total || 0} clientes · Página {page}</span><button className="secondary" disabled={page===1} onClick={()=>setPage(page-1)}>Anterior</button><button className="secondary" disabled={page*25>=(state.data?.total || 0)} onClick={()=>setPage(page+1)}>Próxima</button></div></div></Loading></>;
}
export default Clientes;

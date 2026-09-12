import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import useLoad from '@/hooks/useLoad.js';
import Loading from '@/components/common/Loading.jsx';
import Heading from '@/components/common/Heading.jsx';
import CaseList from '@/components/Processos/CaseList.jsx';
function Processos() {
  const state = useLoad('/processos'),
    [q, setQ] = useState('');
  return <><Heading title="Processos e casos" subtitle="Pastas digitais para demandas judiciais, administrativas e consultivas."><Link className="button" to="/processos/novo"><Plus size={17} />Abrir caso</Link></Heading><div className="search"><Search size={18} /><input aria-label="Buscar casos" placeholder="Buscar por cliente, título ou número" value={q} onChange={e => setQ(e.target.value)} /></div><Loading state={state}><div className="card"><CaseList data={state.data?.filter(p => (p.titulo + ' ' + p.cliente + ' ' + (p.numero || '')).toLowerCase().includes(q.toLowerCase())) || []} /></div></Loading></>;
}
export default Processos;

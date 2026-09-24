import { Link } from 'react-router-dom';
import { Users, FolderOpen, CalendarDays, Plus } from 'lucide-react';
import useLoad from '@/hooks/useLoad.js';
import ErrorBox from '@/components/common/ErrorBox.jsx';
import Heading from '@/components/common/Heading.jsx';
import Badge from '@/components/common/Badge.jsx';
import CaseList from '@/components/Processos/CaseList.jsx';
import date from '@/lib/date.js';
function Dashboard() {
  const state=useLoad('/painel');
  const pending=state.data?.tarefas || [];
  return <><Heading title="Visão geral" subtitle="Acompanhe o escritório e organize os próximos passos."><Link className="button" to="/clientes/novo"><Plus size={17} />Cadastrar cliente</Link></Heading><ErrorBox>{state.error}</ErrorBox><div className="stats">{[['Clientes cadastrados', state.data?.totais.clientes, Users], ['Casos em aberto', state.data?.totais.casos, FolderOpen], ['Tarefas pendentes', state.data?.totais.tarefas, CalendarDays]].map(([label, value, Icon]) => <div className="card stat" key={label}><Icon size={23} /><span>{label}</span><strong>{value ?? '—'}</strong></div>)}</div><div className="card"><div className="section-title"><h2>Próximas tarefas</h2><Link to="/prazos">Ver todas →</Link></div>{!state.data ? <p className="empty">Carregando…</p> : !pending.length ? <p className="empty">Nenhuma tarefa pendente. Cadastre um caso para planejar as atividades.</p> : pending.slice(0, 6).map(t => <Link className="list-row" key={t.id} to={'/processos/' + t.processo_id}><div><strong>{t.titulo}</strong><p className="muted">{t.cliente} · {t.processo}</p></div><Badge>{date(t.vencimento)}</Badge></Link>)}</div><div className="card"><div className="section-title"><h2>Processos e casos recentes</h2><Link to="/processos">Ver todos →</Link></div><CaseList data={state.data?.casos || []} /></div></>;
}
export default Dashboard;

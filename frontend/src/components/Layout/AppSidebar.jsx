import { Link, NavLink } from 'react-router-dom';
import { Scale, LayoutDashboard, Users, FolderOpen, CalendarDays, LogOut } from 'lucide-react';
import { logout } from "@/lib/api";
import PropTypes from 'prop-types';
function AppSidebar({
  usuario
}) {
  return <aside className="nav"><Link className="brand" to="/dashboard"><Scale /> FORENTIS<span>Gestão jurídica</span></Link><p className="nav-label">ESCRITÓRIO</p>{[['/dashboard', 'Visão geral', LayoutDashboard], ['/clientes', 'Clientes', Users], ['/processos', 'Processos e casos', FolderOpen], ['/prazos', 'Tarefas e prazos', CalendarDays]].map(([path, label, Icon]) => <NavLink key={path} to={path}><Icon size={19} />{label}</NavLink>)}<div className="nav-bottom"><strong>{usuario?.nome}</strong><small>Escritório local</small><button className="ghost" onClick={() => {
        logout();
        window.location.assign('/login');
      }}><LogOut size={16} />Sair da conta</button></div></aside>;
}
AppSidebar.propTypes = {
  usuario: PropTypes.shape({
    nome: PropTypes.string
  })
};
export default AppSidebar;

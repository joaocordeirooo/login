import AppSidebar from './AppSidebar';
import { Navigate, Outlet } from 'react-router-dom';
import { token } from "@/lib/api";
import useLoad from '@/hooks/useLoad.js';
import Loading from '@/components/common/Loading.jsx';
function Layout() {
  const me = useLoad('/me');
  if (!token()) return <Navigate to="/login" replace />;
  return <Loading state={me}><div className="shell"><AppSidebar usuario={me.data} /><main className="workspace"><div className="topline"><span>Organização para cada etapa do seu trabalho</span><span>{new Date().toLocaleDateString('pt-BR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}</span></div><Outlet /></main></div></Loading>;
}
export default Layout;

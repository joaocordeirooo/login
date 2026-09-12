import { Navigate, Route, Routes } from 'react-router-dom';
import { token } from '@/lib/api';
import AppLayout from '@/components/Layout/AppLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Clientes from '@/pages/Clientes';
import ClienteNovo from '@/pages/ClienteNovo';
import ClienteDetalhe from '@/pages/ClienteDetalhe';
import Processos from '@/pages/Processos';
import ProcessoNovo from '@/pages/ProcessoNovo';
import ProcessoDetalhe from '@/pages/ProcessoDetalhe';
import Prazos from '@/pages/Prazos';
import './workspace.css';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/clientes/novo" element={<ClienteNovo />} />
        <Route path="/clientes/:id" element={<ClienteDetalhe />} />
        <Route path="/processos" element={<Processos />} />
        <Route path="/processos/novo" element={<ProcessoNovo />} />
        <Route path="/processos/:id" element={<ProcessoDetalhe />} />
        <Route path="/prazos" element={<Prazos />} />
      </Route>
      <Route path="*" element={<Navigate to={token() ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}

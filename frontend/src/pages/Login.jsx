import { Scale } from 'lucide-react';
import LoginForm from '@/components/Login/LoginForm';

export default function Login() {
  return (
    <div className="login-page">
      <div className="login-story">
        <Scale size={48} />
        <p className="eyebrow">FORENTIS · GESTÃO JURÍDICA</p>
        <h1>O histórico de cada cliente.<br />Sempre à mão.</h1>
        <p>Clientes, casos e atividades reunidos em um só lugar, para cuidar do que importa.</p>
      </div>
      <LoginForm />
    </div>
  );
}

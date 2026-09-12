import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { save, logout } from "@/lib/api";
import useLoad from '@/hooks/useLoad.js';
import ErrorBox from '@/components/common/ErrorBox.jsx';
import Field from '@/components/common/Field.jsx';
function LoginForm() {
  const navigate = useNavigate(),
    setup = useLoad('/setup');
  const [form, setForm] = useState({
      email: '',
      senha: '',
      nome: ''
    }),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [remember, setRemember] = useState(false);
  const first = setup.data?.necessario;
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await save(first ? '/setup' : '/usuarios/login', form);
      logout();
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem('token', result.token);
      storage.setItem('usuario', JSON.stringify(result.usuario));
      navigate('/dashboard');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return <div className="login-card"><h2>{first ? 'Configure seu escritório' : 'Bem-vindo ao Forentis'}</h2><p className="muted">{first ? 'Crie o primeiro acesso para começar.' : 'Entre com sua conta para continuar.'}</p><form onSubmit={submit}>{first && <Field label="Seu nome" name="nome" required value={form.nome} onChange={e => setForm({
        ...form,
        nome: e.target.value
      })} />}<Field label="E-mail" type="email" required value={form.email} onChange={e => setForm({
        ...form,
        email: e.target.value
      })} /><Field label="Senha" type="password" required value={form.senha} onChange={e => setForm({
        ...form,
        senha: e.target.value
      })} />{first && <small>Mínimo de 8 caracteres.</small>}<label className="check"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />Manter conectado</label><ErrorBox>{error || setup.error}</ErrorBox><button disabled={busy || !setup.data}>{busy ? 'Aguarde…' : first ? 'Criar escritório' : 'Entrar'}</button></form><small>Ambiente local · Seus dados no seu escritório</small></div>;
}
export default LoginForm;

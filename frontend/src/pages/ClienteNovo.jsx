import { useNavigate } from 'react-router-dom';
import Heading from '@/components/common/Heading.jsx';
import ClientForm from '@/components/Clientes/ClientForm.jsx';
function ClientNew() {
  const nav = useNavigate();
  return <><Heading title="Novo cliente" subtitle="Preencha os dados disponíveis. Você pode complementá-los depois." /><ClientForm onSaved={c => nav('/clientes/' + c.id)} /></>;
}
export default ClientNew;

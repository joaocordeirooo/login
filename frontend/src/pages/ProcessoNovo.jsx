import { useNavigate } from 'react-router-dom';
import Heading from '@/components/common/Heading.jsx';
import CaseForm from '@/components/Processos/CaseForm.jsx';
function CaseNew() {
  const nav = useNavigate();
  return <><Heading title="Abrir processo ou caso" subtitle="Crie uma pasta para a necessidade do cliente, mesmo sem número judicial." /><CaseForm onSaved={p => nav('/processos/' + p.id)} /></>;
}
export default CaseNew;

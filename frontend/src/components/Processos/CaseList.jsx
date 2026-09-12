import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import Badge from '@/components/common/Badge.jsx';
function CaseList({
  data
}) {
  return data.length ? data.map(p => <Link className="list-row" key={p.id} to={'/processos/' + p.id}><div><strong>{p.titulo}</strong><p className="muted">{p.cliente} · {p.tipo} · {p.natureza}</p></div><Badge>{p.status}</Badge></Link>) : <p className="empty">Nenhum caso cadastrado.</p>;
}
CaseList.propTypes = {
  data: PropTypes.array.isRequired
};
export default CaseList;

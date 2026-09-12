import PropTypes from 'prop-types';
import ErrorBox from '@/components/common/ErrorBox.jsx';
function Loading({
  state,
  children
}) {
  return state.error ? <ErrorBox>{state.error}</ErrorBox> : state.data === null ? <p className="empty">Carregando…</p> : children;
}
Loading.propTypes = {
  state: PropTypes.shape({
    error: PropTypes.string,
    data: PropTypes.any
  }).isRequired,
  children: PropTypes.node
};
export default Loading;

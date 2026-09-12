import PropTypes from 'prop-types';
function Badge({
  children
}) {
  return <span className={'badge ' + (children === 'Concluído' ? 'green' : '')}>{children}</span>;
}
Badge.propTypes = {
  children: PropTypes.node
};
export default Badge;

import PropTypes from 'prop-types';
function ErrorBox({
  children
}) {
  return children ? <div role="alert" className="error">{children}</div> : null;
}
ErrorBox.propTypes = {
  children: PropTypes.node
};
export default ErrorBox;

import PropTypes from 'prop-types';
function Heading({
  title,
  subtitle,
  children
}) {
  return <div className="heading"><div><p className="eyebrow">ESCRITÓRIO DIGITAL</p><h1>{title}</h1><p className="muted">{subtitle}</p></div><div>{children}</div></div>;
}
Heading.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  children: PropTypes.node
};
export default Heading;

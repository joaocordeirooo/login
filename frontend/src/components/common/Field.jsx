import PropTypes from 'prop-types';
function Field({
  label,
  name,
  value,
  onChange,
  type = 'text',
  required = false,
  disabled = false,
  options,
  wide = false
}) {
  return <label className={wide ? 'wide' : ''}><span>{label}{required ? ' *' : ''}</span>{options ? <select disabled={disabled} name={name} value={value || ''} required={required} onChange={onChange}><option value="">Selecione</option>{options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}</select> : type === 'textarea' ? <textarea disabled={disabled} name={name} value={value || ''} onChange={onChange} rows={4} /> : <input disabled={disabled} name={name} value={value || ''} onChange={onChange} type={type} required={required} maxLength={type === 'text' ? 255 : undefined} />}</label>;
}
Field.propTypes = {
  label: PropTypes.string,
  name: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  type: PropTypes.string,
  required: PropTypes.bool,
  options: PropTypes.array,
  wide: PropTypes.bool
};
export default Field;

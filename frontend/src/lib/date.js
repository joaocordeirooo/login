const date = value => value ? new Date(value.length === 10 ? value + 'T12:00:00' : value).toLocaleDateString('pt-BR') : '—';
export default date;

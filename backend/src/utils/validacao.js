const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), {
    status
  });
};
const required = (value, label, max = 10000) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail(`${label}: preencha um valor válido (até ${max} caracteres).`);
  return value.trim();
};
const id = value => {
  if (!/^\d+$/.test(String(value))) fail('Identificador inválido.');
  return value;
};
const choice = (value, list) => {
  if (!list.includes(value)) fail('Opção inválida.');
  return value;
};
export { fail, required, id, choice };

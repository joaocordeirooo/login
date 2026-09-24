export const normalizarNome = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()
  .replace(/[\uE000-\uF8FF]/g,' ').replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim();

export function dataISO(value) {
  if (typeof value !== 'string') return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const iso = m ? `${m[3]}-${m[2]}-${m[1]}` : value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const date = new Date(iso);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10) === iso ? iso : null;
}

export function cnpjValido(value) {
  const n = String(value || '').replace(/[.\/-]/g,'');
  if (!/^\d{14}$/.test(n) || /^(\d)\1+$/.test(n)) return false;
  for (const length of [12,13]) {
    let sum = 0, weight = length-7;
    for (let i=0;i<length;i++) { sum += Number(n[i])*weight; weight = weight === 2 ? 9 : weight-1; }
    const digit = sum%11 < 2 ? 0 : 11-sum%11;
    if (Number(n[length]) !== digit) return false;
  }
  return true;
}

export function fatorSelecionado(value) {
  return /^1[.,]40?$/.test(String(value).trim());
}

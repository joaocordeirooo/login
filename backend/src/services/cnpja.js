import {fail} from '../utils/validacao.js';
import {cnpjValido} from '../utils/documentosExternos.js';
import pool from '../config/database.js';

const pending=new Map();
export function normalizarEmpresa(body,cnpj) {
  if (body?.taxId!==cnpj || typeof body.company?.name!=='string') fail('O CNPJA retornou um estabelecimento diferente ou uma resposta inválida.',502);
  return {cnpj,razao_social:body.company.name.slice(0,255),
    emails:[...new Set((Array.isArray(body.emails)?body.emails:[]).map(e=>e.address).filter(e=>typeof e==='string' && e.length<=254 && /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(e)))].slice(0,10),
    telefones:[...new Set((Array.isArray(body.phones)?body.phones:[]).map(p=>String(p.area || '')+String(p.number || '')).filter(p=>/^\d{10,11}$/.test(p)))].slice(0,10),
    situacao:typeof body.status?.text==='string' ? body.status.text.slice(0,100) : ''};
}
export async function consultarCnpja(cnpj,{fetchImpl=fetch}={}) {
  if (!cnpjValido(cnpj)) fail('Confira o CNPJ completo do estabelecimento antes de consultar o CNPJA.');
  const cached=(await pool.query("SELECT cnpj,razao_social,emails,telefones,situacao,consultado_em FROM empresa_contatos WHERE cnpj=$1 AND consultado_em>NOW()-INTERVAL '7 days'",[cnpj])).rows[0];
  if (cached) return cached;
  if (pending.has(cnpj)) return pending.get(cnpj);
  const operation=(async()=>{
    const cx=await pool.connect();
    try {
      await cx.query('BEGIN');
      await cx.query('SELECT pg_advisory_xact_lock(734219)');
      const count=Number((await cx.query("SELECT COUNT(*) FROM cnpja_consultas WHERE criado_em>NOW()-INTERVAL '1 minute'")).rows[0].count);
      if (count>=5) fail('O CNPJA permite 5 consultas por minuto. Aguarde um minuto e tente novamente.',429);
      await cx.query("DELETE FROM cnpja_consultas WHERE criado_em<NOW()-INTERVAL '1 day'");
      await cx.query('INSERT INTO cnpja_consultas DEFAULT VALUES');
      await cx.query('COMMIT');
    } catch(e) {await cx.query('ROLLBACK');throw e;} finally {cx.release();}
    let response;
    try {response=await fetchImpl('https://open.cnpja.com/office/'+cnpj,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(20000),redirect:'error'});}
    catch {fail('Não foi possível conectar ao CNPJA. Tente novamente mais tarde.',502);}
    if (response.status===404) fail('Estabelecimento não encontrado no CNPJA. Confira o CNPJ.',404);
    if (response.status===429) fail('O CNPJA limitou as consultas deste endereço de rede. Aguarde um minuto.',429);
    if (!response.ok) fail('O CNPJA está indisponível para esta consulta. Tente novamente mais tarde.',502);
    const body=await response.json().catch(()=>null),empresa=normalizarEmpresa(body,cnpj);
    return (await pool.query(`INSERT INTO empresa_contatos(cnpj,razao_social,emails,telefones,situacao) VALUES($1,$2,$3,$4,$5)
      ON CONFLICT(cnpj) DO UPDATE SET razao_social=$2,emails=$3,telefones=$4,situacao=$5,consultado_em=NOW()
      RETURNING cnpj,razao_social,emails,telefones,situacao,consultado_em`,[cnpj,empresa.razao_social,JSON.stringify(empresa.emails),JSON.stringify(empresa.telefones),empresa.situacao])).rows[0];
  })();
  pending.set(cnpj,operation);
  try{return await operation;}finally{pending.delete(cnpj);}
}

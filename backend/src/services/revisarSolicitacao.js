import { fail, required } from '../utils/validacao.js';
import { dataISO,cnpjValido } from '../utils/documentosExternos.js';

export function validarRevisao(body,resultado) {
  if (!body || typeof body!=='object') fail('Revisão inválida.');
  if (!Array.isArray(body.periodos) || body.periodos.length!==resultado.periodos.length || body.periodos.length>100) fail('A revisão deve conter todos os períodos da análise.');
  if (typeof body.concluida!=='boolean' || typeof body.avisos_conferidos!=='boolean') fail('Informe a situação da revisão.');
  const seen = new Set();
  const periodos = body.periodos.map(p=>{
    if (!p || typeof p!=='object') fail('Período inválido.');
    const original = resultado.periodos.find(r=>r.id===p.id);
    if (!original || seen.has(p.id)) fail('Período inválido ou duplicado.');
    seen.add(p.id);
    if (typeof p.selecionado!=='boolean' || typeof p.conferido!=='boolean') fail('Informe a seleção e a conferência do período.');
    const empresa = required(p.empresa,'Empresa',255);
    const inicio = dataISO(p.inicio), fim = dataISO(p.fim);
    if (!inicio || !fim || inicio>fim) fail('Informe datas válidas, com início anterior ou igual ao fim.');
    const cnpj = String(p.cnpj || '').trim().replace(/[.\/-]/g,'');
    if (cnpj && !cnpjValido(cnpj)) fail('CNPJ inválido. Informe os 14 dígitos do estabelecimento ou deixe vazio enquanto confere.');
    const observacoes = typeof p.observacoes==='string' ? p.observacoes.trim() : '';
    if (observacoes.length>2000) fail('As observações devem ter até 2000 caracteres.');
    const alterado = ['empresa','inicio','fim','cnpj'].some(k=>({ empresa,inicio,fim,cnpj })[k]!==original[k]);
    const exigeNota = !p.selecionado || alterado || original.original.pendencias.length>0;
    if ((p.conferido || body.concluida) && exigeNota && !observacoes) fail('Registre como conferiu as pendências, alterações ou a exclusão do período.');
    if (p.selecionado && p.conferido && !cnpj) fail('Preencha o CNPJ completo antes de marcar o período como conferido.');
    return { id:p.id,empresa,inicio,fim,cnpj,selecionado:p.selecionado,conferido:p.conferido,observacoes };
  });
  if (body.concluida) {
    if (!periodos.some(p=>p.selecionado)) fail('Selecione pelo menos um período para concluir a revisão.');
    if (periodos.some(p=>p.selecionado && (!p.conferido || !p.cnpj))) fail('Confira todos os períodos selecionados antes de concluir.');
    if (!body.avisos_conferidos) fail('Confirme a conferência dos documentos e dos avisos da análise.');
  }
  return { periodos,concluida:body.concluida,avisos_conferidos:body.avisos_conferidos };
}

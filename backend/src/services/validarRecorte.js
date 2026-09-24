import { fail,id } from '../utils/validacao.js';

export function validarTrechos(value) {
  if (!Array.isArray(value) || !value.length || value.length>12) fail('Selecione de 1 a 12 trechos para o PDF da empresa.');
  return value.map(t=>{
    if (!t || typeof t!=='object') fail('Trecho inválido.');
    if (!Number.isInteger(t.pagina) || t.pagina<1 || t.pagina>100) fail('Página inválida (1 a 100).');
    if (![0,90,180,270].includes(t.rotacao)) fail('Rotação inválida.');
    for (const field of ['x','y','largura','altura']) {
      if (typeof t[field]!=='number' || !Number.isFinite(t[field]) || t[field]<0 || t[field]>1) fail('Área de recorte inválida.');
    }
    if (t.largura<0.01 || t.altura<0.01 || t.x+t.largura>1.000001 || t.y+t.altura>1.000001) fail('O recorte deve estar dentro da página e ocupar ao menos 1% em cada dimensão.');
    return { documento_id:String(id(t.documento_id)),pagina:t.pagina,rotacao:t.rotacao,x:t.x,y:t.y,largura:t.largura,altura:t.altura };
  });
}

export function periodoDaAnalise(analise,periodoId,versao) {
  if (!analise) fail('Analise o cálculo e o CNIS antes de preparar os recortes.');
  if (!Number.isInteger(versao) || analise.versao!==versao) fail('A revisão foi alterada. Reabra a análise e gere o recorte com os dados atuais.',412);
  const periodo = (analise.revisao?.periodos || analise.resultado.periodos).find(p=>p.id===periodoId && p.selecionado);
  if (!periodo) fail('Escolha um período selecionado na solicitação.');
  return { id:periodo.id,empresa:periodo.empresa,inicio:periodo.inicio,fim:periodo.fim,cnpj:periodo.cnpj };
}

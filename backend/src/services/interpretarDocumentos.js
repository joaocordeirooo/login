import { normalizarNome, dataISO, cnpjValido, fatorSelecionado } from '../utils/documentosExternos.js';

export function linhas(items) {
  const rows = [];
  for (const item of [...items].sort((a,b) => b.y-a.y || a.x-b.x)) {
    let row = rows.find(r => Math.abs(r.y-item.y)<3);
    if (!row) { row = { y:item.y,items:[] }; rows.push(row); }
    row.items.push(item);
  }
  return rows.map(r => ({ ...r,items:r.items.sort((a,b)=>a.x-b.x),text:r.items.sort((a,b)=>a.x-b.x).map(i=>i.text).join(' ') }));
}
const center = i => i.x+i.w/2;
const text = items => linhas(items).map(r=>r.text).join(' ').trim();
const source = (doc,page,trecho) => ({ documento_id:String(doc.id),nome:doc.nome,pagina:page,trecho:trecho.slice(0,1500) });

export function lerCalculo(doc) {
  const periodos = [], avisos = [];
  let lidas = 0;
  for (const page of doc.pages) {
    const headers = page.items.filter(i => normalizarNome(i.text)==='FATOR');
    if (!headers.length) { avisos.push(`${doc.nome}, página ${page.page}: tabela de períodos não reconhecida; conferir o arquivo.`); continue; }
    for (const header of headers) {
      const same = page.items.filter(i => Math.abs(i.y-header.y)<3);
      const inicio = same.find(i=>normalizarNome(i.text)==='INICIO');
      const fim = same.find(i=>normalizarNome(i.text)==='FIM');
      const nome = same.find(i=>normalizarNome(i.text)==='NOME DO PERIODO');
      const numero = same.find(i=>/^N[º°o]?$/i.test(i.text));
      if (!inicio || !fim || !nome || !numero) { avisos.push(`${doc.nome}, página ${page.page}: colunas do cálculo não reconhecidas.`); continue; }
      const end = page.items.filter(i => i.y<header.y && /MARCO TEMPORAL/.test(normalizarNome(i.text))).sort((a,b)=>b.y-a.y)[0]?.y ?? 0;
      const anchors = page.items.filter(i => i.y<header.y && i.y>end && /^\d+$/.test(i.text) && Math.abs(center(i)-center(numero))<12).sort((a,b)=>b.y-a.y);
      if (!anchors.length) avisos.push(`${doc.nome}, página ${page.page}: nenhuma linha do cálculo reconhecida.`);
      for (let n=0;n<anchors.length;n++) {
        const anchor = anchors[n];
        const top = n ? (anchors[n-1].y+anchor.y)/2 : header.y-3;
        const bottom = n+1<anchors.length ? (anchor.y+anchors[n+1].y)/2 : end+3;
        const row = page.items.filter(i=>i.y<top && i.y>bottom);
        const factors = row.filter(i=>Math.abs(center(i)-center(header))<20 && /^\d+[.,]\d+$/.test(i.text));
        if (factors.length!==1) { avisos.push(`${doc.nome}, página ${page.page}, linha ${anchor.text}: fator não reconhecido com segurança.`); continue; }
        lidas++;
        if (!fatorSelecionado(factors[0].text)) continue;
        const dates = row.filter(i=>/^\d{2}\/\d{2}\/\d{4}$/.test(i.text));
        const start = dates.filter(i=>Math.abs(center(i)-center(inicio))<30);
        const finish = dates.filter(i=>Math.abs(center(i)-center(fim))<30);
        const nameItems = row.filter(i=>i.x>numero.x+numero.w+4 && center(i)<(center(nome)+center(inicio))/2+25);
        // Indicators in parentheses and custom glyphs are preserved in evidence, not employer identity.
        const empresa = text(nameItems).replace(/[\uE081]/g,'(').replace(/[\uE082]/g,')').replace(/\s*\(.*$/,'').replace(/^[▶►\s]+/,'').trim();
        periodos.push({ empresa,inicio:start.length===1 ? dataISO(start[0].text) : null,fim:finish.length===1 ? dataISO(finish[0].text) : null,
          fator:1.4,origem:source(doc,page.page,text(row)),linha:anchor.text });
      }
    }
  }
  if (!periodos.length) avisos.push(`${doc.nome}: nenhum período com fator 1,4 identificado. Confira se a tabela está legível e no formato suportado.`);
  return { periodos,avisos,lidas };
}

export function lerCnis(doc) {
  const vinculos = [], avisos = [], cpfs = new Set();
  let emissao = null;
  for (const page of doc.pages) {
    const rows = linhas(page.items);
    const all = rows.map(r=>r.text).join('\n');
    for (const m of all.matchAll(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g)) cpfs.add(m[0].replace(/\D/g,''));
    const stamp = all.match(/(\d{2}\/\d{2}\/\d{4})\s+\d{2}:\d{2}:\d{2}/);
    if (stamp) emissao = dataISO(stamp[1]);
    const headers = rows.filter(r=>normalizarNome(r.text).includes('CODIGO EMP'));
    for (const header of headers) {
      const next = rows.filter(r=>r.y<header.y && r.y>header.y-35);
      const row = next.find(r=>/^\d+\s+\d[.\d-]+\s+\d{2}\.\d{3}\.\d{3}/.test(r.text));
      const match = row?.text.match(/^\d+\s+\d[.\d-]+\s+(\d{2}\.\d{3}\.\d{3}(?:\/\d{4}-\d{2})?)\s+(.+?)\s+Empregado(?:\s+ou\s+Agente\s+Público)?\s+(.*)$/i);
      if (!match) { avisos.push(`${doc.nome}, página ${page.page}: vínculo em formato não reconhecido; confira o CNIS.`); continue; }
      const dates = [...match[3].matchAll(/\b\d{2}\/\d{2}\/\d{4}\b/g)].map(m=>dataISO(m[0]));
      if (!dates[0]) { avisos.push(`${doc.nome}, página ${page.page}: data de admissão não reconhecida.`); continue; }
      vinculos.push({ empresa:match[2].replace(/\s+\d+$/,'').trim(),codigo:match[1].replace(/\D/g,''),inicio:dates[0],fim:dates[1] || null,
        emissao,origem:source(doc,page.page,row.text) });
    }
  }
  if (!vinculos.length) avisos.push(`${doc.nome}: nenhum vínculo de empresa reconhecido. PDF digitalizado ou outro formato exige conferência manual.`);
  return { vinculos,avisos,cpfs:[...cpfs] };
}

export function cruzar(periodos,vinculos) {
  return periodos.map((p,index)=>{
    const name = normalizarNome(p.empresa);
    const candidates = vinculos.filter(v=>normalizarNome(v.empresa)===name && v.inicio===p.inicio);
    // Repeated CNIS snapshots of the same record are evidence duplicates, not distinct employers.
    const unique = [...new Map(candidates.map(v=>[[v.codigo,v.inicio,v.fim].join('|'),v])).values()];
    const match = unique.length===1 ? unique[0] : null;
    const pendencias = [];
    if (periodos.filter(other=>normalizarNome(other.empresa)===name && other.inicio===p.inicio && other.fim===p.fim).length>1) pendencias.push('O mesmo período aparece mais de uma vez nos cálculos selecionados. Confira e exclua duplicatas da solicitação.');
    if (!p.inicio || !p.fim || p.fim<p.inicio || !name) pendencias.push('Campos do cálculo incompletos ou datas inválidas; corrigir com base no PDF.');
    if (!match) pendencias.push(unique.length>1 ? 'Mais de um vínculo compatível no CNIS; escolha e confira o correto.' : 'Sem correspondência exata de empresa e admissão no CNIS; confira nomes anteriores e datas.');
    if (match) {
      if (match.codigo.length===8) pendencias.push('O CNIS contém somente a raiz do CNPJ. Confira o estabelecimento completo na CTPS.');
      else if (!cnpjValido(match.codigo)) pendencias.push('O CNPJ extraído não passou na validação; confira o documento.');
      if (!match.fim) pendencias.push('CNIS sem data de saída. O fim do cálculo é o período solicitado, não uma demissão confirmada.');
      else if (match.fim!==p.fim) pendencias.push('A data final do cálculo difere da saída no CNIS.');
      if (match.emissao && p.fim>match.emissao) pendencias.push('O período solicitado termina depois da emissão do CNIS.');
    }
    const original = { ...p,cnis:match,candidatos:unique,pendencias };
    return { id:String(index+1),original,empresa:p.empresa,inicio:p.inicio || '',fim:p.fim || '',cnpj:match && cnpjValido(match.codigo) ? match.codigo : '',
      selecionado:true,conferido:false,observacoes:'' };
  });
}

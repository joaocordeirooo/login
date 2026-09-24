// Small, synthetic text PDFs: no client data or external generation dependency.
export function pdf(items) {
  const escape = s => s.replace(/([\\()])/g,'\\$1');
  const stream = items.map(([text,x,y])=>`BT /F1 10 Tf 1 0 0 1 ${x} ${y} Tm (${escape(text)}) Tj ET`).join('\n');
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 850 800] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
  let output = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((obj,i)=>{ offsets.push(Buffer.byteLength(output)); output += `${i+1} 0 obj\n${obj}\nendobj\n`; });
  const xref = Buffer.byteLength(output);
  output += `xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(o=>`${String(o).padStart(10,'0')} 00000 n \n`).join('');
  output += `trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(output);
}
export const calculationItems = [
  ['N',25,720],['Nome do periodo',70,720],['Inicio',225,720],['Fim',300,720],['Fator',355,720],
  ['1',25,680],['EMPRESA ALFA LTDA',65,680],['03/01/2000',215,680],['12/01/2009',285,680],['1.40',355,680],
  ['2',25,640],['EMPRESA BETA LTDA',65,640],['13/04/2009',215,640],['13/02/2026',285,640],['1,4',355,640],
  ['3',25,600],['EMPRESA GAMA LTDA',65,600],['01/01/1999',215,600],['02/01/1999',285,600],['1.00',355,600],
  ['Marco Temporal',65,550]
];
export const cnisItems = [
  ['10/12/2024 08:46:19',680,750],
  ['Seq. NIT Codigo Emp. Origem do Vinculo Tipo Filiado Dt. Inicio Dt. Fim Ult.',60,700],
  ['1 1.111.111.111-1 01.603.889/0001-64 EMPRESA ALFA LTDA Empregado 03/01/2000 12/01/2009 01/2009',60,682],
  ['Indicadores:',60,660],
  ['Seq. NIT Codigo Emp. Origem do Vinculo Tipo Filiado Dt. Inicio Dt. Fim Ult.',60,600],
  ['2 1.111.111.111-1 10.556.018 EMPRESA BETA LTDA 107 Empregado 13/04/2009 11/2024',60,582],
  ['Indicadores:',60,560]
];
export function document(items,id='1') { return { id,nome:'Sintetico.pdf',pages:[{ page:1,items:items.map(([text,x,y])=>({ text,x,y,w:text.length*5 })) }] }; }

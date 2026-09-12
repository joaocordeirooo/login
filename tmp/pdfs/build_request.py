from pathlib import Path
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4

out = Path('output/pdf')
out.mkdir(parents=True, exist_ok=True)
title = 'REQUERIMENTO DE PRORROGAÇÃO DE BENEFÍCIO'
paragraphs = [
'Ao Instituto Nacional do Seguro Social - INSS',
'<b>Beneficiário:</b> Jamir Antunes Cordeiro<br/><b>CPF:</b> 463.559.019-49<br/><b>Número do benefício (NB):</b> __________________________',
'Eu, <b>Jamir Antunes Cordeiro</b>, solicito a prorrogação do meu benefício por incapacidade temporária, pois permaneço sem condições de retornar às minhas atividades de trabalho, conforme a documentação médica anexa.',
'O atestado médico emitido em <b>09/09/2026</b> pelo Hospital Fraiburgo indica a necessidade de afastamento das atividades de <b>06/09/2026 a 04/03/2027</b>, para tratamento de fratura do fêmur (CID S72.3). Os demais documentos anexos demonstram a continuidade do tratamento e as limitações de mobilidade.',
'Diante disso, peço a análise da documentação médica e a prorrogação do benefício pelo período necessário à recuperação, considerando o afastamento indicado no atestado e a avaliação do INSS.',
'Nestes termos, peço deferimento.',
'Fraiburgo/SC, ______ de __________________ de __________.',
]
style = ParagraphStyle('body', fontName='Helvetica', fontSize=12, leading=19, alignment=TA_JUSTIFY, spaceAfter=17)
story = [Paragraph(title, ParagraphStyle('title', fontName='Helvetica-Bold', fontSize=14, leading=20, alignment=TA_CENTER)), Spacer(1,30)]
story += [Paragraph(p,style) for p in paragraphs]
story += [Spacer(1,28), Paragraph('________________________________________________<br/>Jamir Antunes Cordeiro<br/>Assinatura do beneficiário',ParagraphStyle('sign',fontName='Helvetica',fontSize=11,leading=17,alignment=TA_CENTER))]
SimpleDocTemplate(str(out/'requerimento_prorrogacao_Jamir.pdf'),pagesize=A4,rightMargin=58,leftMargin=58,topMargin=58,bottomMargin=58).build(story)
text = title+'\n\n'+'\n\n'.join(paragraphs)
import re
text = re.sub('<br/>','\n',text)
text = re.sub('</?b>','',text)
(out/'requerimento_prorrogacao_Jamir.txt').write_text(text+'\n\n________________________________________\nJamir Antunes Cordeiro\nAssinatura do beneficiário\n',encoding='utf-8')

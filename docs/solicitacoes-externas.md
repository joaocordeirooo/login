# Preparação da automação de documentos externos

## Regra de seleção confirmada

A referência inicial a “SIM” significa períodos cuja coluna Fator do cálculo contém 1,4. Aceitar as representações decimais equivalentes 1.4, 1.40, 1,4 e 1,40. Não procurar literalmente a palavra SIM no PDF. Não selecionar períodos com 1,00 nem inferir o fator pelo nome da empresa, duração ou quantidade de contribuições.

A seleção é por período: a mesma empresa pode ter mais de um vínculo ou intervalos com fatores diferentes. Preservar cada início/fim e a página de origem antes de agrupar solicitações por empresa.

## Cruzamento das fontes

- Cálculo: empresa, início, fim e fator na linha da tabela. Notas e projeções devem permanecer distintas dos dados do vínculo.
- CNIS: nome, código da empresa, início, fim quando informado e referência da página. Última remuneração não é data de demissão.
- CTPS: contrato, admissão, saída, CNPJ completo, função e alterações relevantes. Mudança de razão social pode explicar nomes diferentes entre as fontes.
- Se o CNIS apresentar apenas a raiz de oito dígitos, não completar automaticamente com uma matriz presumida. Procurar o estabelecimento na CTPS e solicitar revisão antes da consulta CNPJA.
- Se o cálculo indicar término posterior à emissão do CNIS e o vínculo estiver sem baixa nas demais fontes, manter a data como fim do período solicitado, sem afirmar que houve demissão.
- Funções podem mudar durante o vínculo. Conservar as anotações e suas datas para revisão, sem atribuir o último cargo a todo o período.

## Recorte e revisão

A CTPS de referência é digitalizada: a camada de texto contém somente marcas do documento, não os contratos. O modo IA envia os PDFs selecionados à Responses API para leitura visual, além da camada de texto. O prompt exige inspeção das páginas e diferencia carimbos da numeração real do PDF.

Uma página do PDF pode conter duas páginas físicas da carteira e contratos de empresas diferentes. O editor permite escolher página e região, girar a página, selecionar com o ponteiro ou coordenadas percentuais, ordenar os trechos e visualizar o PDF resultante. O arquivo final usa novas imagens com somente os pixels selecionados: nenhuma página ou objeto do PDF original é copiado, evitando conteúdo fora da região recuperável por alteração do CropBox.

Manter referências separadas para índice da página no PDF, número impresso da carteira e numeração do processo de origem. Considerar contrato e anotações de razão social/função pertinentes, não apenas a primeira ocorrência do nome da empresa.

## Estado da implementação

Implementado: tarefas organizadas, anexos, classificação de fontes, rascunhos persistidos, leitura local de cálculo/CNIS com texto, seleção da coluna Fator e cruzamento por nome normalizado e admissão. A revisão permite corrigir empresa, datas e CNPJ, excluir períodos com justificativa e concluir somente após conferência explícita. A extração original permanece separada das correções e guarda páginas, trechos e hashes das fontes; a última revisão registra autor, data e versão, mas ainda não há histórico de todas as revisões.

Vínculos ambíguos, raiz de CNPJ, CNPJ com dígitos inválidos, ausência de baixa e divergência de datas geram pendências. CPF divergente entre cadastro/CNIS ou CNIS de pessoas diferentes bloqueia a análise; CPF indisponível gera aviso para conferência. Não se corrige dígito de CNPJ pelo resultado matemático: conferir outra vez a fonte. A raiz não é completada automaticamente.

O leitor é específico para tabelas como as dos exemplos e sinaliza formatos desconhecidos. Não contém OCR nem adição manual de períodos que não foram extraídos. Anexar documentos corrigidos em uma nova solicitação permite uma nova análise sem apagar a revisão anterior. Arquivos do cliente não são incluídos nas fixtures de teste.

Implementado também: recorte manual com prévia, download e aprovação por vínculo. O original é preservado. Cada arquivo gerado registra a versão da análise, o período revisado, os hashes das fontes e as coordenadas/rotação de cada região. Aprovar exige revisão concluída e versão atual; a interface pede que todas as páginas sejam abertas e conferidas. Corrigir gera outro PDF sem sobrescrever o anterior. A seleção em edição não é salva até gerar o PDF.

Limites do recorte: 12 trechos, 100 páginas por arquivo de CTPS, fontes e saída limitadas a 25 MB, rasterização até 180 dpi e teto de 12 milhões de pixels por página. Não se acrescentam informações ao documento recortado. O editor usa a numeração do PDF, não a numeração impressa da carteira.

Implementado: análise com OpenAI, selecionável ao criar a solicitação ou ao abrir um rascunho. Extrai os períodos com fator 1,4 e sugere páginas inteiras/metades da CTPS com justificativa. O usuário seleciona as sugestões, visualiza e ajusta a área no editor existente. O backend valida as referências contra os documentos efetivamente selecionados e sua contagem de páginas, persiste o resultado e não aprova automaticamente os recortes. Configuração e limites em README.md. Cálculo/CNIS legíveis são enviados como texto integral por página; CTPS mantém leitura visual. A resposta deve conter os períodos identificados pela leitura local. O fluxo foi validado também em chamada real, mas as sugestões continuam sujeitas à conferência visual; testes automatizados usam respostas simuladas.

Pendente: consulta CNPJA e conexão/envio de mensagens. Nenhum desses passos é executado ao aprovar um recorte.

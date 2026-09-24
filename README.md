# Forentis — ambiente local

Sistema local de gestão jurídica com React, Express e PostgreSQL.

## Iniciar

Com PostgreSQL em execução, abra um terminal na pasta do projeto:

```powershell
npm run dev
```

Acesse http://localhost:5173. A API fica em http://localhost:3000.
O comando aplica as migrações pendentes e inicia os dois serviços. Use Ctrl+C para encerrar.
As portas 3000 e 5173 devem estar disponíveis. Se o sistema já estiver aberto, não inicie outra instância.

## Primeiro acesso

Se o banco não tiver usuários, a tela inicial permite criar o primeiro administrador.
Se já houver usuários, entre com o e-mail e a senha já cadastrados. As contas existentes são preservadas.

## Configuração em outra máquina

1. Instale Node.js (22.13 ou superior) e PostgreSQL.
2. Execute `npm --prefix backend ci` e `npm --prefix frontend ci`.
3. Crie um banco e configure `backend/.env` a partir de `backend/.env.example`.
4. Execute `npm run dev`.

## Fluxo de trabalho

- Cadastre o cliente com seus dados pessoais, contato e endereço.
- Abra um processo/caso pela ficha do cliente. O número judicial é opcional.
- Registre atendimentos, análises, recebimento e devolução de documentos no histórico.
- Anexe arquivos na aba Documentos e baixe-os quando necessário (até 10 MB por arquivo).
- Cadastre setores e seus fluxos na tela Tarefas e prazos. Crie e edite tarefas com setor, fluxo, usuário responsável, descrição, vencimento e prioridade.
- Pesquise e filtre a lista de tarefas por situação, setor e fluxo; conclua ou reabra as atividades.
- Anexe arquivos dentro da tarefa e prepare rascunhos de solicitações externas por e-mail ou WhatsApp, selecionando documentos dos casos do mesmo cliente.
- Abra “Solicitar PPPs”, selecione e classifique cálculo, CNIS e CTPS e clique em “Executar automação”. Os PDFs desses tipos são enviados à OpenAI; os arquivos de apoio não são enviados. Confira os períodos com fator 1,4 e as páginas sugeridas por vínculo. A automação consulta contatos por CNPJ e prepara recortes para revisão. Reabrir uma solicitação reutiliza a análise salva.
- Em “Recorte da CTPS por vínculo”, escolha a empresa, navegue pelas páginas e selecione regiões com o mouse ou pelos campos em porcentagem. Adicione e ordene os trechos, gere o PDF e confira todas as páginas antes de aprovar. É possível corrigir a seleção e gerar outra versão.
- Consulte os totais reais na visão geral.

## Verificação

`npm test` verifica a interpretação dos documentos e o fluxo da API usando PDFs sintéticos e registros temporários que são removidos ao final. Requer banco configurado, migrações aplicadas e porta 3098 livre.

`npm run build` compila a interface. A pasta frontend/dist é apenas a interface; a API e o banco continuam necessários.

## Escopo desta versão

Um escritório local compartilhado entre os usuários autenticados. As tarefas usam usuários ativos como responsáveis; o responsável do caso continua como campo livre. Não há ainda permissões distintas por função, notificações automáticas, integração com tribunais ou recuperação de senha por e-mail.

As solicitações externas incluem análise com IA dos PDFs, leitura local alternativa de cálculo/CNIS, revisão persistida e recorte visual da CTPS. A IA lê inclusive páginas digitalizadas e propõe a página inteira ou metade esquerda/direita por vínculo. Selecione as sugestões, visualize e ajuste a região no editor, depois gere o PDF para conferência. As sugestões não aprovam o recorte. A consulta CNPJA e os rascunhos de mensagem estão integrados; o envio de e-mail está disponível via SMTP, e a integração WhatsApp permanece pendente. Os arquivos disponíveis vêm dos casos do mesmo cliente.

### Conexão OpenAI

Configure `OPENAI_API_KEY` em `backend/.env` (ignorado pelo Git) e reinicie `npm run dev`. Nunca use uma variável `VITE_` para a chave. `OPENAI_MODEL` é opcional e usa `gpt-4.1` por padrão; o modelo deve aceitar PDFs/imagens e Structured Outputs na Responses API. A assinatura do ChatGPT não substitui a configuração da API. A interface informa quando falta configurar a conexão.

Uma chamada à Responses API envia CTPS e PDFs sem leitura local confiável em base64. Para cálculo/CNIS reconhecidos sem avisos e com texto em todas as páginas, envia o texto integral separado por página, evitando o custo adicional das imagens desses PDFs. Usa saída JSON estruturada, limite de 8.000 tokens de resposta e `store:false`. A lista de períodos identificados localmente acompanha a chamada; uma resposta que omita ou altere seus intervalos é rejeitada antes de salvar. Não há upload persistente via Files API, ferramentas de execução nem repetição automática de chamadas. `store:false` não equivale a uma garantia de retenção zero pelo provedor. Limites da aplicação: até 10 PDFs somando 25 MB e 60 páginas no total; pré-validação local de até 45 segundos e chamada remota de até 150 segundos. Até duas análises ficam ativas por processo do servidor. O resultado é reutilizado e chamadas simultâneas da mesma solicitação compartilham a execução. Reinício do processo ou falha de rede antes da persistência pode exigir uma nova chamada, com nova cobrança.

Erros 429 são classificados pelo código da OpenAI: velocidade/tokens, tamanho da análise, limite de gastos do projeto/organização e cota/saldo são situações distintas. Quando disponíveis, a interface informa limite, volume solicitado ou espera mínima. Ter créditos não elimina os limites de tokens. Mensagens brutas do provedor, chaves e identificadores de conta não são exibidos. Um arquivo ainda pode exceder o limite mesmo após a otimização; nesse caso, divida a solicitação ou confira os limites do modelo no projeto.

Resultados são validados quanto ao fator, identidade, estrutura, tipo/ID da fonte e existência da página antes de salvar. CNPJ incompleto ou inválido permanece pendente, sem inventar dígitos. Falhas, recusas e respostas incompletas não são salvas como análises válidas. Para trocar uma análise local já salva por IA, crie outra solicitação; revisões e recortes anteriores são preservados. Os testes automatizados usam respostas OpenAI simuladas, sem enviar dados reais ou consumir créditos.

Referências: [entrada de PDFs](https://developers.openai.com/api/docs/guides/file-inputs), [saída estruturada](https://developers.openai.com/api/docs/guides/structured-outputs).

A migração 003 preserva as tarefas existentes no setor Geral e fluxo Atividades gerais; os nomes antigos de responsáveis permanecem visíveis até selecionar um usuário na edição. Novas tarefas exigem setor, fluxo e usuário responsável. O caso da tarefa não pode ser alterado após sua criação, preservando o vínculo dos documentos com o cliente.

A migração 004 permite identificar cada documento da solicitação como Cálculo, CNIS, CTPS ou Apoio, incluindo múltiplos arquivos de cada tipo. Rascunhos incompletos são permitidos; documentos anteriores ficam como Apoio. Regra confirmada: a indicação SIM corresponde aos períodos com fator 1,4 (ou 1.40) na coluna Fator do cálculo; são esses períodos que entram na solicitação. O CNIS fornece o CNPJ do vínculo correspondente para consulta da empresa; a CTPS fornece as páginas do vínculo a recortar.

A migração 005 armazena a extração original e a última revisão separadamente, com páginas de origem, hash dos arquivos, versão e usuário revisor. A análise é reutilizada ao reabrir a solicitação. Para analisar outros arquivos, crie uma nova solicitação. O leitor exige pelo menos um cálculo e um CNIS, aceita até 10 arquivos desses tipos somando 25 MB, 60 páginas por arquivo e 120 no total. Até duas análises podem rodar simultaneamente, em workers com limite de 45 segundos. Raiz de CNPJ, vínculo ambíguo e datas divergentes geram pendências, sem completar dados por suposição. Revisões concorrentes são bloqueadas para evitar sobrescrita.

A migração 006 armazena os PDFs recortados, suas regiões de origem, hashes, autor e aprovação. Cada PDF se vincula a um período e à versão da análise: salvar uma nova revisão torna os recortes anteriores desatualizados para aprovação. Os arquivos originais permanecem intactos. O PDF novo contém imagens somente das áreas escolhidas, sem texto oculto, anexos ou objetos do PDF original. Limites: 12 trechos por PDF, CTPS de até 100 páginas, fontes somando 25 MB e saída de até 25 MB. A renderização é local em worker com prazo de 45 segundos; prévias repetidas usam cache limitado em memória. A seleção em edição só é persistida ao gerar o PDF.

Os anexos e recortes ficam no PostgreSQL. O backup do banco deve incluir todas as tabelas, inclusive documentos e solicitacao_recortes. A sessão dura oito horas; os serviços estão configurados para acesso apenas pela própria máquina. Não há exclusão de clientes ou casos pela interface: use a situação Arquivado para encerrar uma pasta mantendo o histórico.

O tipo de processo é informado livremente no formulário. Ainda não há catálogo administrável de tipos e formulários específicos por especialidade.

## Organização do código

O backend segue o padrão existente `routes → controllers → model`:

- `backend/src/routes/`: caminhos HTTP e associação com os controllers. `index.js` reúne as rotas públicas e aplica autenticação antes dos módulos internos.
- `backend/src/controllers/`: validação das entradas, coordenação das operações e respostas HTTP. Cada módulo tem seu controller (usuário, cliente, processo, movimentação, tarefa e documento).
- `backend/src/model/`: consultas SQL e transações. O diretório mantém o nome singular usado originalmente no projeto.
- `backend/src/services/`: leitura local de PDFs em worker, interpretação das tabelas, cruzamento de vínculos e validação da revisão. A biblioteca de leitura é [PDF.js](https://mozilla.github.io/pdf.js/examples/).
- `backend/src/middlewares/`: autenticação e tratamento centralizado de erros.
- `backend/src/utils/validacao.js`: validações compartilhadas.
- `backend/src/config/`: conexão PostgreSQL e configuração JWT.

No frontend, `App.jsx` contém somente a navegação. As telas ficam em `pages/`; formulários e partes reutilizáveis ficam em `components/`, agrupados por módulo. O login usa `components/Login/LoginForm.jsx`, e o layout usa `components/Layout/AppLayout.jsx` e `AppSidebar.jsx`. O hook `hooks/useLoad.js` cuida do carregamento, e `lib/api.js` centraliza a comunicação HTTP.

Ao adicionar um módulo, crie seu model e controller, exponha as rotas e registre-as em `routes/index.js`. Mantenha SQL nos models e reutilize os componentes e hooks nas páginas.

### Contatos e revisão das mensagens

A migração 007 adiciona o cache de contatos públicos e os rascunhos por vínculo. O CNPJA é consultado pelo servidor, com CNPJ completo e válido, cache de sete dias e limite compartilhado de cinco consultas por minuto. A resposta conserva somente razão social, e-mails, telefones e situação. Ausência de contato permanece pendente; nenhum endereço é inventado. Referência: https://cnpja.com/api/open.

A automação prepara recortes das sugestões da IA sem aprová-los. Confira os períodos e CNPJs, revise os trechos da CTPS e aprove o PDF. Na mensagem, edite destinatário, função, assunto e texto; somente documentos de apoio selecionados e recortes aprovados da versão atual podem ser associados ao rascunho. Revisões concorrentes e recortes desatualizados são rejeitados. Salvar rascunho não envia e-mail nem WhatsApp.

### Dados enviados à interface

Todos os usuários autenticados do escritório podem consultar os clientes. A listagem é paginada, pesquisa no servidor e recebe CPF mascarado; os seletores recebem apenas identificação e nome. Detalhes pessoais são carregados quando a ficha é aberta. O painel recebe totais e listas limitadas. Respostas da API usam `Cache-Control: no-store`; erros internos não expõem consultas SQL ou dados brutos dos provedores.

Dados necessários para exibir uma tela continuam visíveis na aba Network do navegador do usuário autorizado. A proteção consiste em autenticação e redução dos campos enviados, não em ocultar o DevTools. Chaves da OpenAI e consultas CNPJA ficam no servidor.

### Envio de e-mail por SMTP

Configure em `backend/.env`, uma variável por linha, e reinicie o backend:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apliqtecnologia@gmail.com
SMTP_PASS=senha-de-app-do-google
SMTP_FROM="Apliq Tecnologia <apliqtecnologia@gmail.com>"
```

No Gmail, ative a verificação em duas etapas e gere uma senha de app; não use a senha comum da conta. Documentação: https://nodemailer.com/guides/using-gmail . A porta 587 exige STARTTLS; a alternativa é 465 com SMTP_SECURE=true. A validação do certificado permanece ativa. Nunca coloque essas variáveis no frontend ou use prefixo VITE_.

Na mensagem, clique em **Testar conexão SMTP** para autenticar sem enviar e-mail. Conclua a revisão dos períodos, aprove os recortes que deseja anexar e preencha o destinatário, assunto e texto. **Revisar envio de e-mail** salva o rascunho e apresenta destinatário e anexos; somente **Confirmar e enviar agora** transmite a mensagem. A função informada no cadastro não é acrescentada automaticamente ao texto: inclua-a na mensagem se necessário.

A migração 008 registra o conteúdo enviado, referência dos anexos, autor e estado. Há limite de 18 MB nos anexos originais para acomodar a codificação do e-mail. O backend verifica novamente o vínculo dos anexos, aprovação e versão do recorte. Uma revisão já enviada não é transmitida novamente; para um novo envio deliberado, edite e revise a mensagem. Não há repetição automática após falhas. Se o SMTP não confirmar o resultado, o estado permanece incerto (ou em andamento após interrupção do servidor) e bloqueia novo envio do vínculo: confira a pasta Enviados antes de conciliar o registro. A aceitação pelo SMTP não confirma entrega nem leitura pelo destinatário.

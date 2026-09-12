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

1. Instale Node.js (22 ou superior) e PostgreSQL.
2. Execute `npm --prefix backend ci` e `npm --prefix frontend ci`.
3. Crie um banco e configure `backend/.env` a partir de `backend/.env.example`.
4. Execute `npm run dev`.

## Fluxo de trabalho

- Cadastre o cliente com seus dados pessoais, contato e endereço.
- Abra um processo/caso pela ficha do cliente. O número judicial é opcional.
- Registre atendimentos, análises, recebimento e devolução de documentos no histórico.
- Anexe arquivos na aba Documentos e baixe-os quando necessário (até 10 MB por arquivo).
- Crie tarefas com vencimento, prioridade e responsável; conclua ou reabra as atividades.
- Consulte os totais reais na visão geral.

## Verificação

`npm test` verifica o fluxo da API usando registros temporários que são removidos ao final. Requer banco configurado, migrações aplicadas e porta 3098 livre.

`npm run build` compila a interface. A pasta frontend/dist é apenas a interface; a API e o banco continuam necessários.

## Escopo desta versão

Um escritório local compartilhado entre os usuários autenticados. Os nomes de responsáveis são campos livres; não há ainda permissões distintas por função, notificações automáticas, integração com tribunais ou recuperação de senha por e-mail.

Os anexos ficam no PostgreSQL. O backup do banco deve incluir todas as tabelas, inclusive documentos. A sessão dura oito horas; os serviços estão configurados para acesso apenas pela própria máquina. Não há exclusão de clientes ou casos pela interface: use a situação Arquivado para encerrar uma pasta mantendo o histórico.

O tipo de processo é informado livremente no formulário. Ainda não há catálogo administrável de tipos e formulários específicos por especialidade.

## Organização do código

O backend segue o padrão existente `routes → controllers → model`:

- `backend/src/routes/`: caminhos HTTP e associação com os controllers. `index.js` reúne as rotas públicas e aplica autenticação antes dos módulos internos.
- `backend/src/controllers/`: validação das entradas, coordenação das operações e respostas HTTP. Cada módulo tem seu controller (usuário, cliente, processo, movimentação, tarefa e documento).
- `backend/src/model/`: consultas SQL e transações. O diretório mantém o nome singular usado originalmente no projeto.
- `backend/src/middlewares/`: autenticação e tratamento centralizado de erros.
- `backend/src/utils/validacao.js`: validações compartilhadas.
- `backend/src/config/`: conexão PostgreSQL e configuração JWT.

No frontend, `App.jsx` contém somente a navegação. As telas ficam em `pages/`; formulários e partes reutilizáveis ficam em `components/`, agrupados por módulo. O login usa `components/Login/LoginForm.jsx`, e o layout usa `components/Layout/AppLayout.jsx` e `AppSidebar.jsx`. O hook `hooks/useLoad.js` cuida do carregamento, e `lib/api.js` centraliza a comunicação HTTP.

Ao adicionar um módulo, crie seu model e controller, exponha as rotas e registre-as em `routes/index.js`. Mantenha SQL nos models e reutilize os componentes e hooks nas páginas.

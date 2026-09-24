# Frontend e backend em serviços separados

Use o mesmo repositório `joaocordeirooo/login`, branch `main`, nos dois serviços.

| Configuração | backend existente | novo serviço frontend |
|---|---|---|
| Caminho de Build | `/backend` | `/frontend` |
| Construção | Dockerfile | Dockerfile |
| Arquivo | `dockerfile` (minúsculo) | `Dockerfile` (D maiúsculo) |
| Porta de destino HTTP | 3000 | 80 |
| Domínio público HTTPS | api.apliqtecnologia.tech | domínio automático do novo serviço, ou outro subdomínio |

Salve Fonte e Construção. Deixe o comando de inicialização personalizado vazio. Implante primeiro o backend, depois o frontend. O backend aplica as migrações pendentes antes de iniciar; faça backup antes da atualização.

No backend, mantenha DATABASE_URL, JWT_SECRET, OPENAI_API_KEY/OPENAI_MODEL e SMTP_*. Use NODE_ENV=production, HOST=0.0.0.0, PORT=3000 e SERVE_FRONTEND=false. FRONTEND_URL pode ser atualizado para a URL pública escolhida para a interface.

Não copie segredos para o serviço frontend. Ele não precisa de variáveis de ambiente. O Nginx encaminha `/api/` pelo HTTPS para api.apliqtecnologia.tech, conservando o caminho. Isso permite usar o domínio automático sem mudar o build e mantém as chamadas do navegador na mesma origem. Mantenha o domínio da API associado somente ao backend. O timeout do proxy comporta a análise de documentos.

Teste https://api.apliqtecnologia.tech/api/status e depois abra o domínio do frontend. A raiz do domínio da API não é mais a tela de login; essa tela pertence ao frontend. O Dockerfile da raiz continua disponível para a opção de serviço único, com SERVE_FRONTEND=true.

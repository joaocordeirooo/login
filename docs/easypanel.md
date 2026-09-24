# Publicar o FORENTIS no EasyPanel

## Origem e compilação

- Repositório: `joaocordeirooo/login`, branch `main`.
- Build Path/contexto: raiz do repositório (`/`), não a pasta backend.
- Builder: Dockerfile. Caminho: `Dockerfile`.
- Use o comando padrão da imagem. Ele aplica as migrações pendentes e inicia a aplicação.
- Domínio: `api.apliqtecnologia.tech`, caminho `/`, HTTPS habilitado.
- Destino interno: HTTP, porta `3000`. A interface está em `/` e a API em `/api`.
- Aponte o DNS do subdomínio para a VPS. Não publique diretamente a porta do PostgreSQL.

## Variáveis do serviço App

```dotenv
DATABASE_URL=COLE_A_URL_INTERNA_DO_POSTGRES_JA_CONFIGURADA
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
FRONTEND_URL=https://api.apliqtecnologia.tech
JWT_SECRET=COLE_UM_SEGREDO_ALEATORIO_GERADO_ABAIXO
OPENAI_API_KEY=COLE_SUA_CHAVE
OPENAI_MODEL=gpt-4.1
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apliqtecnologia@gmail.com
SMTP_PASS=COLE_A_SENHA_DE_APP_DO_GOOGLE
SMTP_FROM="Apliq Tecnologia <apliqtecnologia@gmail.com>"
```

Substitua os marcadores antes de salvar. Uma variável por linha, sem links Markdown. Use as variáveis em tempo de execução; não declare segredos como argumentos no Dockerfile. Não configure VITE_API_URL: a interface usa `/api` no mesmo domínio. DATABASE_URL tem prioridade sobre as variáveis DB_* locais. Use a URL interna fornecida pelo serviço PostgreSQL do EasyPanel, não localhost dentro do container.

Gere JWT_SECRET no seu terminal e cole o resultado somente no painel:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Mantenha esse valor entre deploys: mudá-lo invalida sessões existentes. `JWT_SECRET` e `DATABASE_URL` são necessários para iniciar e usar o sistema; OpenAI e SMTP habilitam as integrações correspondentes.

Antes do primeiro deploy, faça backup do banco existente. O deploy aplica migrações; ele não transfere os dados do banco do computador para a VPS. Para levar esses dados, é necessário backup/restauração separados. Não abra o cadastro do primeiro administrador publicamente com banco vazio: use acesso restrito no proxy durante a configuração inicial.

Depois de salvar, selecione Deploy. Confira a saída de compilação e os logs do serviço. `/api/status` deve retornar `{"online":true}`; confira também login e listagem de clientes para validar o banco. Teste SMTP pelo botão da mensagem, sem transmitir documentos até revisar destinatário e anexos.

## Atualizações pelo terminal

Na raiz do projeto:

```powershell
git status
git add backend frontend scripts docs package.json README.md Dockerfile .dockerignore .gitignore
git diff --cached --stat
git commit -m "Atualiza FORENTIS"
git push origin main
```

Revise os arquivos antes do commit. `.env`, dependências, builds e novos arquivos de `tmp` são ignorados. Arquivos temporários já rastreados pelo Git continuam no histórico e não são removidos automaticamente. Se o push for rejeitado por alterações remotas, não use force: integre as mudanças primeiro. Se Auto Deploy estiver ativo, o push pode iniciar o deploy; caso contrário, clique em Deploy no EasyPanel.

Referências: https://easypanel.io/docs/services/app e https://easypanel.io/docs/builders.

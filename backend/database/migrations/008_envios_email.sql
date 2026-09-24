CREATE TABLE solicitacao_envios (
  id BIGSERIAL PRIMARY KEY,
  solicitacao_id BIGINT NOT NULL REFERENCES solicitacoes_externas(id) ON DELETE CASCADE,
  periodo_id TEXT NOT NULL,
  revisao INTEGER NOT NULL,
  versao_analise INTEGER NOT NULL,
  message_id TEXT NOT NULL UNIQUE,
  estado TEXT NOT NULL CHECK (estado IN ('enviando','enviado','falhou','incerto')),
  remetente TEXT NOT NULL,
  destinatario TEXT NOT NULL,
  assunto TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  anexos JSONB NOT NULL,
  autor_id BIGINT NOT NULL REFERENCES usuarios(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(solicitacao_id,periodo_id,revisao)
);

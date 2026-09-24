CREATE TABLE solicitacao_analises (
  solicitacao_id BIGINT PRIMARY KEY REFERENCES solicitacoes_externas(id) ON DELETE CASCADE,
  resultado JSONB NOT NULL,
  revisao JSONB,
  versao INTEGER NOT NULL DEFAULT 1,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revisado_em TIMESTAMPTZ,
  revisor_id BIGINT REFERENCES usuarios(id)
);

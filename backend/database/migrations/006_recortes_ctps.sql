CREATE TABLE solicitacao_recortes (
  id BIGSERIAL PRIMARY KEY,
  solicitacao_id BIGINT NOT NULL REFERENCES solicitacoes_externas(id) ON DELETE CASCADE,
  periodo_id TEXT NOT NULL,
  versao_analise INTEGER NOT NULL,
  periodo JSONB NOT NULL,
  trechos JSONB NOT NULL,
  fontes JSONB NOT NULL,
  nome TEXT NOT NULL,
  paginas INTEGER NOT NULL,
  conteudo BYTEA NOT NULL,
  autor_id BIGINT NOT NULL REFERENCES usuarios(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  aprovado_em TIMESTAMPTZ,
  aprovador_id BIGINT REFERENCES usuarios(id)
);
CREATE INDEX solicitacao_recortes_solicitacao_idx ON solicitacao_recortes(solicitacao_id);

CREATE TABLE empresa_contatos (
  cnpj CHAR(14) PRIMARY KEY,
  razao_social TEXT NOT NULL,
  emails JSONB NOT NULL DEFAULT '[]',
  telefones JSONB NOT NULL DEFAULT '[]',
  situacao TEXT NOT NULL DEFAULT '',
  consultado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE cnpja_consultas (id BIGSERIAL PRIMARY KEY, criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX ON cnpja_consultas(criado_em);
CREATE TABLE solicitacao_mensagens (
  solicitacao_id BIGINT NOT NULL REFERENCES solicitacoes_externas(id) ON DELETE CASCADE,
  periodo_id TEXT NOT NULL,
  versao_analise INTEGER NOT NULL,
  destinatario TEXT NOT NULL DEFAULT '',
  assunto TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  funcao TEXT NOT NULL DEFAULT '',
  anexos JSONB NOT NULL DEFAULT '[]',
  recorte_id BIGINT REFERENCES solicitacao_recortes(id),
  revisao INTEGER NOT NULL DEFAULT 1,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  autor_id BIGINT NOT NULL REFERENCES usuarios(id),
  PRIMARY KEY(solicitacao_id,periodo_id)
);

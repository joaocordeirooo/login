ALTER TABLE solicitacao_documentos ADD COLUMN tipo TEXT NOT NULL DEFAULT 'Apoio'
  CHECK (tipo IN ('Calculo','CNIS','CTPS','Apoio'));

export default function tratarErro(erro, req, res, next) {
  if (res.headersSent) return next(erro);
  const status = erro.status || (erro.code === '23505' ? 409 : erro.code === '23503' ? 404 : 500);
  if (status === 500) console.error('Erro interno na API', {code:/^[A-Z0-9_]{1,30}$/.test(erro.code || '') ? erro.code : 'INTERNAL'});
  res.status(status).json({
    error: erro.code === '23505' ? 'Já existe um cadastro com este CPF ou e-mail.' : status === 500 ? 'Não foi possível concluir a operação.' : erro.message,
  });
}

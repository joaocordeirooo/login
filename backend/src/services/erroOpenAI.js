// Never expose the provider's raw message: it can contain account IDs or input text.
export function erroOpenAI(response,body) {
  const code=body?.error?.code;
  const billing={
    credit_balance_exhausted:'A OpenAI informou saldo esgotado na organização vinculada a esta chave. Confira se os créditos pertencem à mesma organização.',
    project_spend_limit_exceeded:'O projeto desta chave atingiu o limite de gastos configurado, mesmo que a conta tenha créditos. Confira os limites do projeto na OpenAI.',
    organization_spend_limit_exceeded:'A organização desta chave atingiu o limite de gastos configurado, mesmo que tenha créditos. Confira os limites da organização na OpenAI.',
    organization_usage_limit_exceeded:'A organização atingiu o limite de uso aprovado pela OpenAI. Confira os limites da organização.',
    insufficient_quota:'A OpenAI informou cota indisponível para esta chave. Confira o projeto, a organização e seus limites de uso e faturamento; este código sozinho não confirma falta de saldo.'
  };
  if (Object.hasOwn(billing,code)) return {status:429,message:billing[code]+' Código: '+code+'.'};
  if (response.status===429) {
    const raw=typeof body?.error?.message==='string' ? body.error.message : '';
    const limit=Number(raw.match(/\bLimit[:\s]+(\d+)/i)?.[1]);
    const requested=Number(raw.match(/\bRequested[:\s]+(\d+)/i)?.[1]);
    const tokens=/tokens|\bTPM\b/i.test(raw);
    if (tokens && limit>0 && requested>limit) return {status:429,message:`Esta análise excede o limite de tokens da OpenAI: ${requested} solicitados para um limite de ${limit}. Ter créditos não aumenta esse limite. Reduza os arquivos por análise ou ajuste o limite do modelo no projeto. Código: rate_limit_exceeded.`,limit,requested,tooLarge:true};
    const retry=Number(response.headers?.get('retry-after'));
    const wait=Number.isFinite(retry) && retry>0 && retry<=86400 ? ` Aguarde pelo menos ${Math.ceil(retry)} segundos antes de tentar novamente.` : ' Aguarde a renovação do limite antes de tentar novamente.';
    if (code==='rate_limit_exceeded' || code==='slow_down' || body?.error?.type==='rate_limit_error') return {status:429,message:'A OpenAI limitou temporariamente a velocidade de uso (requisições ou tokens), independentemente do saldo.'+wait};
    return {status:429,message:'A OpenAI retornou 429 sem identificar a causa. Não é possível concluir que faltam créditos. Confira os limites do projeto e tente novamente mais tarde.'};
  }
  if ([401,403].includes(response.status)) return {status:503,message:'A conexão OpenAI não foi autorizada. Confira a chave e o acesso ao modelo no servidor.'};
  return {status:502,message:'A OpenAI não conseguiu analisar os PDFs. Confira os arquivos e o modelo configurado no servidor.'};
}

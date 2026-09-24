if (!process.env.JWT_SECRET) throw new Error('Configure JWT_SECRET nas variáveis de ambiente do serviço (EasyPanel) ou no backend/.env local.');
export default {
  secret: process.env.JWT_SECRET,
  expiresIn: '8h'
};

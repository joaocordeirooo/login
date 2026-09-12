if (!process.env.JWT_SECRET) throw new Error('Configure JWT_SECRET no backend/.env');
export default {
  secret: process.env.JWT_SECRET,
  expiresIn: '8h'
};

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import tratarErro from './middlewares/tratarErro.js';

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '15mb' }));
app.use('/api', routes);
app.use(tratarErro);
app.listen(process.env.PORT || 3000, '127.0.0.1', () => {
  console.log('Forentis API: http://localhost:' + (process.env.PORT || 3000));
});

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import tratarErro from './middlewares/tratarErro.js';
import {fileURLToPath} from 'node:url';

const app = express();
app.disable('x-powered-by');
app.use((req,res,next)=>{res.set('Cache-Control','no-store');res.set('X-Content-Type-Options','nosniff');next();});
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '15mb' }));
app.use('/api', routes);
if(process.env.NODE_ENV==='production'){
  const publicDir=fileURLToPath(new URL('../../frontend/dist/',import.meta.url));
  app.use(express.static(publicDir));
  app.get('/{*path}',(req,res,next)=>{
    if(req.path.startsWith('/api/'))return next();
    res.sendFile('index.html',{root:publicDir});
  });
}
app.use(tratarErro);
app.listen(process.env.PORT || 3000, process.env.HOST || (process.env.NODE_ENV==='production'?'0.0.0.0':'127.0.0.1'), () => {
  console.log('Forentis API: http://localhost:' + (process.env.PORT || 3000));
});

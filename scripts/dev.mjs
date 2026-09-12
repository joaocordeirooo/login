import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
const root = fileURLToPath(new URL('../', import.meta.url));
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
function run(args, folder) {
  const child = spawn(process.execPath, args, {
    cwd: root + folder,
    stdio: 'inherit',
    windowsHide: true
  });
  children.push(child);
  child.on('error', error => {
    console.error(error.message);
    stop(1);
  });
  return child;
}
async function available(port) {
  return new Promise(resolve => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.listen(port, '127.0.0.1', () => server.close(() => resolve(true)));
  });
}
if (!(await available(3000)) || !(await available(5173))) {
  console.error('Uma das portas (3000 ou 5173) já está em uso. Se o Forentis já estiver rodando, acesse http://localhost:5173. Caso contrário, encerre o serviço conflitante e tente novamente.');
  process.exitCode = 1;
} else {
  const migration = run(['database/migrate.js'], 'backend');
  migration.on('exit', code => {
    if (code !== 0) {
      stop(code || 1);
      return;
    }
    for (const child of [run(['src/server.js'], 'backend'), run(['node_modules/vite/bin/vite.js'], 'frontend')]) {
      child.on('exit', code => {
        if (!stopping) stop(code || 1);
      });
    }
    console.log('\nAbra http://localhost:5173 — Ctrl+C encerra o Forentis.\n');
  });
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
process.on('exit', () => stop());

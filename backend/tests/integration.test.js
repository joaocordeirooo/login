import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
dotenv.config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
  quiet: true
});
const {
  default: pool
} = await import('../src/config/database.js');
const base = 'http://127.0.0.1:3098/api';
let token, userId, clientId, caseId, server;
async function request(path, body, method, auth = true) {
  const r = await fetch(base + path, {
    method: method || (body ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      ...(auth && token ? {
        Authorization: 'Bearer ' + token
      } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await r.json();
  return {
    status: r.status,
    data
  };
}
test('Fluxo integrado: autenticação, cliente, caso, histórico, documento e tarefa', async () => {
  try {
    server = spawn(process.execPath, ['src/server.js'], {
      cwd: fileURLToPath(new URL('../', import.meta.url)),
      env: {
        ...process.env,
        PORT: '3098'
      },
      stdio: 'pipe',
      windowsHide: true
    });
    for (let i = 0; i < 50; i++) {
      try {
        await fetch(base + '/status');
        break;
      } catch {
        await delay(100);
      }
    }
    assert.equal((await request('/clientes', undefined, undefined, false)).status, 401);
    for (const path of ['/processos', '/tarefas', '/documentos/1', '/me']) {
      assert.equal((await request(path, undefined, undefined, false)).status, 401);
    }
    const email = 'integration-' + Date.now() + '@forentis.test',
      senha = 'Teste-local-9382!';
    userId = (await pool.query("INSERT INTO usuarios(nome,email,senha_hash,perfil) VALUES('Teste automatizado',$1,$2,'usuario') RETURNING id", [email, await bcrypt.hash(senha, 12)])).rows[0].id;
    assert.equal((await request('/usuarios/login', {
      email,
      senha: 'errada'
    })).status, 401);
    const login = await request('/usuarios/login', {
      email,
      senha
    });
    assert.equal(login.status, 200);
    token = login.data.token;
    assert.equal((await request('/me')).data.id, userId);
    assert.equal((await request('/setup', {
      nome: 'Outro',
      email: 'outro@test.local',
      senha
    })).status, 403);
    assert.equal((await request('/clientes', {
      nome: ''
    })).status, 400);
    const client = await request('/clientes', {
      nome: 'Cliente teste de integração',
      cpf: '',
      dados: {
        telefone: '49999991111',
        logradouro: 'Rua de teste'
      }
    });
    assert.equal(client.status, 201);
    clientId = client.data.id;
    assert.equal((await request('/clientes/' + clientId, {
      nome: 'Cliente atualizado',
      dados: {
        cidade: 'Fraiburgo'
      }
    }, 'PUT')).status, 200);
    const c = await request('/processos', {
      cliente_id: clientId,
      titulo: 'Aposentadoria',
      tipo: 'Previdenciário',
      natureza: 'Administrativo',
      status: 'Em análise'
    });
    assert.equal(c.status, 201);
    caseId = c.data.id;
    const atualizado = await request('/processos/' + caseId, {
      ...c.data,
      status: 'Em andamento',
      responsavel: 'Responsável de teste',
    }, 'PUT');
    assert.equal(atualizado.status, 200);
    assert.equal(atualizado.data.status, 'Em andamento');
    assert.equal((await request('/processos/' + caseId + '/movimentacoes', {
      tipo: 'Documento recebido',
      descricao: 'Recebida carteira de trabalho.'
    })).status, 201);
    const doc = await request('/processos/' + caseId + '/documentos', {
      nome: 'teste.txt',
      mime: 'text/plain',
      conteudo: Buffer.from('Documento de teste').toString('base64')
    });
    assert.equal(doc.status, 201);
    const downloaded = await fetch(base + '/documentos/' + doc.data.id, {
      headers: {
        Authorization: 'Bearer ' + token
      }
    });
    assert.equal(await downloaded.text(), 'Documento de teste');
    assert.equal((await request('/tarefas', {
      processo_id: caseId,
      titulo: 'Inválida',
      vencimento: '2026-02-31',
      prioridade: 'Normal'
    })).status, 400);
    const task = await request('/tarefas', {
      processo_id: caseId,
      titulo: 'Analisar documentos',
      vencimento: '2026-09-15',
      prioridade: 'Alta'
    });
    assert.equal(task.status, 201);
    assert.equal((await request('/tarefas/' + task.data.id, {
      concluida: true
    }, 'PATCH')).data.concluida, true);
    assert.equal((await request('/tarefas/' + task.data.id, {
      concluida: false
    }, 'PATCH')).data.concluida, false);
    const detail = (await request('/processos/' + caseId)).data;
    assert.equal(detail.movimentacoes.length, 1);
    assert.equal(detail.movimentacoes[0].autor, 'Teste automatizado');
    assert.equal(detail.documentos.length, 1);
    assert.equal((await request('/clientes/' + clientId)).data.dados.cidade, 'Fraiburgo');
    for (const [path, expectedId] of [['/clientes', clientId], ['/processos', caseId], ['/tarefas', task.data.id]]) {
      const lista = await request(path);
      assert.equal(lista.status, 200);
      assert.ok(Array.isArray(lista.data));
      assert.ok(lista.data.some(item => item.id === expectedId));
    }
    assert.equal((await request('/processos/999999999')).status, 404);
  } finally {
    if (server) {
      server.kill();
      await delay(150);
    }
    if (caseId) {
      for (const table of ['documentos', 'tarefas', 'movimentacoes']) await pool.query(`DELETE FROM ${table} WHERE processo_id=$1`, [caseId]);
      await pool.query('DELETE FROM processos WHERE id=$1', [caseId]);
    }
    if (clientId) await pool.query('DELETE FROM clientes WHERE id=$1', [clientId]);
    if (userId) await pool.query('DELETE FROM usuarios WHERE id=$1', [userId]);
    await pool.end();
  }
});

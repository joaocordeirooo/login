import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { api, save } from "@/lib/api";
import useLoad from '@/hooks/useLoad.js';
import ErrorBox from '@/components/common/ErrorBox.jsx';
import Loading from '@/components/common/Loading.jsx';
import Heading from '@/components/common/Heading.jsx';
import Field from '@/components/common/Field.jsx';
import Badge from '@/components/common/Badge.jsx';
import CaseForm from '@/components/Processos/CaseForm.jsx';
import Tasks from '@/components/Tarefas/Tasks.jsx';
import date from '@/lib/date.js';
function CaseDetail() {
  const {
      id
    } = useParams(),
    state = useLoad('/processos/' + id),
    [editing, setEditing] = useState(false),
    [tab, setTab] = useState('Histórico'),
    [tipo, setTipo] = useState('Anotação'),
    [descricao, setDescricao] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function movement(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await save('/processos/' + id + '/movimentacoes', {
        tipo,
        descricao
      });
      setDescricao('');
      await state.reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024 || !file.size) {
      setError('Escolha um arquivo de até 10 MB, não vazio.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const conteudo = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result.split(',')[1]);
        r.onerror = () => reject(new Error('Falha ao ler arquivo.'));
        r.readAsDataURL(file);
      });
      await save('/processos/' + id + '/documentos', {
        nome: file.name,
        mime: file.type || 'application/octet-stream',
        conteudo
      });
      await state.reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function download(d) {
    try {
      const blob = await api('/documentos/' + d.id, {
        download: true
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = d.nome;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e.message);
    }
  }
  const p = state.data;
  return <Loading state={state}>{p && <><Link className="back" to={'/clientes/' + p.cliente_id}><ArrowLeft size={16} />{p.cliente}</Link><Heading title={p.titulo} subtitle={p.tipo + ' · ' + p.natureza}><button className="secondary" onClick={() => setEditing(!editing)}>{editing ? 'Voltar ao caso' : 'Editar caso'}</button></Heading>{editing ? <CaseForm initial={p} onCancel={() => setEditing(false)} onSaved={() => {
        setEditing(false);
        state.reload();
      }} /> : <><div className="card"><div className="section-title"><h2>Resumo da pasta</h2><Badge>{p.status}</Badge></div><div className="details"><div><small>Cliente</small><p><Link to={'/clientes/' + p.cliente_id}>{p.cliente}</Link></p></div><div><small>Número / protocolo</small><p>{p.numero || 'Ainda não informado'}</p></div><div><small>Responsável</small><p>{p.responsavel || 'Não definido'}</p></div></div><p className="note">{p.descricao || 'Adicione o resumo do caso em “Editar caso”.'}</p></div><div className="tabs">{['Histórico', 'Documentos', 'Tarefas'].map(t => <button key={t} className={tab === t ? 'selected' : 'secondary'} onClick={() => {
            setTab(t);
            setError('');
          }}>{t}</button>)}</div><ErrorBox>{error}</ErrorBox>{tab === 'Histórico' && <><form className="card" onSubmit={movement}><h2>Registrar movimentação</h2><Field label="Tipo de registro" options={['Anotação', 'Atendimento', 'Análise', 'Documento recebido', 'Documento devolvido', 'Andamento']} value={tipo} onChange={e => setTipo(e.target.value)} /><Field label="O que aconteceu neste caso?" type="textarea" value={descricao} onChange={e => setDescricao(e.target.value)} /><button disabled={busy || !descricao.trim()}>{busy ? 'Registrando…' : 'Registrar movimentação'}</button></form><div className="card"><h2>Histórico da pasta</h2>{p.movimentacoes.length ? p.movimentacoes.map(m => <article className="timeline" key={m.id}><Badge>{m.tipo}</Badge><p className="note">{m.descricao}</p><small>{m.autor} · {new Date(m.criado_em).toLocaleString('pt-BR')}</small></article>) : <p className="empty">O histórico começa com o primeiro registro.</p>}</div></>}{tab === 'Documentos' && <div className="card"><h2>Documentos do caso</h2><p className="muted">Anexe os arquivos da pasta. Até 10 MB por arquivo.</p><label className="upload">{busy ? 'Enviando…' : 'Selecionar arquivo'}<input type="file" disabled={busy} onChange={upload} /></label>{p.documentos.map(d => <div className="list-row" key={d.id}><div><strong><FileText size={16} />{d.nome}</strong><p className="muted">{Math.ceil(d.tamanho / 1024)} KB · {date(d.criado_em)}</p></div><button className="secondary" onClick={() => download(d)}>Baixar</button></div>)}{!p.documentos.length && <p className="empty">Nenhum documento anexado.</p>}</div>}{tab === 'Tarefas' && <Tasks processId={id} />}</>}</>}</Loading>;
}
export default CaseDetail;

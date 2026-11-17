const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LOCAL_KEY = 'hubPrompts.v1'; // prompts antigos, salvos só no navegador

// ---------- banco de dados (Supabase) ----------
const db = () => Auth.client.from('prompts');
const fromRow = r => ({
  id: r.id, title: r.title || '', cat: r.cat || '', tags: r.tags || [], body: r.body,
  fav: !!r.fav, uses: r.uses || 0, created: Date.parse(r.created_at), updated: Date.parse(r.updated_at)
});
const toRow = p => {
  const r = {};
  for (const k of ['title', 'cat', 'tags', 'body', 'fav', 'uses']) if (k in p) r[k] = p[k];
  if ('created' in p) r.created_at = new Date(p.created).toISOString();
  if ('updated' in p) r.updated_at = new Date(p.updated).toISOString();
  return r;
};
const ok = ({ data, error }) => { if (error) throw new Error(Auth.traduz(error)); return data; };

const Store = {
  async all()            { return ok(await db().select('*').order('updated_at', { ascending: false })).map(fromRow); },
  async add(p)           { return fromRow(ok(await db().insert(toRow(p)).select().single())); },
  async addMany(list)    { return ok(await db().insert(list.map(toRow)).select()).map(fromRow); },
  async update(id, f)    { return fromRow(ok(await db().update(toRow(f)).eq('id', id).select().single())); },
  async remove(id)       { ok(await db().delete().eq('id', id)); }
};

let data = [];
let filtro = 'Todos';
let editId = null, viewId = null, varsId = null;

function vars(body){ return [...new Set([...body.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map(m=>m[1]))]; }
function toast(msg='Copiado!', bad=false){ const t=$('#toast'); t.textContent=msg; t.classList.toggle('bad', bad); t.classList.add('show'); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('show'), bad?3500:1600); }
const falhou = e => { console.error(e); toast('Erro: ' + e.message, true); };

// Atualiza a tela na hora e salva no banco; se o banco falhar, avisa e recarrega.
async function salvarCampos(id, campos) {
  const p = data.find(x => x.id === id); if (!p) return;
  Object.assign(p, campos); render();
  try { Object.assign(p, await Store.update(id, campos)); }
  catch (e) { falhou(e); await recarregar(); }
}
async function recarregar() {
  try { data = await Store.all(); } catch (e) { falhou(e); }
  render();
}

function renderCats(){
  const cats = {};
  data.forEach(p => { const c = p.cat || 'Sem categoria'; cats[c] = (cats[c]||0)+1; });
  const favs = data.filter(p=>p.fav).length;
  const items = [['Todos', data.length, '📚'], ['Favoritos', favs, '⭐']];
  let html = items.map(([n,c,i]) => `<button class="cat ${filtro===n?'on':''}" data-cat="${esc(n)}"><span>${i} ${n}</span><small>${c}</small></button>`).join('');
  html += '<div class="sep"></div>';
  html += Object.keys(cats).sort((a,b)=>a.localeCompare(b,'pt')).map(n => `<button class="cat ${filtro===n?'on':''}" data-cat="${esc(n)}"><span>📁 ${esc(n)}</span><small>${cats[n]}</small></button>`).join('');
  $('#cats').innerHTML = html;
  $('#catList').innerHTML = Object.keys(cats).filter(c=>c!=='Sem categoria').map(c=>`<option value="${esc(c)}">`).join('');
}

function renderGrid(){
  const q = $('#q').value.trim().toLowerCase();
  let list = data.filter(p => {
    if(filtro==='Favoritos' && !p.fav) return false;
    if(filtro!=='Todos' && filtro!=='Favoritos' && (p.cat||'Sem categoria')!==filtro) return false;
    if(!q) return true;
    return (p.title+' '+p.body+' '+(p.cat||'')+' '+p.tags.join(' ')).toLowerCase().includes(q);
  });
  const s = $('#sort').value;
  list.sort((a,b) => (b.fav-a.fav) || (s==='az' ? a.title.localeCompare(b.title,'pt') : s==='used' ? b.uses-a.uses : b.updated-a.updated));
  if(!list.length){
    $('#grid').innerHTML = `<div class="empty" style="grid-column:1/-1"><b>🗂️</b>${data.length ? 'Nenhum prompt encontrado.' : 'Nenhum prompt ainda. Clique em <b style="display:inline;font-size:inherit">+ Novo prompt</b>.'}</div>`;
    return;
  }
  $('#grid').innerHTML = list.map(p => {
    const v = vars(p.body);
    return `<div class="card" data-id="${p.id}">
      <div class="card-h"><h3>${esc(p.title||'Sem título')}</h3><button class="star ${p.fav?'on':''}" data-act="fav" title="Favoritar">★</button></div>
      <div class="body ${p.body.length>220||p.body.split('\n').length>6?'long':''}" data-act="view" style="cursor:pointer">${esc(p.body)}</div>
      <div class="tags">
        ${p.cat?`<span class="tag c">${esc(p.cat)}</span>`:''}
        ${p.tags.map(t=>`<span class="tag">#${esc(t)}</span>`).join('')}
        ${v.length?`<span class="tag v">${v.length} variáve${v.length>1?'is':'l'}</span>`:''}
      </div>
      <div class="meta">Usado ${p.uses}x · editado em ${new Date(p.updated).toLocaleDateString('pt-BR')}</div>
      <div class="actions">
        <button class="copy" data-act="copy">📋 Copiar</button>
        <button data-act="view">Ver</button>
        <button data-act="edit">Editar</button>
        <button data-act="dup" title="Duplicar">⧉</button>
      </div>
    </div>`;
  }).join('');
}
function render(){ renderCats(); renderGrid(); }

function openOv(id){ $(id).classList.add('show'); }
function closeAll(){ document.querySelectorAll('.ov').forEach(o=>o.classList.remove('show')); }

function openEdit(id){
  editId = id;
  const p = data.find(x=>x.id===id) || {title:'',cat:filtro!=='Todos'&&filtro!=='Favoritos'?filtro:'',tags:[],body:''};
  $('#editTitle').textContent = id ? 'Editar prompt' : 'Novo prompt';
  $('#fTitle').value = p.title; $('#fCat').value = p.cat||''; $('#fTags').value = p.tags.join(', '); $('#fBody').value = p.body;
  $('#btnDel').style.visibility = id ? 'visible' : 'hidden';
  closeAll(); openOv('#ovEdit'); setTimeout(()=>$('#fTitle').focus(),30);
}
async function saveEdit(){
  const body = $('#fBody').value;
  if(!body.trim()){ $('#fBody').focus(); toast('Escreva o prompt antes de salvar', true); return; }
  const fields = {
    title: $('#fTitle').value.trim() || body.trim().split('\n')[0].slice(0,60),
    cat: $('#fCat').value.trim(),
    tags: $('#fTags').value.split(',').map(t=>t.trim().replace(/^#/,'')).filter(Boolean),
    body, updated: Date.now()
  };
  const btn = $('#btnSave'); btn.disabled = true; btn.textContent = 'Salvando...';
  try {
    if (editId) Object.assign(data.find(x=>x.id===editId), await Store.update(editId, fields));
    else data.unshift(await Store.add(fields));
    closeAll(); render(); toast('Salvo!');
  } catch (e) { falhou(e); }
  finally { btn.disabled = false; btn.textContent = 'Salvar'; }
}

function openView(id){
  viewId = id; const p = data.find(x=>x.id===id);
  $('#viewTitle').textContent = p.title;
  $('#viewTags').innerHTML = (p.cat?`<span class="tag c">${esc(p.cat)}</span>`:'') + p.tags.map(t=>`<span class="tag">#${esc(t)}</span>`).join('');
  $('#viewBody').textContent = p.body;
  $('#viewMeta').textContent = `Criado em ${new Date(p.created).toLocaleDateString('pt-BR')} · usado ${p.uses}x`;
  closeAll(); openOv('#ovView');
}

async function copyText(text, id){
  try{ await navigator.clipboard.writeText(text); }
  catch(e){ const ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
  toast('Copiado!');
  const p = data.find(x=>x.id===id); if(p) salvarCampos(id, { uses: p.uses + 1 });
}
function startCopy(id){
  const p = data.find(x=>x.id===id); const v = vars(p.body);
  if(!v.length){ copyText(p.body, id); closeAll(); return; }
  varsId = id;
  $('#varsTitle').textContent = 'Preencher: ' + p.title;
  $('#varsFields').innerHTML = v.map(n=>`<label>${esc(n)}</label><input data-var="${esc(n)}">`).join('');
  updatePreview(); closeAll(); openOv('#ovVars');
  setTimeout(()=>$('#varsFields input')?.focus(),30);
}
function filled(){
  const p = data.find(x=>x.id===varsId); const vals = {};
  document.querySelectorAll('#varsFields input').forEach(i=>vals[i.dataset.var]=i.value);
  return p.body.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (m,n)=> vals[n] ? vals[n] : m);
}
function updatePreview(){ $('#varsPreview').textContent = filled(); }

// normaliza prompts vindos de backup .json ou do navegador antigo
const limpa = p => ({ title: p.title||'', cat: p.cat||'', tags: Array.isArray(p.tags)?p.tags.map(String):[], body: String(p.body),
  fav: !!p.fav, uses: +p.uses||0, created: p.created||Date.now(), updated: p.updated||Date.now() });

async function importar(lista) {
  const existentes = new Set(data.map(p => p.title + '\u0000' + p.body));
  const novos = lista.filter(p => p && p.body && !existentes.has((p.title||'') + '\u0000' + p.body)).map(limpa);
  if (!novos.length) return 0;
  data.push(...await Store.addMany(novos));
  render();
  return novos.length;
}

// Se houver prompts do tempo em que tudo ficava só no navegador, oferece enviar pro banco.
async function migrarLocal() {
  let antigos; try { antigos = JSON.parse(localStorage.getItem(LOCAL_KEY)); } catch (e) {}
  if (!Array.isArray(antigos) || !antigos.length) return;
  if (!confirm(`Encontramos ${antigos.length} prompt(s) salvos só neste navegador.\nEnviar para o banco de dados para não perder mais?`)) return;
  try {
    const n = await importar(antigos);
    localStorage.setItem(LOCAL_KEY + '.migrado', localStorage.getItem(LOCAL_KEY));
    localStorage.removeItem(LOCAL_KEY);
    toast(`${n} prompt(s) enviados para o banco`);
  } catch (e) { falhou(e); }
}

// ---------- eventos ----------
$('#cats').addEventListener('click', e => { const b=e.target.closest('.cat'); if(b){ filtro=b.dataset.cat; render(); } });
$('#grid').addEventListener('click', async e => {
  const a = e.target.closest('[data-act]'); if(!a) return;
  const id = e.target.closest('.card').dataset.id; const p = data.find(x=>x.id===id);
  const acoes = {
    fav(){ salvarCampos(id, { fav: !p.fav }); },
    copy(){ startCopy(id); },
    view(){ openView(id); },
    edit(){ openEdit(id); },
    async dup(){
      try { data.unshift(await Store.add({ ...limpa(p), title: p.title + ' (cópia)', fav: false, uses: 0, created: Date.now(), updated: Date.now() })); render(); toast('Duplicado!'); }
      catch (err) { falhou(err); }
    }
  };
  acoes[a.dataset.act]();
});
$('#btnNew').onclick = () => openEdit(null);
$('#btnSave').onclick = saveEdit;
$('#btnDel').onclick = async () => {
  if(!confirm('Excluir este prompt? Não dá para desfazer.')) return;
  try { await Store.remove(editId); data = data.filter(x=>x.id!==editId); closeAll(); render(); toast('Excluído'); }
  catch (e) { falhou(e); }
};
$('#btnViewCopy').onclick = () => startCopy(viewId);
$('#btnViewEdit').onclick = () => openEdit(viewId);
$('#btnVarsCopy').onclick = () => { copyText(filled(), varsId); closeAll(); };
$('#varsFields').addEventListener('input', updatePreview);
$('#q').addEventListener('input', renderGrid);
$('#sort').addEventListener('change', renderGrid);
document.querySelectorAll('.ov').forEach(o => o.addEventListener('mousedown', e => { if(e.target===o || e.target.closest('[data-close]')) closeAll(); }));
document.addEventListener('keydown', e => {
  if(e.key==='Escape') closeAll();
  if(e.key==='/' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)){ e.preventDefault(); $('#q').focus(); }
  if((e.ctrlKey||e.metaKey) && e.key==='Enter' && $('#ovEdit').classList.contains('show')) saveEdit();
});

$('#btnExport').onclick = () => {
  const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `prompts-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(a.href);
};
$('#btnImport').onclick = () => $('#fileImport').click();
$('#fileImport').onchange = async e => {
  const f = e.target.files[0]; if(!f) return;
  try{
    const arr = JSON.parse(await f.text()); if(!Array.isArray(arr)) throw new Error('Arquivo inválido');
    toast(`${await importar(arr)} prompt(s) importado(s)`);
  }catch(err){ falhou(err); }
  e.target.value='';
};
$('#btnLogout').onclick = () => Auth.logout();

// ---------- início ----------
(async () => {
  if (!Auth.configured || !Auth.client) { location.replace('index.html'); return; }
  const user = await Auth.requireLogin();
  $('#who').textContent = user.email;
  $('#grid').innerHTML = '<div class="empty" style="grid-column:1/-1"><b>⏳</b>Carregando seus prompts...</div>';
  await recarregar();
  await migrarLocal();
})();

// ── Override do irPara para incluir novas abas ──
// Este bloco deve ser inserido APÓS a definição original de irPara()
// OU simplesmente substituir a função. Como estamos concatenando,
// esta declaração sobrescreve a anterior (last-write wins em JS não-module).

function irPara(pagina) {
  paginaAtiva = pagina;
  document.querySelectorAll('.nav-tab, .admin-nav-tab').forEach(el => el.classList.remove('active'));
  const nav = document.getElementById('nav-' + pagina);
  if (nav) nav.classList.add('active');

  // Sincroniza bottom nav mobile admin
  document.querySelectorAll('.admin-bnav-tab').forEach(t => t.classList.remove('active'));
  const bmap = { dashboard:0, pedidos:1, produtos:2, embaixadoras:3, comunicados:4 };
  if (bmap[pagina] !== undefined) {
    const btabs = document.querySelectorAll('.admin-bnav-tab');
    if (btabs[bmap[pagina]]) btabs[bmap[pagina]].classList.add('active');
  }

  const main = document.getElementById('conteudo-principal');
  main.innerHTML = '<div class="loading"><div class="spinner"></div> Carregando...</div>';

  const acoes = {
    dashboard:     renderDashboard,
    pedidos:       renderPedidos,
    produtos:      renderProdutos,
    categorias:    renderCategorias,
    embaixadoras:  renderEmbaixadoras,
    comunicados:   renderComunicados,
    depoimentos:   renderDepoimentosAdmin,
    suporte:       renderSuporteAdmin,
    criativos:     renderCriativosAdmin,
    capacitacao:   renderCapacitacaoAdmin,
  };
  (acoes[pagina] || renderDashboard)();
}
// ============================================
// IRES — admin.js PATCH
// Adicionar estas funções ao admin.js existente.
// Também atualizar o objeto `acoes` no irPara():
//
// const acoes = {
//   ...acoes existentes...,
//   criativos:   renderCriativosAdmin,
//   capacitacao: renderCapacitacaoAdmin,
// };
// ============================================

// ════════════════════════════════════════════
// CRIATIVOS — Admin
// ════════════════════════════════════════════
async function renderCriativosAdmin() {
  const { data } = await _supabase
    .from('creatives')
    .select('*')
    .order('created_at', { ascending: false });

  const fmtColor = {
    story: { bg:'rgba(196,50,90,.12)', border:'rgba(196,50,90,.3)', text:'#C4325A' },
    feed:  { bg:'rgba(76,175,122,.1)', border:'rgba(76,175,122,.25)', text:'#4CAF7A' },
    reels: { bg:'rgba(201,168,76,.1)', border:'rgba(201,168,76,.28)', text:'#C9A84C' },
    outro: { bg:'rgba(91,143,212,.1)', border:'rgba(91,143,212,.28)', text:'#5B8FD4' },
  };

  document.getElementById('conteudo-principal').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <h2 style="font-size:20px;font-weight:800">Criativos</h2>
      <button class="btn btn-primary btn-sm" style="width:auto" onclick="abrirFormCriativo()">+ Novo criativo</button>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <div class="filter-pill active" onclick="filtrarCriativosAdm(this,'')">Todos</div>
      <div class="filter-pill" onclick="filtrarCriativosAdm(this,'story')">Story</div>
      <div class="filter-pill" onclick="filtrarCriativosAdm(this,'feed')">Feed</div>
      <div class="filter-pill" onclick="filtrarCriativosAdm(this,'reels')">Reels</div>
      <div class="filter-pill" onclick="filtrarCriativosAdm(this,'outro')">Outros</div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px" id="grid-criativos-adm">
      ${(data||[]).length ? (data||[]).map(c => _criativoAdmCard(c, fmtColor)).join('')
        : '<p style="color:var(--gray);font-size:13px;grid-column:1/-1">Nenhum criativo cadastrado.</p>'}
    </div>
  `;
  window._todosCriativosAdm = data || [];
}

function _criativoAdmCard(c, fmtColor) {
  const fmt  = fmtColor[c.format] || fmtColor.outro;
  const thumb = c.thumbnail_url || c.file_url;
  return `
    <div style="background:#111;border:0.5px solid var(--border);border-radius:14px;overflow:hidden">
      <div style="position:relative;height:160px;background:var(--black);overflow:hidden">
        ${thumb && c.file_type !== 'video'
          ? `<img src="${thumb}" style="width:100%;height:100%;object-fit:cover"/>`
          : thumb && c.file_type === 'video'
            ? `<video src="${c.file_url}" style="width:100%;height:100%;object-fit:cover" muted></video>`
            : `<div style="display:flex;align-items:center;justify-content:center;height:100%">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>`
        }
        <div style="position:absolute;top:8px;left:8px;
          background:${fmt.bg};border:0.5px solid ${fmt.border};color:${fmt.text};
          font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px">
          ${c.format.toUpperCase()}
        </div>
        <div style="position:absolute;top:8px;right:8px">
          <span class="pill ${c.is_active ? 'pill-green' : 'pill-gray'}" style="font-size:10px">
            ${c.is_active ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      </div>
      <div style="padding:12px">
        <div style="font-size:13px;font-weight:600;color:var(--white);margin-bottom:8px;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.title}</div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm btn-outline" style="flex:1" onclick="abrirFormCriativo('${c.id}')">Editar</button>
          <button class="btn btn-sm btn-danger" onclick="toggleCriativo('${c.id}',${c.is_active})">
            ${c.is_active ? 'Desativar' : 'Ativar'}
          </button>
        </div>
      </div>
    </div>
  `;
}

function filtrarCriativosAdm(el, formato) {
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  const fmtColor = {
    story: { bg:'rgba(196,50,90,.12)', border:'rgba(196,50,90,.3)', text:'#C4325A' },
    feed:  { bg:'rgba(76,175,122,.1)', border:'rgba(76,175,122,.25)', text:'#4CAF7A' },
    reels: { bg:'rgba(201,168,76,.1)', border:'rgba(201,168,76,.28)', text:'#C9A84C' },
    outro: { bg:'rgba(91,143,212,.1)', border:'rgba(91,143,212,.28)', text:'#5B8FD4' },
  };
  const lista = formato
    ? (window._todosCriativosAdm||[]).filter(c => c.format === formato)
    : (window._todosCriativosAdm||[]);
  const grid = document.getElementById('grid-criativos-adm');
  grid.innerHTML = lista.length
    ? lista.map(c => _criativoAdmCard(c, fmtColor)).join('')
    : '<p style="color:var(--gray);font-size:13px;grid-column:1/-1">Nenhum criativo.</p>';
}

function abrirFormCriativo(id) {
  const carregar = async () => {
    let c = {};
    if (id) {
      const { data } = await _supabase.from('creatives').select('*').eq('id', id).single();
      c = data || {};
    }
    window._criativoFileUrl     = c.file_url     || '';
    window._criativoThumbUrl    = c.thumbnail_url || '';

    abrirModal(`
      <button onclick="fecharModal()" style="position:absolute;top:12px;right:12px;background:none;border:none;color:var(--gray);cursor:pointer;font-size:20px">✕</button>
      <h3 style="font-size:16px;font-weight:800;margin-bottom:16px">${id ? 'Editar criativo' : 'Novo criativo'}</h3>

      <div class="form-group">
        <label>Título *</label>
        <input type="text" id="cri-titulo" value="${c.title||''}" placeholder="Ex: Story lançamento Tiara"/>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Formato *</label>
          <select id="cri-formato">
            <option value="story"  ${c.format==='story' ?'selected':''}>Story</option>
            <option value="feed"   ${c.format==='feed'  ?'selected':''}>Feed</option>
            <option value="reels"  ${c.format==='reels' ?'selected':''}>Reels</option>
            <option value="outro"  ${c.format==='outro' ?'selected':''}>Outro</option>
          </select>
        </div>
        <div class="form-group">
          <label>Tipo de arquivo *</label>
          <select id="cri-tipo">
            <option value="image" ${c.file_type==='image'||!c.file_type?'selected':''}>Imagem</option>
            <option value="video" ${c.file_type==='video'?'selected':''}>Vídeo</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Descrição (opcional)</label>
        <input type="text" id="cri-desc" value="${c.description||''}" placeholder="Breve descrição"/>
      </div>

      <!-- Upload arquivo principal -->
      <div class="form-group">
        <label>Arquivo principal *</label>
        <div onclick="document.getElementById('cri-file-input').click()"
          style="border:0.5px dashed var(--border);border-radius:var(--radius-md);padding:16px;
            text-align:center;cursor:pointer;background:var(--black);transition:border-color .2s"
          onmouseover="this.style.borderColor='var(--pink)'"
          onmouseout="this.style.borderColor='var(--border)'">
          <div id="cri-file-preview">
            ${c.file_url
              ? `<div style="font-size:12px;color:var(--green)">✓ Arquivo atual: <a href="${c.file_url}" target="_blank" style="color:var(--pink)">ver</a></div>`
              : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gray)" stroke-width="1.5" style="margin-bottom:6px">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <div style="font-size:12px;color:var(--gray)">Clique para fazer upload</div>`
            }
          </div>
          <div id="cri-upload-prog" style="display:none;margin-top:8px">
            <div style="height:3px;background:var(--border);border-radius:2px;overflow:hidden">
              <div id="cri-upload-bar" style="height:100%;width:0%;background:var(--pink);transition:width .3s"></div>
            </div>
          </div>
        </div>
        <input type="file" id="cri-file-input" accept="image/*,video/*" style="display:none"
          onchange="uploadCriativoArquivo(this.files[0],'principal')"/>
      </div>

      <!-- Thumbnail (opcional para vídeo) -->
      <div class="form-group">
        <label>Thumbnail (opcional — recomendado para vídeos)</label>
        <div onclick="document.getElementById('cri-thumb-input').click()"
          style="border:0.5px dashed var(--border);border-radius:var(--radius-md);padding:12px;
            text-align:center;cursor:pointer;background:var(--black);transition:border-color .2s"
          onmouseover="this.style.borderColor='var(--pink)'"
          onmouseout="this.style.borderColor='var(--border)'">
          <div id="cri-thumb-preview">
            ${c.thumbnail_url
              ? `<img src="${c.thumbnail_url}" style="height:60px;border-radius:6px;"/>`
              : `<div style="font-size:11px;color:var(--gray)">+ Adicionar thumbnail</div>`
            }
          </div>
        </div>
        <input type="file" id="cri-thumb-input" accept="image/*" style="display:none"
          onchange="uploadCriativoArquivo(this.files[0],'thumb')"/>
      </div>

      <div style="display:flex;gap:10px;margin-top:4px">
        <button class="btn btn-outline" style="flex:1" onclick="fecharModal()">Cancelar</button>
        <button class="btn btn-primary" style="flex:1" id="btn-salvar-cri"
          onclick="salvarCriativo(${id?`'${id}'`:'null'})">Salvar criativo</button>
      </div>
    `);
  };
  carregar();
}

async function uploadCriativoArquivo(file, tipo) {
  if (!file) return;
  const isThumb    = tipo === 'thumb';
  const barId      = isThumb ? null : 'cri-upload-bar';
  const progId     = isThumb ? null : 'cri-upload-prog';
  const previewId  = isThumb ? 'cri-thumb-preview' : 'cri-file-preview';
  const btnId      = 'btn-salvar-cri';

  if (progId) document.getElementById(progId).style.display = 'block';
  if (barId)  document.getElementById(barId).style.width = '30%';
  document.getElementById(btnId).disabled = true;

  const ext  = file.name.split('.').pop();
  const name = `${tipo}_${Date.now()}.${ext}`;

  const { error } = await _supabase.storage
    .from('criativos')
    .upload(name, file, { cacheControl: '3600', upsert: false });

  if (error) { showToast('Erro no upload: ' + error.message, 'error'); return; }

  if (barId) document.getElementById(barId).style.width = '100%';

  const { data: { publicUrl } } = _supabase.storage.from('criativos').getPublicUrl(name);

  if (isThumb) {
    window._criativoThumbUrl = publicUrl;
    document.getElementById(previewId).innerHTML =
      `<img src="${publicUrl}" style="height:60px;border-radius:6px;"/>`;
  } else {
    window._criativoFileUrl = publicUrl;
    const isVid = file.type.startsWith('video/');
    document.getElementById(previewId).innerHTML = isVid
      ? `<video src="${publicUrl}" style="height:80px;border-radius:6px;" muted></video>`
      : `<img src="${publicUrl}" style="height:80px;border-radius:6px;object-fit:cover"/>`;
  }

  setTimeout(() => {
    if (progId) document.getElementById(progId).style.display = 'none';
    document.getElementById(btnId).disabled = false;
  }, 500);
}

async function salvarCriativo(id) {
  const titulo = document.getElementById('cri-titulo').value.trim();
  const formato= document.getElementById('cri-formato').value;
  const tipo   = document.getElementById('cri-tipo').value;
  const desc   = document.getElementById('cri-desc').value.trim();

  if (!titulo)                  { showToast('Informe o título.','error'); return; }
  if (!window._criativoFileUrl) { showToast('Faça upload do arquivo.','error'); return; }

  const btn = document.getElementById('btn-salvar-cri');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="margin:0 auto"></div>';

  const payload = {
    title:         titulo,
    format:        formato,
    file_type:     tipo,
    description:   desc || null,
    file_url:      window._criativoFileUrl,
    thumbnail_url: window._criativoThumbUrl || null,
  };

  const { error } = id
    ? await _supabase.from('creatives').update(payload).eq('id', id)
    : await _supabase.from('creatives').insert({ ...payload, is_active: true });

  if (error) { showToast('Erro: '+error.message,'error'); btn.disabled=false; btn.textContent='Salvar criativo'; return; }
  showToast(id ? 'Criativo atualizado!' : 'Criativo criado!', 'success');
  fecharModal();
  renderCriativosAdmin();
}

async function toggleCriativo(id, ativo) {
  const { error } = await _supabase.from('creatives').update({ is_active: !ativo }).eq('id', id);
  if (error) { showToast('Erro.','error'); return; }
  showToast(ativo ? 'Criativo desativado.' : 'Criativo ativado!', 'success');
  renderCriativosAdmin();
}

// ════════════════════════════════════════════
// CAPACITAÇÃO — Admin
// ════════════════════════════════════════════
async function renderCapacitacaoAdmin() {
  const { data: modulos } = await _supabase
    .from('modules')
    .select('*, lessons(id,title,duration_seconds,"order",is_active)')
    .order('"order"', { ascending: true });

  document.getElementById('conteudo-principal').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <h2 style="font-size:20px;font-weight:800">Capacitação</h2>
      <button class="btn btn-primary btn-sm" style="width:auto" onclick="abrirFormModulo()">+ Novo módulo</button>
    </div>

    <div style="display:flex;flex-direction:column;gap:16px" id="lista-modulos">
      ${(modulos||[]).length ? (modulos||[]).map(m => _moduloAdmCard(m)).join('')
        : '<p style="color:var(--gray);font-size:13px">Nenhum módulo cadastrado.</p>'}
    </div>
  `;
  window._modulosAdm = modulos || [];
}

function _moduloAdmCard(m) {
  const aulas = (m.lessons||[]).sort((a,b) => a.order - b.order);
  return `
    <div style="background:#111;border:0.5px solid var(--border);border-radius:14px;overflow:hidden">
      <!-- Header módulo -->
      <div style="padding:16px;display:flex;align-items:center;justify-content:space-between;border-bottom:0.5px solid var(--border2)">
        <div>
          <div style="font-size:14px;font-weight:700;color:var(--white)">${m.title}</div>
          ${m.description ? `<div style="font-size:12px;color:var(--gray);margin-top:2px">${m.description}</div>` : ''}
          <div style="font-size:11px;color:var(--gray);margin-top:4px">${aulas.length} aula${aulas.length!==1?'s':''}</div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button class="btn btn-sm btn-outline" onclick="abrirFormAula(null,'${m.id}')">+ Aula</button>
          <button class="btn btn-sm btn-outline" onclick="abrirFormModulo('${m.id}')">Editar</button>
          <button class="btn btn-sm btn-danger" onclick="deletarModulo('${m.id}')">Excluir</button>
        </div>
      </div>

      <!-- Lista de aulas -->
      ${aulas.length ? `
        <div style="display:flex;flex-direction:column">
          ${aulas.map((a, ai) => {
            const durMin = a.duration_seconds ? Math.ceil(a.duration_seconds/60) : null;
            return `
              <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;
                border-bottom:0.5px solid var(--border2);${ai===aulas.length-1?'border-bottom:none':''}">
                <div style="width:28px;height:28px;border-radius:50%;background:var(--pink-faint);
                  border:0.5px solid var(--pink-deep);display:flex;align-items:center;justify-content:center;
                  font-size:11px;font-weight:700;color:var(--pink);flex-shrink:0">${ai+1}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:13px;font-weight:600;color:var(--white)">${a.title}</div>
                  ${durMin ? `<div style="font-size:11px;color:var(--gray)">${durMin} min</div>` : ''}
                </div>
                <span class="pill ${a.is_active?'pill-green':'pill-gray'}" style="font-size:10px">
                  ${a.is_active?'Ativa':'Inativa'}
                </span>
                <div style="display:flex;gap:6px">
                  <button class="btn btn-sm btn-outline" onclick="abrirFormAula('${a.id}','${m.id}')">Editar</button>
                  <button class="btn btn-sm btn-danger" onclick="deletarAula('${a.id}')">✕</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : `
        <div style="padding:20px 16px;text-align:center;font-size:13px;color:var(--gray)">
          Nenhuma aula ainda.
          <button class="btn btn-sm btn-outline" style="margin-left:10px" onclick="abrirFormAula(null,'${m.id}')">+ Adicionar</button>
        </div>
      `}
    </div>
  `;
}

// ── Form módulo ──
function abrirFormModulo(id) {
  const mod = id ? (window._modulosAdm||[]).find(m => m.id === id) : null;
  abrirModal(`
    <button onclick="fecharModal()" style="position:absolute;top:12px;right:12px;background:none;border:none;color:var(--gray);cursor:pointer;font-size:20px">✕</button>
    <h3 style="font-size:16px;font-weight:800;margin-bottom:16px">${id ? 'Editar módulo' : 'Novo módulo'}</h3>
    <div class="form-group">
      <label>Título *</label>
      <input type="text" id="mod-titulo" value="${mod?.title||''}" placeholder="Ex: Técnicas de vendas"/>
    </div>
    <div class="form-group">
      <label>Descrição (opcional)</label>
      <input type="text" id="mod-desc" value="${mod?.description||''}" placeholder="Breve descrição do módulo"/>
    </div>
    <div class="form-group">
      <label>Ordem de exibição</label>
      <input type="number" id="mod-order" value="${mod?.order||0}" min="0"/>
    </div>
    <div style="display:flex;gap:10px;margin-top:4px">
      <button class="btn btn-outline" style="flex:1" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-primary" style="flex:1" id="btn-mod" onclick="salvarModulo(${id?`'${id}'`:'null'})">Salvar</button>
    </div>
  `);
}

async function salvarModulo(id) {
  const titulo = document.getElementById('mod-titulo').value.trim();
  const desc   = document.getElementById('mod-desc').value.trim();
  const order  = parseInt(document.getElementById('mod-order').value)||0;
  if (!titulo) { showToast('Informe o título.','error'); return; }

  const btn = document.getElementById('btn-mod');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="margin:0 auto"></div>';

  const payload = { title: titulo, description: desc||null, order };
  const { error } = id
    ? await _supabase.from('modules').update(payload).eq('id', id)
    : await _supabase.from('modules').insert({ ...payload, is_active: true });

  if (error) { showToast('Erro: '+error.message,'error'); btn.disabled=false; btn.textContent='Salvar'; return; }
  showToast(id ? 'Módulo atualizado!' : 'Módulo criado!', 'success');
  fecharModal();
  renderCapacitacaoAdmin();
}

async function deletarModulo(id) {
  if (!confirm('Excluir este módulo? Todas as aulas serão removidas.')) return;
  const { error } = await _supabase.from('modules').delete().eq('id', id);
  if (error) { showToast('Erro.','error'); return; }
  showToast('Módulo excluído.','success');
  renderCapacitacaoAdmin();
}

// ── Form aula ──
function abrirFormAula(aulaId, moduloId) {
  const carregar = async () => {
    let a = {};
    if (aulaId) {
      const { data } = await _supabase.from('lessons').select('*').eq('id', aulaId).single();
      a = data || {};
    }
    abrirModal(`
      <button onclick="fecharModal()" style="position:absolute;top:12px;right:12px;background:none;border:none;color:var(--gray);cursor:pointer;font-size:20px">✕</button>
      <h3 style="font-size:16px;font-weight:800;margin-bottom:16px">${aulaId ? 'Editar aula' : 'Nova aula'}</h3>

      <div class="form-group">
        <label>Título *</label>
        <input type="text" id="aula-titulo" value="${a.title||''}" placeholder="Ex: Como abordar clientes"/>
      </div>
      <div class="form-group">
        <label>Descrição (opcional)</label>
        <input type="text" id="aula-desc" value="${a.description||''}" placeholder="O que a embaixadora vai aprender"/>
      </div>
      <div class="form-group">
        <label>URL do YouTube *</label>
        <input type="url" id="aula-url" value="${a.video_url||''}" placeholder="https://youtu.be/XXXXXXXXXXX ou https://www.youtube.com/watch?v=XXXXXXXXXXX"/>
        <div style="font-size:11px;color:var(--gray);margin-top:4px">
          Cole o link do YouTube (não listado). Ex: https://youtu.be/dQw4w9WgXcQ
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Duração (minutos)</label>
          <input type="number" id="aula-dur" value="${a.duration_seconds ? Math.ceil(a.duration_seconds/60) : ''}" min="1" placeholder="Ex: 12"/>
        </div>
        <div class="form-group">
          <label>Ordem no módulo</label>
          <input type="number" id="aula-order" value="${a.order||0}" min="0"/>
        </div>
      </div>

      <!-- Preview do vídeo -->
      <div class="form-group">
        <label>Preview</label>
        <button type="button" onclick="_previewYoutubeAdmin()"
          style="width:100%;padding:8px;background:transparent;border:0.5px solid var(--border);
            border-radius:var(--radius-md);color:var(--pink);font-size:13px;cursor:pointer">
          ▶ Pré-visualizar vídeo
        </button>
        <div id="aula-preview" style="margin-top:10px;display:none;border-radius:10px;overflow:hidden">
          <div style="position:relative;padding-bottom:56.25%;height:0;background:#000">
            <iframe id="aula-iframe" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen></iframe>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:10px;margin-top:4px">
        <button class="btn btn-outline" style="flex:1" onclick="fecharModal()">Cancelar</button>
        <button class="btn btn-primary" style="flex:1" id="btn-aula"
          onclick="salvarAula(${aulaId?`'${aulaId}'`:'null'},'${moduloId}')">Salvar aula</button>
      </div>
    `);
  };
  carregar();
}

function _previewYoutubeAdmin() {
  const url   = document.getElementById('aula-url').value.trim();
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/);
  if (!match) { showToast('URL inválida. Cole um link do YouTube.','error'); return; }
  const embedUrl = `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1`;
  document.getElementById('aula-iframe').src = embedUrl;
  document.getElementById('aula-preview').style.display = 'block';
}

async function salvarAula(aulaId, moduloId) {
  const titulo = document.getElementById('aula-titulo').value.trim();
  const desc   = document.getElementById('aula-desc').value.trim();
  const url    = document.getElementById('aula-url').value.trim();
  const durMin = parseInt(document.getElementById('aula-dur').value)||0;
  const order  = parseInt(document.getElementById('aula-order').value)||0;

  if (!titulo) { showToast('Informe o título.','error'); return; }
  if (!url)    { showToast('Informe a URL do YouTube.','error'); return; }

  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/);
  if (!match)  { showToast('URL do YouTube inválida.','error'); return; }

  const btn = document.getElementById('btn-aula');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="margin:0 auto"></div>';

  const payload = {
    title:            titulo,
    description:      desc||null,
    video_url:        url,
    duration_seconds: durMin * 60,
    order,
    module_id:        moduloId,
  };

  const { error } = aulaId
    ? await _supabase.from('lessons').update(payload).eq('id', aulaId)
    : await _supabase.from('lessons').insert({ ...payload, is_active: true });

  if (error) { showToast('Erro: '+error.message,'error'); btn.disabled=false; btn.textContent='Salvar aula'; return; }
  showToast(aulaId ? 'Aula atualizada!' : 'Aula criada!', 'success');
  fecharModal();
  renderCapacitacaoAdmin();
}

async function deletarAula(id) {
  if (!confirm('Excluir esta aula?')) return;
  const { error } = await _supabase.from('lessons').delete().eq('id', id);
  if (error) { showToast('Erro.','error'); return; }
  showToast('Aula excluída.','success');
  renderCapacitacaoAdmin();
}

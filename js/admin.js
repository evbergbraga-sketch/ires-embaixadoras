// ============================================
// IRES EMBAIXADORAS — admin.js
// Dashboard, pedidos, produtos, embaixadoras
// e comunicados — tudo no painel admin.
// ============================================

let paginaAtiva = 'dashboard';

// ── Inicialização ──
(async () => {
  const ctx = await requireAdmin();
  if (!ctx) return;
  await renderTopbar({ showCart: false });
  irPara('dashboard');
})();

// ── Navegação ──
function irPara(pagina) {
  paginaAtiva = pagina;
  document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
  const nav = document.getElementById(`nav-${pagina}`);
  if (nav) nav.classList.add('active');

  const main = document.getElementById('conteudo-principal');
  main.innerHTML = '<div class="loading"><div class="spinner"></div> Carregando...</div>';

  const acoes = {
    dashboard:     renderDashboard,
    pedidos:       renderPedidos,
    produtos:      renderProdutos,
    embaixadoras:  renderEmbaixadoras,
    comunicados:   renderComunicados,
  };
  (acoes[pagina] || renderDashboard)();
}

// ════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════
async function renderDashboard() {
  const [{ count: totalPedidos }, { count: totalEmb }, { data: pedidosHoje }, { data: pendentes }] = await Promise.all([
    _supabase.from('orders').select('*', { count: 'exact', head: true }),
    _supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status','active').eq('role','reseller'),
    _supabase.from('orders').select('total').gte('created_at', new Date().toISOString().slice(0,10)),
    _supabase.from('profiles').select('id,full_name,created_at').eq('status','pending').eq('role','reseller').limit(5),
  ]);

  const faturamentoHoje = (pedidosHoje || []).reduce((a,o) => a + Number(o.total), 0);

  const { data: ultimosPedidos } = await _supabase
    .from('orders')
    .select('id, total, status, created_at, profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(6);

  document.getElementById('conteudo-principal').innerHTML = `
    <div style="margin-bottom:20px">
      <h2 style="font-size:20px;font-weight:800">Dashboard</h2>
      <p style="font-size:13px;color:var(--gray);margin-top:2px">Visão geral da plataforma</p>
    </div>

    <div class="metrics-grid">
      <div class="metric-card" style="border-top-color:var(--pink)">
        <div class="metric-value">${pedidosHoje?.length || 0}</div>
        <div class="metric-label">Pedidos hoje</div>
      </div>
      <div class="metric-card" style="border-top-color:var(--pink)">
        <div class="metric-value">${formatBRL(faturamentoHoje)}</div>
        <div class="metric-label">Faturamento hoje</div>
      </div>
      <div class="metric-card" style="border-top-color:var(--green)">
        <div class="metric-value">${totalEmb || 0}</div>
        <div class="metric-label">Embaixadoras ativas</div>
      </div>
      <div class="metric-card" style="border-top-color:var(--amber)">
        <div class="metric-value">${pendentes?.length || 0}</div>
        <div class="metric-label">Aguardando aprovação</div>
      </div>
    </div>

    ${pendentes?.length ? `
      <div style="margin-bottom:24px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div class="section-title">Aguardando aprovação</div>
          <button class="btn btn-sm btn-outline" onclick="irPara('embaixadoras')">Ver todas</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${pendentes.map(e => `
            <div style="background:#111;border:0.5px solid var(--border);border-radius:var(--radius-lg);padding:12px 16px;display:flex;align-items:center;justify-content:space-between">
              <div style="display:flex;align-items:center;gap:10px">
                <div class="avatar">${initials(e.full_name)}</div>
                <div>
                  <div style="font-size:13px;font-weight:600">${e.full_name || 'Sem nome'}</div>
                  <div style="font-size:11px;color:var(--gray)">${new Date(e.created_at).toLocaleDateString('pt-BR')}</div>
                </div>
              </div>
              <div style="display:flex;gap:8px">
                <button class="btn btn-sm btn-outline" onclick="reprovarEmb('${e.id}')">Reprovar</button>
                <button class="btn btn-sm btn-primary" style="width:auto" onclick="aprovarEmb('${e.id}')">Aprovar</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div class="section-title">Pedidos recentes</div>
        <button class="btn btn-sm btn-outline" onclick="irPara('pedidos')">Ver todos</button>
      </div>
      <div class="orders-list">
        ${(ultimosPedidos || []).map(o => `
          <div class="order-row" onclick="abrirPedido('${o.id}')">
            <div>
              <div class="order-id">#${o.id.slice(-4).toUpperCase()}</div>
              <div class="order-date">${new Date(o.created_at).toLocaleDateString('pt-BR')}</div>
            </div>
            <div class="order-items-preview">${o.profiles?.full_name || 'Embaixadora'}</div>
            <div class="order-total">${formatBRL(o.total)}</div>
            ${statusLabel(o.status)}
          </div>
        `).join('') || '<p style="color:var(--gray);font-size:13px">Nenhum pedido ainda.</p>'}
      </div>
    </div>
  `;
}

// ════════════════════════════════════════════
// PEDIDOS
// ════════════════════════════════════════════
async function renderPedidos() {
  const { data } = await _supabase
    .from('orders')
    .select('id, total, status, created_at, notes, profiles(full_name)')
    .order('created_at', { ascending: false });

  document.getElementById('conteudo-principal').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <h2 style="font-size:20px;font-weight:800">Pedidos</h2>
      <span class="pill pill-gray">${data?.length || 0} pedidos</span>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      ${['','pending','paid','processing','shipped','delivered','cancelled'].map(s => `
        <div class="filter-pill ${!s ? 'active' : ''}" onclick="filtrarPedidosAdmin(this,'${s}')">
          ${!s ? 'Todos' : statusLabel(s).replace(/<[^>]+>/g,'')}
        </div>
      `).join('')}
    </div>

    <div class="orders-list" id="lista-pedidos-admin">
      ${(data || []).map(o => pedidoRow(o)).join('') || '<p style="color:var(--gray);font-size:13px">Nenhum pedido ainda.</p>'}
    </div>
  `;

  window._todosOsPedidos = data || [];
}

function pedidoRow(o) {
  return `
    <div class="order-row" data-status="${o.status}" onclick="abrirPedido('${o.id}')">
      <div>
        <div class="order-id">#${o.id.slice(-4).toUpperCase()}</div>
        <div class="order-date">${new Date(o.created_at).toLocaleDateString('pt-BR')}</div>
      </div>
      <div class="order-items-preview">${o.profiles?.full_name || 'Embaixadora'}</div>
      <div class="order-total">${formatBRL(o.total)}</div>
      ${statusLabel(o.status)}
    </div>
  `;
}

function filtrarPedidosAdmin(el, status) {
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  const lista = document.getElementById('lista-pedidos-admin');
  const filtrados = status
    ? (window._todosOsPedidos || []).filter(o => o.status === status)
    : (window._todosOsPedidos || []);
  lista.innerHTML = filtrados.map(o => pedidoRow(o)).join('') || '<p style="color:var(--gray);font-size:13px">Nenhum pedido.</p>';
}

async function abrirPedido(id) {
  const { data: o } = await _supabase
    .from('orders')
    .select('*, profiles(full_name, phone), order_items(quantity, unit_price, subtotal, products(name))')
    .eq('id', id)
    .single();

  if (!o) return;

  abrirModal(`
    <button onclick="fecharModal()" style="position:absolute;top:12px;right:12px;background:none;border:none;color:var(--gray);cursor:pointer;font-size:20px">✕</button>
    <h3 style="font-size:16px;font-weight:800;margin-bottom:4px">Pedido #${o.id.slice(-4).toUpperCase()}</h3>
    <p style="font-size:12px;color:var(--gray);margin-bottom:16px">${new Date(o.created_at).toLocaleDateString('pt-BR')} · ${o.profiles?.full_name}</p>

    <div style="margin-bottom:16px">
      ${(o.order_items || []).map(i => `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:0.5px solid var(--border2);font-size:13px">
          <span style="color:var(--gray-lighter)">${i.products?.name} × ${i.quantity}</span>
          <span style="font-weight:600">${formatBRL(i.subtotal)}</span>
        </div>
      `).join('')}
      <div style="display:flex;justify-content:space-between;padding:10px 0;font-weight:800;font-size:15px">
        <span>Total</span><span style="color:var(--pink)">${formatBRL(o.total)}</span>
      </div>
    </div>

    <div class="form-group">
      <label>Atualizar status</label>
      <select id="select-status-pedido">
        ${['pending','paid','processing','shipped','delivered','cancelled'].map(s =>
          `<option value="${s}" ${o.status === s ? 'selected' : ''}>${statusLabel(s).replace(/<[^>]+>/g,'')}</option>`
        ).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Observação (opcional)</label>
      <input type="text" id="obs-pedido" value="${o.notes || ''}" placeholder="Ex: Código de rastreio"/>
    </div>
    <button class="btn btn-primary" onclick="salvarStatusPedido('${o.id}')">Salvar alterações</button>
  `);
}

async function salvarStatusPedido(id) {
  const status = document.getElementById('select-status-pedido').value;
  const notes  = document.getElementById('obs-pedido').value.trim();

  const { error } = await _supabase
    .from('orders')
    .update({ status, notes, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) { showToast('Erro ao atualizar pedido.', 'error'); return; }
  showToast('Pedido atualizado!', 'success');
  fecharModal();
  renderPedidos();
}

// ════════════════════════════════════════════
// PRODUTOS
// ════════════════════════════════════════════
async function renderProdutos() {
  const [{ data: produtos }, { data: cats }] = await Promise.all([
    _supabase.from('products').select('*, categories(name)').order('created_at', { ascending: false }),
    _supabase.from('categories').select('id, name').order('name'),
  ]);

  window._categorias = cats || [];

  document.getElementById('conteudo-principal').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <h2 style="font-size:20px;font-weight:800">Produtos</h2>
      <button class="btn btn-primary btn-sm" style="width:auto" onclick="abrirFormProduto()">+ Novo produto</button>
    </div>

    <div style="display:flex;flex-direction:column;gap:8px" id="lista-produtos">
      ${(produtos || []).map(p => `
        <div style="background:#111;border:0.5px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px;display:flex;align-items:center;gap:14px">
          <div style="width:52px;height:52px;border-radius:var(--radius-md);background:var(--black);border:0.5px solid var(--border);overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center">
            ${p.images?.[0]
              ? `<img src="${p.images[0]}" style="width:100%;height:100%;object-fit:cover"/>`
              : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`
            }
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600;color:var(--white)">${p.name}</div>
            <div style="font-size:11px;color:var(--gray);margin-top:2px">${p.categories?.name || 'Sem categoria'} · mín. ${p.min_quantity} un.</div>
          </div>
          <div style="font-size:14px;font-weight:800;color:var(--white);white-space:nowrap">${formatBRL(p.price)}</div>
          <span class="pill ${p.is_active ? 'pill-green' : 'pill-gray'}">${p.is_active ? 'Ativo' : 'Inativo'}</span>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm btn-outline" onclick="abrirFormProduto('${p.id}')">Editar</button>
            <button class="btn btn-sm btn-danger" onclick="toggleProduto('${p.id}', ${p.is_active})">${p.is_active ? 'Desativar' : 'Ativar'}</button>
          </div>
        </div>
      `).join('') || '<p style="color:var(--gray);font-size:13px">Nenhum produto cadastrado.</p>'}
    </div>
  `;
}

function abrirFormProduto(id) {
  const cats = window._categorias || [];
  const prod = id ? null : null; // carregado abaixo se edição

  const carregarEAbrir = async () => {
    let p = {};
    if (id) {
      const { data } = await _supabase.from('products').select('*').eq('id', id).single();
      p = data || {};
    }

    abrirModal(`
      <button onclick="fecharModal()" style="position:absolute;top:12px;right:12px;background:none;border:none;color:var(--gray);cursor:pointer;font-size:20px">✕</button>
      <h3 style="font-size:16px;font-weight:800;margin-bottom:16px">${id ? 'Editar produto' : 'Novo produto'}</h3>

      <div class="form-group">
        <label>Nome do produto *</label>
        <input type="text" id="prod-nome" value="${p.name || ''}" placeholder="Ex: Camiseta IRES"/>
      </div>
      <div class="form-group">
        <label>Descrição</label>
        <input type="text" id="prod-desc" value="${p.description || ''}" placeholder="Ex: 100% algodão · P M G GG"/>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Preço (R$) *</label>
          <input type="number" id="prod-preco" value="${p.price || ''}" placeholder="38.90" min="0" step="0.01"/>
        </div>
        <div class="form-group">
          <label>Qtd mínima *</label>
          <input type="number" id="prod-min" value="${p.min_quantity || 1}" min="1"/>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Estoque (opcional)</label>
          <input type="number" id="prod-estoque" value="${p.stock || ''}" placeholder="Deixe vazio = ilimitado"/>
        </div>
        <div class="form-group">
          <label>Categoria</label>
          <select id="prod-cat">
            <option value="">Sem categoria</option>
            ${cats.map(c => `<option value="${c.id}" ${p.category_id === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Imagem do produto</label>
        <div id="upload-area"
          onclick="document.getElementById('prod-img-file').click()"
          ondragover="event.preventDefault();this.style.borderColor='var(--pink)'"
          ondragleave="this.style.borderColor='var(--border)'"
          ondrop="handleImageDrop(event)"
          style="border:0.5px dashed var(--border);border-radius:var(--radius-md);padding:24px 16px;text-align:center;cursor:pointer;transition:border-color 0.2s;background:var(--black)">
          <div id="upload-preview">
            ${p.images?.[0]
              ? `<img src="${p.images[0]}" id="preview-img" style="max-height:100px;border-radius:var(--radius-md);margin-bottom:8px;display:block;margin-left:auto;margin-right:auto"/>`
              : `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gray)" stroke-width="1.5" style="margin-bottom:8px"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`
            }
            <div style="font-size:12px;color:var(--gray)" id="upload-label">
              ${p.images?.[0] ? 'Clique para trocar a imagem' : 'Clique ou arraste uma imagem'}
            </div>
          </div>
          <div id="upload-progress" style="display:none;margin-top:10px">
            <div style="height:3px;background:var(--border);border-radius:2px;overflow:hidden">
              <div id="upload-bar" style="height:100%;width:0%;background:var(--pink);transition:width 0.3s"></div>
            </div>
            <span style="font-size:11px;color:var(--gray);margin-top:4px;display:block">Enviando imagem...</span>
          </div>
        </div>
        <input type="file" id="prod-img-file" accept="image/*" style="display:none" onchange="uploadImagem(this.files[0])"/>
        <input type="hidden" id="prod-img-url" value="${p.images?.[0] || ''}"/>
      </div>
      <div style="display:flex;gap:10px;margin-top:4px">
        <button class="btn btn-outline" style="flex:1" onclick="fecharModal()">Cancelar</button>
        <button class="btn btn-primary" style="flex:1" id="btn-salvar-prod" onclick="salvarProduto(${id ? `'${id}'` : 'null'})">Salvar produto</button>
      </div>
    `);
  };

  carregarEAbrir();
}

async function salvarProduto(id) {
  const nome   = document.getElementById('prod-nome').value.trim();
  const desc   = document.getElementById('prod-desc').value.trim();
  const preco  = parseFloat(document.getElementById('prod-preco').value);
  const min    = parseInt(document.getElementById('prod-min').value);
  const estoque= document.getElementById('prod-estoque').value;
  const catId  = document.getElementById('prod-cat').value;
  const imgUrl = document.getElementById('prod-img-url').value.trim();

  if (!nome)        { showToast('Informe o nome do produto.', 'error'); return; }
  if (isNaN(preco)) { showToast('Informe o preço.', 'error'); return; }
  if (min < 1)      { showToast('Quantidade mínima deve ser pelo menos 1.', 'error'); return; }

  const payload = {
    name:         nome,
    description:  desc,
    price:        preco,
    min_quantity: min,
    stock:        estoque ? parseInt(estoque) : null,
    category_id:  catId || null,
    images:       imgUrl ? [imgUrl] : [],
  };

  const { error } = id
    ? await _supabase.from('products').update(payload).eq('id', id)
    : await _supabase.from('products').insert({ ...payload, is_active: true });

  if (error) { showToast('Erro ao salvar produto.', 'error'); return; }
  showToast(id ? 'Produto atualizado!' : 'Produto criado!', 'success');
  fecharModal();
  renderProdutos();
}

async function toggleProduto(id, ativo) {
  const { error } = await _supabase
    .from('products')
    .update({ is_active: !ativo })
    .eq('id', id);
  if (error) { showToast('Erro.', 'error'); return; }
  showToast(ativo ? 'Produto desativado.' : 'Produto ativado!', 'success');
  renderProdutos();
}

// ════════════════════════════════════════════
// EMBAIXADORAS
// ════════════════════════════════════════════
async function renderEmbaixadoras() {
  const { data } = await _supabase
    .from('profiles')
    .select('*')
    .eq('role', 'reseller')
    .order('created_at', { ascending: false });

  const statusCores = {
    pending:   'pill-amber',
    active:    'pill-green',
    suspended: 'pill-red',
  };
  const statusNomes = {
    pending:   'Pendente',
    active:    'Ativa',
    suspended: 'Suspensa',
  };

  document.getElementById('conteudo-principal').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <h2 style="font-size:20px;font-weight:800">Embaixadoras</h2>
      <span class="pill pill-gray">${data?.length || 0} cadastradas</span>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      ${['','pending','active','suspended'].map(s => `
        <div class="filter-pill ${!s ? 'active':''}" onclick="filtrarEmbs(this,'${s}')">
          ${!s ? 'Todas' : statusNomes[s]}
        </div>
      `).join('')}
    </div>

    <div style="display:flex;flex-direction:column;gap:8px" id="lista-embs">
      ${(data || []).map(e => embRow(e, statusCores, statusNomes)).join('')
        || '<p style="color:var(--gray);font-size:13px">Nenhuma embaixadora cadastrada.</p>'}
    </div>
  `;

  window._todasEmbs = data || [];
}

function embRow(e, statusCores, statusNomes) {
  return `
    <div class="order-row" data-status="${e.status}" style="cursor:default">
      <div class="avatar">${initials(e.full_name)}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600">${e.full_name || 'Sem nome'}</div>
        <div style="font-size:11px;color:var(--gray)">${e.phone || ''} · ${new Date(e.created_at).toLocaleDateString('pt-BR')}</div>
      </div>
      <span class="pill ${statusCores[e.status] || 'pill-gray'}">${statusNomes[e.status] || e.status}</span>
      <div style="display:flex;gap:6px">
        ${e.status === 'pending'   ? `<button class="btn btn-sm btn-primary" style="width:auto" onclick="aprovarEmb('${e.id}')">Aprovar</button>` : ''}
        ${e.status === 'active'    ? `<button class="btn btn-sm btn-danger"  onclick="suspenderEmb('${e.id}')">Suspender</button>` : ''}
        ${e.status === 'suspended' ? `<button class="btn btn-sm btn-outline" onclick="aprovarEmb('${e.id}')">Reativar</button>` : ''}
        ${e.status === 'pending'   ? `<button class="btn btn-sm btn-outline" onclick="reprovarEmb('${e.id}')">Reprovar</button>` : ''}
      </div>
    </div>
  `;
}

function filtrarEmbs(el, status) {
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  const statusCores = { pending:'pill-amber', active:'pill-green', suspended:'pill-red' };
  const statusNomes = { pending:'Pendente', active:'Ativa', suspended:'Suspensa' };
  const filtradas = status
    ? (window._todasEmbs || []).filter(e => e.status === status)
    : (window._todasEmbs || []);
  document.getElementById('lista-embs').innerHTML =
    filtradas.map(e => embRow(e, statusCores, statusNomes)).join('')
    || '<p style="color:var(--gray);font-size:13px">Nenhuma embaixadora.</p>';
}

async function aprovarEmb(id) {
  const { error } = await _supabase.from('profiles').update({ status: 'active' }).eq('id', id);
  if (error) { showToast('Erro ao aprovar.', 'error'); return; }
  showToast('Embaixadora aprovada!', 'success');
  if (paginaAtiva === 'dashboard') renderDashboard();
  else renderEmbaixadoras();
}

async function reprovarEmb(id) {
  const { error } = await _supabase.from('profiles').update({ status: 'suspended' }).eq('id', id);
  if (error) { showToast('Erro.', 'error'); return; }
  showToast('Embaixadora reprovada.', 'success');
  if (paginaAtiva === 'dashboard') renderDashboard();
  else renderEmbaixadoras();
}

async function suspenderEmb(id) {
  const { error } = await _supabase.from('profiles').update({ status: 'suspended' }).eq('id', id);
  if (error) { showToast('Erro.', 'error'); return; }
  showToast('Embaixadora suspensa.', 'success');
  renderEmbaixadoras();
}

// ════════════════════════════════════════════
// COMUNICADOS
// ════════════════════════════════════════════
async function renderComunicados() {
  const { data } = await _supabase
    .from('messages')
    .select('*, profiles(full_name)')
    .eq('is_broadcast', true)
    .order('created_at', { ascending: false });

  document.getElementById('conteudo-principal').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <h2 style="font-size:20px;font-weight:800">Comunicados</h2>
      <button class="btn btn-primary btn-sm" style="width:auto" onclick="abrirFormComunicado()">+ Novo comunicado</button>
    </div>

    <div style="display:flex;flex-direction:column;gap:10px">
      ${(data || []).map(m => `
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <div style="font-size:14px;font-weight:700">${m.subject || 'Sem título'}</div>
            <div style="font-size:11px;color:var(--gray)">${new Date(m.created_at).toLocaleDateString('pt-BR')}</div>
          </div>
          <p style="font-size:13px;color:var(--gray-lighter);line-height:1.6">${m.body}</p>
          <div style="margin-top:10px"><span class="pill pill-pink">Broadcast</span></div>
        </div>
      `).join('') || '<p style="color:var(--gray);font-size:13px">Nenhum comunicado enviado.</p>'}
    </div>
  `;
}

function abrirFormComunicado() {
  abrirModal(`
    <button onclick="fecharModal()" style="position:absolute;top:12px;right:12px;background:none;border:none;color:var(--gray);cursor:pointer;font-size:20px">✕</button>
    <h3 style="font-size:16px;font-weight:800;margin-bottom:16px">Novo comunicado</h3>
    <div class="form-group">
      <label>Título</label>
      <input type="text" id="com-titulo" placeholder="Ex: Novidade na coleção!"/>
    </div>
    <div class="form-group">
      <label>Mensagem *</label>
      <textarea id="com-corpo" rows="5" placeholder="Escreva o comunicado para todas as embaixadoras..." style="resize:vertical"></textarea>
    </div>
    <div class="info-box">
      <div class="info-box-dot"></div>
      <p>Este comunicado será enviado para <strong>todas as embaixadoras ativas</strong>.</p>
    </div>
    <div style="display:flex;gap:10px">
      <button class="btn btn-outline" style="flex:1" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-primary" style="flex:1" onclick="enviarComunicado()">Enviar</button>
    </div>
  `);
}

async function enviarComunicado() {
  const subject = document.getElementById('com-titulo').value.trim();
  const body    = document.getElementById('com-corpo').value.trim();
  if (!body) { showToast('Escreva a mensagem.', 'error'); return; }

  const { data: { session } } = await _supabase.auth.getSession();

  const { error } = await _supabase.from('messages').insert({
    sender_id:    session.user.id,
    recipient_id: null,
    subject,
    body,
    is_broadcast: true,
  });

  if (error) { showToast('Erro ao enviar.', 'error'); return; }
  showToast('Comunicado enviado!', 'success');
  fecharModal();
  renderComunicados();
}

// ════════════════════════════════════════════
// HELPERS MODAL
// ════════════════════════════════════════════
function abrirModal(html) {
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function fecharModal() {
  document.getElementById('modal').style.display = 'none';
  document.body.style.overflow = '';
}

document.getElementById('modal').addEventListener('click', function(e) {
  if (e.target === this) fecharModal();
});

// ════════════════════════════════════════════
// UPLOAD DE IMAGEM — Supabase Storage
// ════════════════════════════════════════════
async function uploadImagem(file) {
  if (!file) return;

  // validações
  if (!file.type.startsWith('image/')) {
    showToast('Selecione apenas imagens.', 'error'); return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast('Imagem deve ter no máximo 5MB.', 'error'); return;
  }

  // mostra progresso
  document.getElementById('upload-progress').style.display = 'block';
  document.getElementById('upload-bar').style.width = '30%';
  document.getElementById('btn-salvar-prod').disabled = true;

  // preview imediato
  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById('upload-preview');
    const existing = document.getElementById('preview-img');
    if (existing) existing.remove();
    const img = document.createElement('img');
    img.id = 'preview-img';
    img.src = e.target.result;
    img.style.cssText = 'max-height:100px;border-radius:8px;margin-bottom:8px;display:block;margin-left:auto;margin-right:auto';
    preview.insertBefore(img, preview.firstChild);
  };
  reader.readAsDataURL(file);

  // gera nome único
  const ext      = file.name.split('.').pop();
  const fileName = `produto_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  document.getElementById('upload-bar').style.width = '60%';

  // faz upload
  const { data, error } = await _supabase.storage
    .from('produtos')
    .upload(fileName, file, { cacheControl: '3600', upsert: false });

  if (error) {
    showToast('Erro no upload: ' + error.message, 'error');
    document.getElementById('upload-progress').style.display = 'none';
    document.getElementById('btn-salvar-prod').disabled = false;
    return;
  }

  document.getElementById('upload-bar').style.width = '100%';

  // pega URL pública
  const { data: { publicUrl } } = _supabase.storage
    .from('produtos')
    .getPublicUrl(fileName);

  // salva URL no campo hidden
  document.getElementById('prod-img-url').value = publicUrl;
  document.getElementById('upload-label').textContent = 'Imagem pronta!';
  document.getElementById('upload-label').style.color = 'var(--green)';

  setTimeout(() => {
    document.getElementById('upload-progress').style.display = 'none';
    document.getElementById('btn-salvar-prod').disabled = false;
  }, 600);

  showToast('Imagem enviada!', 'success');
}

function handleImageDrop(event) {
  event.preventDefault();
  event.currentTarget.style.borderColor = 'var(--border)';
  const file = event.dataTransfer.files[0];
  if (file) uploadImagem(file);
}

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
  document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
  const nav = document.getElementById(`nav-${pagina}`);
  if (nav) nav.classList.add('active');

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
  };
  (acoes[pagina] || renderDashboard)();
}

// ════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════
async function renderDashboard() {
  const [{ count: totalEmb }, { data: pedidosHoje }, { data: pendentes }, { data: ultimosPedidos }] = await Promise.all([
    _supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status','active').eq('role','reseller'),
    _supabase.from('orders').select('total,status').gte('created_at', new Date().toISOString().slice(0,10)),
    _supabase.from('profiles').select('id,full_name,created_at').eq('status','pending').eq('role','reseller').limit(5),
    _supabase.from('orders').select('id, total, status, created_at, profiles(full_name)').order('created_at', { ascending: false }).limit(6),
  ]);

  // só conta pedidos pagos ou entregues
  const pedidosPagosHoje    = (pedidosHoje||[]).filter(o => ['paid','delivered'].includes(o.status));
  const faturamentoHoje     = pedidosPagosHoje.reduce((a,o) => a + Number(o.total), 0);
  const pedidosPendentesHj  = (pedidosHoje||[]).filter(o => o.status === 'pending').length;

  document.getElementById('conteudo-principal').innerHTML = `
    <div style="margin-bottom:20px">
      <h2 style="font-size:20px;font-weight:800">Dashboard</h2>
      <p style="font-size:13px;color:var(--gray);margin-top:2px">Visão geral da plataforma</p>
    </div>

    <div class="metrics-grid">
      <div class="metric-card" style="border-top-color:var(--pink)">
        <div class="metric-value">${pedidosPagosHoje.length}</div>
        <div class="metric-label">Pedidos pagos hoje</div>
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
        <div class="metric-value">${pedidosPendentesHj}</div>
        <div class="metric-label">Pagamentos pendentes</div>
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
    <div style="background:#111;border:0.5px solid var(--border);border-radius:var(--radius-lg);padding:14px;cursor:pointer" onclick="abrirPedido('${o.id}')" data-status="${o.status}">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div style="display:flex;align-items:center;gap:8px">
          <span class="order-id">#${o.id.slice(-4).toUpperCase()}</span>
          ${statusLabel(o.status)}
        </div>
        <span style="font-size:14px;font-weight:800;color:var(--white)">${formatBRL(o.total)}</span>
      </div>
      <div style="font-size:11px;color:var(--gray)">${o.profiles?.full_name || 'Embaixadora'} · ${new Date(o.created_at).toLocaleDateString('pt-BR')}</div>
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
        <div style="background:#111;border:0.5px solid var(--border);border-radius:var(--radius-lg);padding:14px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
            <div style="width:52px;height:52px;border-radius:var(--radius-md);background:var(--black);border:0.5px solid var(--border);overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center">
              ${p.images?.[0]
                ? `<img src="${p.images[0]}" style="width:100%;height:100%;object-fit:cover"/>`
                : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`
              }
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;color:var(--white)">${p.name}</div>
              <div style="font-size:11px;color:var(--gray);margin-top:2px">${p.categories?.name || 'Sem categoria'}</div>
            </div>
            <span class="pill ${p.is_active ? 'pill-green' : 'pill-gray'}">${p.is_active ? 'Ativo' : 'Inativo'}</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font-size:14px;font-weight:800;color:var(--white)">${formatBRL(p.price)}</div>
              <div style="font-size:10px;color:var(--gray)">mín. ${p.min_quantity} un.</div>
            </div>
            <div style="display:flex;gap:6px">
              <button class="btn btn-sm btn-outline" onclick="abrirFormProduto('${p.id}')">Editar</button>
              <button class="btn btn-sm btn-danger" onclick="toggleProduto('${p.id}', ${p.is_active})">${p.is_active ? 'Desativar' : 'Ativar'}</button>
            </div>
          </div>
        </div>
      `).join('') || '<p style="color:var(--gray);font-size:13px">Nenhum produto cadastrado.</p>'}
    </div>
  `;
}

function abrirFormProduto(id) {
  const cats = window._categorias || [];

  const carregarEAbrir = async () => {
    let p = {};
    if (id) {
      const { data } = await _supabase.from('products').select('*').eq('id', id).single();
      p = data || {};
    }

    // imagens existentes
    window._prodImagens = Array.isArray(p.images) ? [...p.images] : [];

    const fotos = window._prodImagens.map((url, i) => `
      <div id="foto-${i}" style="position:relative;width:72px;height:72px;flex-shrink:0">
        <img src="${url}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:0.5px solid var(--border)"/>
        <button onclick="removerFoto(${i})" style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:var(--red);border:none;color:#fff;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1">✕</button>
      </div>
    `).join('');

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
        <label>Fotos do produto (até 6)</label>
        <div id="fotos-grid" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">
          ${fotos}
          <div id="btn-add-foto"
            onclick="document.getElementById('prod-img-file').click()"
            style="width:72px;height:72px;border:0.5px dashed var(--border);border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;background:var(--black);flex-shrink:0;transition:border-color 0.2s"
            onmouseover="this.style.borderColor='var(--pink)'"
            onmouseout="this.style.borderColor='var(--border)'">
            <span style="font-size:24px;color:var(--gray);line-height:1">+</span>
            <span style="font-size:9px;color:var(--gray);margin-top:2px">Adicionar</span>
          </div>
        </div>
        <div id="upload-progress" style="display:none">
          <div style="height:3px;background:var(--border);border-radius:2px;overflow:hidden">
            <div id="upload-bar" style="height:100%;width:0%;background:var(--pink);transition:width 0.3s"></div>
          </div>
          <span style="font-size:11px;color:var(--gray);margin-top:4px;display:block" id="upload-label">Enviando...</span>
        </div>
        <input type="file" id="prod-img-file" accept="image/*" multiple style="display:none" onchange="uploadMultiplas(this.files)"/>
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
  const imgUrl = (window._prodImagens || []).length > 0 ? window._prodImagens[0] : '';

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
    images:       window._prodImagens || [],
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
    <div style="background:#111;border:0.5px solid var(--border);border-radius:var(--radius-lg);padding:14px;" data-status="${e.status}">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;cursor:pointer" onclick="abrirDetalhesEmb('${e.id}')">
        <div class="avatar">${initials(e.full_name)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.full_name || 'Sem nome'}</div>
          <div style="font-size:11px;color:var(--gray);margin-top:1px">${e.phone || ''} · ${new Date(e.created_at).toLocaleDateString('pt-BR')}</div>
        </div>
        <span class="pill ${statusCores[e.status] || 'pill-gray'}">${statusNomes[e.status] || e.status}</span>
      </div>
      <div style="display:flex;gap:6px;justify-content:flex-end">
        ${e.status === 'pending'   ? `<button class="btn btn-sm btn-primary" style="width:auto" onclick="aprovarEmb('${e.id}')">Aprovar</button>` : ''}
        ${e.status === 'active'    ? `<button class="btn btn-sm btn-danger" onclick="suspenderEmb('${e.id}')">Suspender</button>` : ''}
        ${e.status === 'suspended' ? `<button class="btn btn-sm btn-outline" onclick="aprovarEmb('${e.id}')">Reativar</button>` : ''}
        ${e.status === 'pending'   ? `<button class="btn btn-sm btn-outline" onclick="reprovarEmb('${e.id}')">Reprovar</button>` : ''}
      </div>
    </div>
  `;
}

async function abrirDetalhesEmb(id) {
  const [{ data: e }, { data: pedidos }] = await Promise.all([
    _supabase.from('profiles').select('*').eq('id', id).single(),
    _supabase.from('orders').select('id,total,status,created_at').eq('reseller_id', id).order('created_at', { ascending: false }).limit(5),
  ]);

  if (!e) return;

  const totalGasto = (pedidos || []).reduce((a, o) => a + Number(o.total), 0);

  const statusCores = { pending:'pill-amber', active:'pill-green', suspended:'pill-red' };
  const statusNomes = { pending:'Pendente', active:'Ativa', suspended:'Suspensa' };

  abrirModal(`
    <button onclick="fecharModal()" style="position:absolute;top:12px;right:12px;background:none;border:none;color:var(--gray);cursor:pointer;font-size:20px">✕</button>

    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
      <div class="avatar" style="width:52px;height:52px;font-size:18px">${initials(e.full_name)}</div>
      <div>
        <div style="font-size:16px;font-weight:800">${e.full_name || 'Sem nome'}</div>
        <span class="pill ${statusCores[e.status] || 'pill-gray'}">${statusNomes[e.status] || e.status}</span>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
      <div style="background:var(--black);border:0.5px solid var(--border);border-radius:var(--radius-md);padding:12px">
        <div style="font-size:11px;color:var(--gray);margin-bottom:4px">WhatsApp</div>
        <div style="font-size:13px;font-weight:600">${e.phone || '—'}</div>
      </div>
      <div style="background:var(--black);border:0.5px solid var(--border);border-radius:var(--radius-md);padding:12px">
        <div style="font-size:11px;color:var(--gray);margin-bottom:4px">CPF</div>
        <div style="font-size:13px;font-weight:600">${e.cpf || '—'}</div>
      </div>
      <div style="background:var(--black);border:0.5px solid var(--border);border-radius:var(--radius-md);padding:12px">
        <div style="font-size:11px;color:var(--gray);margin-bottom:4px">Como nos encontrou</div>
        <div style="font-size:13px;font-weight:600">${e.how_found || '—'}</div>
      </div>
      <div style="background:var(--black);border:0.5px solid var(--border);border-radius:var(--radius-md);padding:12px">
        <div style="font-size:11px;color:var(--gray);margin-bottom:4px">Cadastro</div>
        <div style="font-size:13px;font-weight:600">${new Date(e.created_at).toLocaleDateString('pt-BR')}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
      <div style="background:var(--black);border:0.5px solid var(--border);border-top:2px solid var(--pink);border-radius:var(--radius-md);padding:12px">
        <div style="font-size:20px;font-weight:900">${(pedidos||[]).length}</div>
        <div style="font-size:11px;color:var(--gray)">Pedidos feitos</div>
      </div>
      <div style="background:var(--black);border:0.5px solid var(--border);border-top:2px solid var(--pink);border-radius:var(--radius-md);padding:12px">
        <div style="font-size:20px;font-weight:900">${formatBRL(totalGasto)}</div>
        <div style="font-size:11px;color:var(--gray)">Total comprado</div>
      </div>
    </div>

    ${(pedidos||[]).length ? `
      <div style="font-size:11px;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px">Últimos pedidos</div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px">
        ${pedidos.map(o => `
          <div style="display:flex;align-items:center;justify-content:space-between;background:var(--black);border:0.5px solid var(--border);border-radius:var(--radius-md);padding:10px 12px">
            <div>
              <div style="font-size:12px;font-weight:700">#${o.id.slice(-6).toUpperCase()}</div>
              <div style="font-size:10px;color:var(--gray)">${new Date(o.created_at).toLocaleDateString('pt-BR')}</div>
            </div>
            <div style="font-size:13px;font-weight:800">${formatBRL(o.total)}</div>
            ${statusLabel(o.status)}
          </div>
        `).join('')}
      </div>
    ` : ''}

    <div style="display:flex;gap:8px">
      ${e.status === 'pending'   ? `<button class="btn btn-primary btn-sm" style="flex:1" onclick="aprovarEmb('${e.id}');fecharModal()">Aprovar</button>` : ''}
      ${e.status === 'active'    ? `<button class="btn btn-danger btn-sm" style="flex:1" onclick="suspenderEmb('${e.id}');fecharModal()">Suspender</button>` : ''}
      ${e.status === 'suspended' ? `<button class="btn btn-outline btn-sm" style="flex:1" onclick="aprovarEmb('${e.id}');fecharModal()">Reativar</button>` : ''}
      <button class="btn btn-outline btn-sm" style="flex:1" onclick="fecharModal()">Fechar</button>
    </div>
  `);
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
// UPLOAD MÚLTIPLO — até 6 fotos com cropper
// ════════════════════════════════════════════
let _cropperInstance = null;
let _arquivosPendentes = [];

async function uploadMultiplas(files) {
  if (!files || !files.length) return;
  const imgs = window._prodImagens || [];
  if (imgs.length >= 6) { showToast('Máximo de 6 fotos atingido.', 'error'); return; }

  _arquivosPendentes = Array.from(files)
    .filter(f => f.type.startsWith('image/'))
    .slice(0, 6 - imgs.length);

  if (!_arquivosPendentes.length) return;
  abrirCropper(_arquivosPendentes.shift());
}

function abrirCropper(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    let mc = document.getElementById('modal-cropper');
    if (!mc) {
      mc = document.createElement('div');
      mc.id = 'modal-cropper';
      mc.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
      document.body.appendChild(mc);
    }

    mc.innerHTML = `
      <div style="background:#161616;border:0.5px solid #2a2a2a;border-radius:16px;padding:20px;width:100%;max-width:520px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div>
            <div style="font-size:15px;font-weight:700;color:#fff">Recortar imagem</div>
            <div style="font-size:11px;color:#666;margin-top:2px">Tamanho ideal: <strong style="color:#f03faa">800 × 800px</strong> · recorte quadrado</div>
          </div>
          <button onclick="fecharCropper()" style="background:none;border:none;color:#666;cursor:pointer;font-size:20px">✕</button>
        </div>
        <div style="max-height:360px;overflow:hidden;border-radius:8px;background:#0d0d0d;margin-bottom:14px">
          <img id="cropper-img" src="${e.target.result}" style="max-width:100%;display:block"/>
        </div>
        <div style="display:flex;gap:8px">
          <button onclick="pularCrop()" style="flex:1;padding:10px;background:transparent;border:0.5px solid #2a2a2a;border-radius:8px;color:#999;font-size:13px;cursor:pointer">Usar original</button>
          <button onclick="confirmarCrop()" style="flex:1;padding:10px;background:#f03faa;border:none;border-radius:8px;color:#fff;font-size:13px;font-weight:700;cursor:pointer">Recortar e usar ✓</button>
        </div>
      </div>
    `;
    mc.style.display = 'flex';

    if (_cropperInstance) { _cropperInstance.destroy(); _cropperInstance = null; }
    const imgEl = document.getElementById('cropper-img');
    _cropperInstance = new Cropper(imgEl, {
      aspectRatio: 1,
      viewMode: 1,
      dragMode: 'move',
      autoCropArea: 0.9,
      background: false,
      guides: true,
    });

    window._arquivoAtual = file;
  };
  reader.readAsDataURL(file);
}

function fecharCropper() {
  const mc = document.getElementById('modal-cropper');
  if (mc) mc.style.display = 'none';
  if (_cropperInstance) { _cropperInstance.destroy(); _cropperInstance = null; }
  _arquivosPendentes = [];
}

async function confirmarCrop() {
  if (!_cropperInstance) return;
  const canvas = _cropperInstance.getCroppedCanvas({ width: 800, height: 800 });
  canvas.toBlob(async (blob) => {
    const file = new File([blob], `crop_${Date.now()}.jpg`, { type: 'image/jpeg' });
    fecharCropper();
    await uploadUmaImagem(file);
    if (_arquivosPendentes.length) abrirCropper(_arquivosPendentes.shift());
  }, 'image/jpeg', 0.9);
}

async function pularCrop() {
  const file = window._arquivoAtual;
  fecharCropper();
  if (file) await uploadUmaImagem(file);
  if (_arquivosPendentes.length) abrirCropper(_arquivosPendentes.shift());
}

async function uploadUmaImagem(file) {
  document.getElementById('upload-progress').style.display = 'block';
  document.getElementById('upload-bar').style.width = '40%';
  document.getElementById('upload-label').textContent = `Enviando ${file.name}...`;
  document.getElementById('btn-salvar-prod').disabled = true;

  const ext      = file.name.split('.').pop();
  const fileName = `produto_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await _supabase.storage
    .from('produtos')
    .upload(fileName, file, { cacheControl: '3600', upsert: false });

  if (error) {
    showToast('Erro no upload: ' + error.message, 'error');
    document.getElementById('upload-progress').style.display = 'none';
    document.getElementById('btn-salvar-prod').disabled = false;
    return;
  }

  document.getElementById('upload-bar').style.width = '100%';

  const { data: { publicUrl } } = _supabase.storage.from('produtos').getPublicUrl(fileName);

  window._prodImagens = window._prodImagens || [];
  window._prodImagens.push(publicUrl);

  // adiciona thumbnail no grid
  const idx  = window._prodImagens.length - 1;
  const grid = document.getElementById('fotos-grid');
  const btn  = document.getElementById('btn-add-foto');
  const div  = document.createElement('div');
  div.id = `foto-${idx}`;
  div.style.cssText = 'position:relative;width:72px;height:72px;flex-shrink:0';
  div.innerHTML = `
    <img src="${publicUrl}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:0.5px solid var(--border)"/>
    <button onclick="removerFoto(${idx})" style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:var(--red);border:none;color:#fff;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
  `;
  grid.insertBefore(div, btn);

  setTimeout(() => {
    document.getElementById('upload-progress').style.display = 'none';
    document.getElementById('btn-salvar-prod').disabled = false;
  }, 500);
}

function removerFoto(idx) {
  window._prodImagens = (window._prodImagens || []).filter((_, i) => i !== idx);
  // re-renderiza thumbnails
  const grid = document.getElementById('fotos-grid');
  const btn  = document.getElementById('btn-add-foto');
  // remove todos exceto o botão
  Array.from(grid.children).forEach(el => { if (el.id !== 'btn-add-foto') el.remove(); });
  // recria
  window._prodImagens.forEach((url, i) => {
    const div = document.createElement('div');
    div.id = `foto-${i}`;
    div.style.cssText = 'position:relative;width:72px;height:72px;flex-shrink:0';
    div.innerHTML = `
      <img src="${url}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:0.5px solid var(--border)"/>
      <button onclick="removerFoto(${i})" style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:var(--red);border:none;color:#fff;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
    `;
    grid.insertBefore(div, btn);
  });
  btn.style.display = 'flex';
}

function handleImageDrop(event) {
  event.preventDefault();
  uploadMultiplas(event.dataTransfer.files);
}

// ════════════════════════════════════════════
// CATEGORIAS
// ════════════════════════════════════════════
async function renderCategorias() {
  const { data } = await _supabase.from('categories').select('*').order('name');

  document.getElementById('conteudo-principal').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <h2 style="font-size:20px;font-weight:800">Categorias</h2>
      <button class="btn btn-primary btn-sm" style="width:auto" onclick="abrirFormCategoria()">+ Nova categoria</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px" id="lista-cats">
      ${(data || []).map(c => `
        <div style="background:#111;border:0.5px solid var(--border);border-radius:var(--radius-lg);padding:12px 16px;display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:13px;font-weight:600">${c.name}</span>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm btn-outline" onclick="abrirFormCategoria('${c.id}','${c.name}')">Editar</button>
            <button class="btn btn-sm btn-danger" onclick="deletarCategoria('${c.id}')">Excluir</button>
          </div>
        </div>
      `).join('') || '<p style="color:var(--gray);font-size:13px">Nenhuma categoria ainda.</p>'}
    </div>
  `;
}

function abrirFormCategoria(id, nome) {
  abrirModal(`
    <button onclick="fecharModal()" style="position:absolute;top:12px;right:12px;background:none;border:none;color:var(--gray);cursor:pointer;font-size:20px">✕</button>
    <h3 style="font-size:16px;font-weight:800;margin-bottom:16px">${id ? 'Editar categoria' : 'Nova categoria'}</h3>
    <div class="form-group">
      <label>Nome *</label>
      <input type="text" id="cat-nome" value="${nome || ''}" placeholder="Ex: Roupas"/>
    </div>
    <div style="display:flex;gap:10px;margin-top:4px">
      <button class="btn btn-outline" style="flex:1" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-primary" style="flex:1" onclick="salvarCategoria(${id ? `'${id}'` : 'null'})">Salvar</button>
    </div>
  `);
}

async function salvarCategoria(id) {
  const nome = document.getElementById('cat-nome').value.trim();
  if (!nome) { showToast('Informe o nome.', 'error'); return; }

  const slug = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');

  const { error } = id
    ? await _supabase.from('categories').update({ name: nome, slug }).eq('id', id)
    : await _supabase.from('categories').insert({ name: nome, slug });

  if (error) { showToast('Erro: ' + error.message, 'error'); return; }
  showToast(id ? 'Categoria atualizada!' : 'Categoria criada!', 'success');
  fecharModal();
  renderCategorias();

  // atualiza cache de categorias
  const { data } = await _supabase.from('categories').select('id,name').order('name');
  window._categorias = data || [];
}

async function deletarCategoria(id) {
  if (!confirm('Excluir esta categoria? Os produtos ficarão sem categoria.')) return;
  const { error } = await _supabase.from('categories').delete().eq('id', id);
  if (error) { showToast('Erro ao excluir.', 'error'); return; }
  showToast('Categoria excluída.', 'success');
  renderCategorias();
}

// ════════════════════════════════════════════
// DEPOIMENTOS — Admin
// ════════════════════════════════════════════
async function renderDepoimentosAdmin() {
  const { data } = await _supabase
    .from('testimonials')
    .select('*, profiles(full_name)')
    .order('created_at', { ascending: false });

  const pendentes  = (data||[]).filter(t => t.status === 'pending');
  const aprovados  = (data||[]).filter(t => t.status === 'approved');
  const rejeitados = (data||[]).filter(t => t.status === 'rejected');

  document.getElementById('conteudo-principal').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <h2 style="font-size:20px;font-weight:800">Depoimentos</h2>
      <div style="display:flex;gap:8px">
        <span class="pill pill-amber">${pendentes.length} pendentes</span>
        <span class="pill pill-green">${aprovados.length} aprovados</span>
      </div>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <div class="filter-pill active" onclick="filtrarDeps(this,'all')">Todos</div>
      <div class="filter-pill" onclick="filtrarDeps(this,'pending')">Pendentes</div>
      <div class="filter-pill" onclick="filtrarDeps(this,'approved')">Aprovados</div>
      <div class="filter-pill" onclick="filtrarDeps(this,'rejected')">Rejeitados</div>
    </div>

    <div style="display:flex;flex-direction:column;gap:12px" id="lista-deps">
      ${(data||[]).map(t => depAdminCard(t)).join('')
        || '<p style="color:var(--gray);font-size:13px">Nenhum depoimento ainda.</p>'}
    </div>
  `;
  window._todosDepos = data || [];
}

function depAdminCard(t) {
  const nome = t.profiles?.full_name || 'Embaixadora';
  const ini  = nome.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  const stMap = { pending:{label:'Pendente',cls:'pill-amber'}, approved:{label:'Aprovado',cls:'pill-green'}, rejected:{label:'Rejeitado',cls:'pill-red'} };
  const st = stMap[t.status] || stMap.pending;

  return `
    <div class="card" data-status="${t.status}">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <div class="avatar">${ini}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600">${nome}</div>
          <div style="font-size:11px;color:var(--gray)">${new Date(t.created_at).toLocaleDateString('pt-BR')}</div>
        </div>
        <span class="pill ${st.cls}">${st.label}</span>
      </div>
      ${t.image_url ? `
        <div onclick="abrirLightboxAdmin('${t.image_url}')"
          style="border-radius:var(--radius-md);overflow:hidden;margin-bottom:10px;height:160px;cursor:zoom-in;position:relative;background:var(--black)">
          <img src="${t.image_url}" style="width:100%;height:100%;object-fit:cover;display:block"/>
          <div style="position:absolute;bottom:6px;right:6px;background:rgba(0,0,0,0.6);border-radius:6px;padding:3px 8px;font-size:10px;color:#fff">Ampliar</div>
        </div>
      ` : ''}
      <p style="font-size:13px;color:var(--gray-lighter);line-height:1.7;margin-bottom:12px">${t.body}</p>
      ${t.status === 'pending' ? `
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary btn-sm" style="flex:1" onclick="aprovarDep('${t.id}')">Aprovar</button>
          <button class="btn btn-danger btn-sm" style="flex:1" onclick="rejeitarDep('${t.id}')">Rejeitar</button>
        </div>
      ` : t.status === 'approved' ? `
        <button class="btn btn-outline btn-sm" onclick="rejeitarDep('${t.id}')">Remover aprovação</button>
      ` : `
        <button class="btn btn-outline btn-sm" onclick="aprovarDep('${t.id}')">Aprovar</button>
      `}
    </div>
  `;
}

function filtrarDeps(el, status) {
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  const lista = status === 'all' ? window._todosDepos : (window._todosDepos||[]).filter(t => t.status === status);
  document.getElementById('lista-deps').innerHTML =
    lista.map(t => depAdminCard(t)).join('') || '<p style="color:var(--gray);font-size:13px">Nenhum depoimento.</p>';
}

async function aprovarDep(id) {
  const { error } = await _supabase.from('testimonials').update({ status:'approved' }).eq('id', id);
  if (error) { showToast('Erro.','error'); return; }
  showToast('Depoimento aprovado!','success');
  renderDepoimentosAdmin();
}

async function rejeitarDep(id) {
  const { error } = await _supabase.from('testimonials').update({ status:'rejected' }).eq('id', id);
  if (error) { showToast('Erro.','error'); return; }
  showToast('Depoimento rejeitado.','success');
  renderDepoimentosAdmin();
}

// ════════════════════════════════════════════
// SUPORTE — Admin
// ════════════════════════════════════════════
async function renderSuporteAdmin() {
  const { data } = await _supabase
    .from('support_messages')
    .select('*, profiles(full_name)')
    .order('created_at', { ascending: false });

  const abertos = (data||[]).filter(m => m.status === 'open');

  document.getElementById('conteudo-principal').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <h2 style="font-size:20px;font-weight:800">Suporte</h2>
      <span class="pill pill-amber">${abertos.length} em aberto</span>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <div class="filter-pill active" onclick="filtrarSup(this,'all')">Todos</div>
      <div class="filter-pill" onclick="filtrarSup(this,'open')">Em aberto</div>
      <div class="filter-pill" onclick="filtrarSup(this,'answered')">Respondidos</div>
      <div class="filter-pill" onclick="filtrarSup(this,'closed')">Encerrados</div>
    </div>

    <div style="display:flex;flex-direction:column;gap:10px" id="lista-sup">
      ${(data||[]).map(m => supAdminCard(m)).join('')
        || '<p style="color:var(--gray);font-size:13px">Nenhuma mensagem de suporte.</p>'}
    </div>
  `;
  window._todosSup = data || [];
}

function supAdminCard(m) {
  const nome = m.profiles?.full_name || 'Embaixadora';
  const stMap = { open:{label:'Em aberto',cls:'pill-amber'}, answered:{label:'Respondido',cls:'pill-green'}, closed:{label:'Encerrado',cls:'pill-gray'} };
  const st = stMap[m.status] || stMap.open;

  return `
    <div class="card" data-status="${m.status}">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px">
        <div>
          <div style="font-size:13px;font-weight:700">${m.subject}</div>
          <div style="font-size:11px;color:var(--gray);margin-top:2px">${nome} · ${new Date(m.created_at).toLocaleDateString('pt-BR')}</div>
        </div>
        <span class="pill ${st.cls}" style="flex-shrink:0">${st.label}</span>
      </div>
      <p style="font-size:13px;color:var(--gray-lighter);line-height:1.7;margin-bottom:12px">${m.body}</p>
      ${m.reply ? `
        <div style="background:var(--black);border:0.5px solid var(--pink-deep);border-radius:var(--radius-md);padding:12px;margin-bottom:12px">
          <div style="font-size:10px;font-weight:700;color:var(--pink);text-transform:uppercase;letter-spacing:1px;margin-bottom:5px">Sua resposta</div>
          <p style="font-size:12px;color:var(--gray-lighter);line-height:1.6">${m.reply}</p>
        </div>
      ` : ''}
      <div style="display:flex;gap:8px">
        ${m.status !== 'closed' ? `<button class="btn btn-primary btn-sm" style="flex:1" onclick="abrirRespostaSuporteAdmin('${m.id}')">
          ${m.status === 'answered' ? 'Editar resposta' : 'Responder'}
        </button>` : ''}
        ${m.status !== 'closed' ? `<button class="btn btn-outline btn-sm" onclick="encerrarSuporteAdmin('${m.id}')">Encerrar</button>` : ''}
      </div>
    </div>
  `;
}

function filtrarSup(el, status) {
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  const lista = status === 'all' ? window._todosSup : (window._todosSup||[]).filter(m => m.status === status);
  document.getElementById('lista-sup').innerHTML =
    lista.map(m => supAdminCard(m)).join('') || '<p style="color:var(--gray);font-size:13px">Nenhuma mensagem.</p>';
}

function abrirRespostaSuporteAdmin(id) {
  const m = (window._todosSup||[]).find(x => x.id === id);
  if (!m) return;
  abrirModal(`
    <button onclick="fecharModal()" style="position:absolute;top:12px;right:12px;background:none;border:none;color:var(--gray);cursor:pointer;font-size:20px">✕</button>
    <h3 style="font-size:16px;font-weight:800;margin-bottom:6px">Responder suporte</h3>
    <div style="background:var(--black);border:0.5px solid var(--border);border-radius:var(--radius-md);padding:12px;margin-bottom:16px">
      <div style="font-size:11px;color:var(--gray);margin-bottom:4px">${m.profiles?.full_name} perguntou:</div>
      <p style="font-size:13px;color:var(--gray-lighter);line-height:1.6">${m.body}</p>
    </div>
    <div class="form-group">
      <label>Sua resposta *</label>
      <textarea id="sup-reply" rows="5" style="resize:vertical" placeholder="Escreva a resposta...">${m.reply || ''}</textarea>
    </div>
    <div style="display:flex;gap:10px">
      <button class="btn btn-outline" style="flex:1" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-primary" style="flex:1" id="btn-reply" onclick="enviarRespostaSuporteAdmin('${m.id}')">Enviar resposta</button>
    </div>
  `);
}

async function enviarRespostaSuporteAdmin(id) {
  const reply = document.getElementById('sup-reply').value.trim();
  if (!reply) { showToast('Escreva a resposta.','error'); return; }

  const btn = document.getElementById('btn-reply');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="margin:0 auto"></div>';

  const { error } = await _supabase.from('support_messages').update({
    reply,
    status: 'answered',
    replied_at: new Date().toISOString(),
  }).eq('id', id);

  if (error) { showToast('Erro ao responder.','error'); btn.disabled=false; btn.textContent='Enviar resposta'; return; }
  showToast('Resposta enviada!','success');
  fecharModal();
  renderSuporteAdmin();
}

async function encerrarSuporteAdmin(id) {
  const { error } = await _supabase.from('support_messages').update({ status:'closed' }).eq('id', id);
  if (error) { showToast('Erro.','error'); return; }
  showToast('Conversa encerrada.','success');
  renderSuporteAdmin();
}

function abrirLightboxAdmin(url) {
  let lb = document.getElementById('lightbox-admin');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'lightbox-admin';
    lb.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;cursor:zoom-out';
    document.body.appendChild(lb);
  }
  lb.innerHTML = `
    <div style="position:relative;max-width:90vw;max-height:90vh">
      <img src="${url}" style="max-width:100%;max-height:90vh;border-radius:12px;display:block;object-fit:contain"/>
      <button onclick="document.getElementById('lightbox-admin').remove();document.body.style.overflow=''"
        style="position:absolute;top:-14px;right:-14px;width:30px;height:30px;border-radius:50%;background:#f03faa;border:none;color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:700">✕</button>
    </div>
  `;
  lb.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  lb.onclick = (e) => { if (e.target === lb) { lb.remove(); document.body.style.overflow=''; } };
}

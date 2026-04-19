// ============================================
// IRES EMBAIXADORAS — painel.js
// Início, meus pedidos, avisos e recompra
// ============================================

let _perfil = null;
let _abaAtiva = 'painel';

// ── Inicialização ──
(async () => {
  const ctx = await requireActive();
  if (!ctx) return;
  _perfil = ctx.profile;
  await renderTopbar();

  const hash = window.location.hash.replace('#','');
  const abaValida = ['painel','vitrine','pedidos','avisos','perfil'].includes(hash);
  irAba(abaValida ? hash : 'painel');
})();

// ── Navegação entre abas ──
function irAba(aba) {
  _abaAtiva = aba;
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const tab = document.getElementById(`tab-${aba}`);
  if (tab) tab.classList.add('active');
  history.replaceState(null, '', '#' + aba);
  const acoes = { painel: renderInicio, vitrine: renderVitrine, pedidos: () => window.location.href='pedidos.html', avisos: renderAvisos, perfil: renderPerfil };
  (acoes[aba] || renderInicio)();
}

// ════════════════════════════════════════════
// INÍCIO
// ════════════════════════════════════════════
async function renderInicio() {
  const nome = _perfil.full_name?.split(' ')[0] || 'Embaixadora';

  const [{ data: pedidos }, { data: avisos }, { data: produtos }] = await Promise.all([
    _supabase.from('orders').select('id,total,status,created_at').eq('reseller_id', _perfil.id).order('created_at', { ascending: false }).limit(3),
    _supabase.from('messages').select('id,subject,body,created_at').eq('is_broadcast', true).order('created_at', { ascending: false }).limit(2),
    _supabase.from('products').select('id,name,price,min_quantity,images,categories(name)').eq('is_active', true).order('created_at', { ascending: false }).limit(4),
  ]);

  const totalGasto = (pedidos || []).reduce((a, o) => a + Number(o.total), 0);
  const emTransito = (pedidos || []).filter(o => o.status === 'shipped' || o.status === 'processing').length;

  document.getElementById('conteudo').innerHTML = `

    <!-- Saudação -->
    <div style="background:#111;border:0.5px solid var(--border);border-radius:var(--radius-lg);padding:20px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;gap:16px">
      <div style="display:flex;align-items:center;gap:14px">
        <div class="avatar" style="width:48px;height:48px;font-size:16px">${initials(_perfil.full_name)}</div>
        <div>
          <div style="font-size:18px;font-weight:800">Olá, ${nome}! 👋</div>
          <div style="font-size:12px;color:var(--gray);margin-top:2px">Embaixadora ativa</div>
        </div>
      </div>
      <a href="vitrine.html" class="btn btn-primary btn-sm" style="width:auto;white-space:nowrap">Ver vitrine →</a>
    </div>

    <!-- Métricas -->
    <div class="metrics-grid" style="margin-bottom:20px">
      <div class="metric-card">
        <div class="metric-value">${(pedidos || []).length}</div>
        <div class="metric-label">Pedidos feitos</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${formatBRL(totalGasto)}</div>
        <div class="metric-label">Total comprado</div>
      </div>
      <div class="metric-card" style="border-top-color:var(--blue)">
        <div class="metric-value">${emTransito}</div>
        <div class="metric-label">Em trânsito</div>
      </div>
    </div>

    <!-- Novidades — produtos recentes -->
    ${(produtos || []).length ? `
      <div style="margin-bottom:24px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div class="section-title">Novidades na vitrine</div>
          <a href="vitrine.html" class="btn btn-sm btn-outline">Ver tudo</a>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px">
          ${produtos.map(p => {
            const img = p.images?.[0] || '';
            return `
              <div class="product-card" onclick="window.location.href='vitrine.html'">
                <div class="product-img">
                  ${img
                    ? `<img src="${img}" alt="${p.name}" loading="lazy"/>`
                    : `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`
                  }
                  ${p.categories?.name ? `<div class="product-tag"><span class="pill pill-pink">${p.categories.name}</span></div>` : ''}
                </div>
                <div class="product-info">
                  <div class="product-name">${p.name}</div>
                  <div class="product-bottom">
                    <div>
                      <div class="product-price">${formatBRL(p.price)}</div>
                      <div class="product-min">mín. ${p.min_quantity} un.</div>
                    </div>
                    <button class="btn-add" onclick="event.stopPropagation(); adicionarProduto('${p.id}')">+</button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    ` : ''}

    <!-- Últimos pedidos -->
    <div style="margin-bottom:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div class="section-title">Últimos pedidos</div>
        <button class="btn btn-sm btn-outline" onclick="window.location.href='pedidos.html'">Ver todos</button>
      </div>
      <div class="orders-list">
        ${(pedidos || []).length ? pedidos.map(o => pedidoCard(o)).join('') : `
          <div class="empty-state" style="padding:24px">
            <p>Você ainda não fez nenhum pedido.</p>
            <a href="vitrine.html" class="btn btn-primary btn-sm" style="width:auto;margin-top:12px">Fazer primeiro pedido</a>
          </div>
        `}
      </div>
    </div>

    <!-- Avisos recentes -->
    ${(avisos || []).length ? `
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div class="section-title">Avisos da IRES</div>
          <button class="btn btn-sm btn-outline" onclick="irAba('avisos')">Ver todos</button>
        </div>
        ${avisos.map(a => `
          <div class="card" style="margin-bottom:10px">
            <div style="font-size:13px;font-weight:700;margin-bottom:6px">${a.subject || 'Aviso'}</div>
            <p style="font-size:12px;color:var(--gray-lighter);line-height:1.6">${a.body.slice(0, 120)}${a.body.length > 120 ? '...' : ''}</p>
            <div style="font-size:11px;color:var(--gray);margin-top:8px">${new Date(a.created_at).toLocaleDateString('pt-BR')}</div>
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;

  // carrega lista de produtos para o addToCart funcionar
  window._produtosPainel = produtos || [];
}

// ── Adiciona produto ao carrinho direto do painel ──
function adicionarProduto(id) {
  const p = (window._produtosPainel || []).find(x => x.id === id);
  if (!p) return;
  addToCart(p);
  showToast(`${p.name} adicionado ao carrinho!`, 'success');
}

// ════════════════════════════════════════════
// MEUS PEDIDOS
// ════════════════════════════════════════════
async function renderPedidos() {
  const { data } = await _supabase
    .from('orders')
    .select('*, order_items(quantity, unit_price, subtotal, products(name, images))')
    .eq('reseller_id', _perfil.id)
    .order('created_at', { ascending: false });

  document.getElementById('conteudo').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <h2 style="font-size:20px;font-weight:800">Meus pedidos</h2>
      <span class="pill pill-gray">${data?.length || 0} pedidos</span>
    </div>

    <div class="orders-list">
      ${(data || []).length ? data.map(o => pedidoCard(o, true)).join('')
        : `<div class="empty-state"><p>Você ainda não fez nenhum pedido.</p>
           <a href="vitrine.html" class="btn btn-primary btn-sm" style="width:auto;margin-top:12px">Ver vitrine</a></div>`}
    </div>
  `;
}

function pedidoCard(o, expandido = false) {
  const itens = o.order_items || [];
  const preview = itens.slice(0,2).map(i => i.products?.name).filter(Boolean).join(', ');

  return `
    <div class="order-row" style="flex-direction:column;align-items:stretch;gap:0;cursor:default">
      <div style="display:flex;align-items:center;gap:12px">
        <div>
          <div class="order-id">#${o.id.slice(-6).toUpperCase()}</div>
          <div class="order-date">${new Date(o.created_at).toLocaleDateString('pt-BR')}</div>
        </div>
        <div class="order-items-preview" style="flex:1">${preview || 'Pedido'}</div>
        <div class="order-total">${formatBRL(o.total)}</div>
        ${statusLabel(o.status)}
      </div>

      ${expandido && itens.length ? `
        <div style="border-top:0.5px solid var(--border2);margin-top:12px;padding-top:12px;display:flex;flex-direction:column;gap:8px">
          ${itens.map(i => {
            const img = i.products?.images?.[0] || '';
            return `
              <div style="display:flex;align-items:center;gap:10px">
                <div style="width:40px;height:40px;border-radius:6px;background:var(--pink-faint);border:0.5px solid var(--pink-deep);overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center">
                  ${img ? `<img src="${img}" style="width:100%;height:100%;object-fit:cover"/>` : ''}
                </div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:12px;font-weight:600;color:var(--white)">${i.products?.name || 'Produto'}</div>
                  <div style="font-size:11px;color:var(--gray)">${i.quantity} un. × ${formatBRL(i.unit_price)}</div>
                </div>
                <div style="font-size:13px;font-weight:700;color:var(--white)">${formatBRL(i.subtotal)}</div>
              </div>
            `;
          }).join('')}

          <div style="display:flex;gap:8px;margin-top:4px">
            ${o.status === 'pending' ? (o.payment_url
              ? `<a href="${o.payment_url}" target="_blank" class="btn btn-primary btn-sm" style="flex:1">Efetuar pagamento ↗</a>`
              : `<button class="btn btn-primary btn-sm" id="btn-pagar-${o.id}" onclick="gerarLinkPainel('${o.id}',${o.total})" style="flex:1">Gerar link de pagamento</button>`
            ) : ''}
            <button class="btn btn-sm btn-outline" onclick="recomprar('${o.id}')" style="flex:1">
              Recomprar →
            </button>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// ── Recompra rápida ──
async function recomprar(orderId) {
  const { data } = await _supabase
    .from('order_items')
    .select('quantity, unit_price, products(*)')
    .eq('order_id', orderId);

  if (!data?.length) { showToast('Erro ao carregar pedido.', 'error'); return; }

  data.forEach(item => {
    if (!item.products) return;
    const produto = {
      ...item.products,
      price:        Number(item.unit_price) || Number(item.products.price) || 0,
      min_quantity: Number(item.products.min_quantity) || 1,
    };
    addToCart(produto, item.quantity);
  });

  showToast('Itens adicionados ao carrinho!', 'success');
  setTimeout(() => window.location.href = 'carrinho.html', 1000);
}

// ════════════════════════════════════════════
// AVISOS
// ════════════════════════════════════════════
async function renderAvisos() {
  const { data } = await _supabase
    .from('messages')
    .select('*')
    .eq('is_broadcast', true)
    .order('created_at', { ascending: false });

  document.getElementById('conteudo').innerHTML = `
    <div style="margin-bottom:20px">
      <h2 style="font-size:20px;font-weight:800">Avisos da IRES</h2>
      <p style="font-size:13px;color:var(--gray);margin-top:4px">Comunicados enviados para todas as embaixadoras</p>
    </div>

    ${(data || []).length ? data.map(a => `
      <div class="card" style="margin-bottom:12px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;gap:12px">
          <div style="font-size:14px;font-weight:700">${a.subject || 'Aviso'}</div>
          <div style="font-size:11px;color:var(--gray);white-space:nowrap">${new Date(a.created_at).toLocaleDateString('pt-BR')}</div>
        </div>
        <p style="font-size:13px;color:var(--gray-lighter);line-height:1.7">${a.body}</p>
        <div style="margin-top:10px"><span class="pill pill-pink">IRES</span></div>
      </div>
    `).join('') : `
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gray)" stroke-width="1.5">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        <p>Nenhum aviso no momento.</p>
      </div>
    `}
  `;
}

// ── Gera link de pagamento para pedido pendente ──
async function gerarLinkPainel(orderId, total) {
  const btn = document.getElementById(`btn-pagar-${orderId}`);
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner" style="margin:0 auto;width:14px;height:14px"></div>'; }

  try {
    // primeiro tenta buscar cobrança existente no Asaas
    const resp = await fetch('https://webhook.ruahsystems.com.br/webhook/asaas-buscar-cobranca', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pedido_id: orderId }),
    });

    const result = await resp.json();

    if (result.ok && result.link) {
      showToast('Link encontrado!', 'success');
      if (btn) btn.outerHTML = `<a href="${result.link}" target="_blank" class="btn btn-primary btn-sm" style="flex:1">Efetuar pagamento ↗</a>`;
    } else {
      showToast('Nenhuma cobrança encontrada para este pedido.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Gerar link de pagamento'; }
    }
  } catch(e) {
    showToast('Erro: ' + e.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Gerar link de pagamento'; }
  }
}

// ════════════════════════════════════════════
// VITRINE
// ════════════════════════════════════════════
let _todosProdutos = [];
let _categoriaAtiva = '';

async function renderVitrine() {
  document.getElementById('conteudo').innerHTML = `
    <div class="vitrine-hero" style="margin-bottom:16px">
      <div>
        <h2>Bem-vinda, <span style="color:var(--pink)">${_perfil.full_name?.split(' ')[0] || 'Embaixadora'}</span></h2>
        <p style="font-size:13px;color:var(--gray)">Produtos exclusivos para embaixadoras IRES</p>
      </div>
      <div class="vitrine-hero-badge">
        <div class="num" id="total-produtos">...</div>
        <div class="lbl">produtos</div>
      </div>
    </div>

    <!-- Filtros -->
    <div class="filters" style="margin-bottom:16px">
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <div class="filter-pill active" onclick="setFiltroPainel(this,'all')">Todos</div>
        <div class="filter-pill" onclick="setFiltroPainel(this,'new')">Novidades</div>
        <div class="filter-pill" onclick="setFiltroPainel(this,'promo')">Promoção</div>
        <div id="filtros-cat"></div>
      </div>
      <input type="text" id="busca-vitrine" class="search-input" placeholder="Buscar produto..." oninput="filtrarProdutosPainel()"/>
    </div>

    <div id="loading-vitrine" class="loading"><div class="spinner"></div> Carregando...</div>
    <div class="products-grid" id="grid-vitrine" style="display:none"></div>
    <div class="empty-state" id="empty-vitrine" style="display:none">
      <p>Nenhum produto encontrado.</p>
    </div>
  `;

  // cria modal de produto se não existir
  if (!document.getElementById('modal-produto')) {
    const m = document.createElement('div');
    m.id = 'modal-produto';
    m.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:999;align-items:center;justify-content:center;padding:16px';
    m.onclick = (e) => { if (e.target === m) { m.style.display='none'; document.body.style.overflow=''; } };
    document.body.appendChild(m);
  }

  const [{ data: cats }, { data: prods }] = await Promise.all([
    _supabase.from('categories').select('id,name').order('name'),
    _supabase.from('products').select('*, categories(name)').eq('is_active', true).order('created_at', { ascending: false }),
  ]);

  _todosProdutos = prods || [];
  document.getElementById('loading-vitrine').style.display = 'none';
  document.getElementById('total-produtos').textContent = _todosProdutos.length;

  // adiciona categorias nos filtros
  const filtrosCat = document.getElementById('filtros-cat');
  (cats || []).forEach(c => {
    const el = document.createElement('div');
    el.className = 'filter-pill';
    el.textContent = c.name;
    el.onclick = () => { _categoriaAtiva = c.id; document.querySelectorAll('.filter-pill').forEach(p=>p.classList.remove('active')); el.classList.add('active'); filtrarProdutosPainel(); };
    filtrosCat.appendChild(el);
  });

  filtrarProdutosPainel();
}

function setFiltroPainel(el, filtro) {
  _categoriaAtiva = '';
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  filtrarProdutosPainel();
}

function filtrarProdutosPainel() {
  const busca = (document.getElementById('busca-vitrine')?.value || '').toLowerCase().trim();
  let lista = _todosProdutos.filter(p => {
    const matchCat   = !_categoriaAtiva || p.category_id === _categoriaAtiva;
    const matchBusca = !busca || p.name.toLowerCase().includes(busca) || (p.description||'').toLowerCase().includes(busca);
    return matchCat && matchBusca;
  });

  const grid  = document.getElementById('grid-vitrine');
  const empty = document.getElementById('empty-vitrine');

  if (!lista.length) { grid.style.display='none'; empty.style.display='block'; return; }
  grid.style.display = 'grid'; empty.style.display = 'none';

  grid.innerHTML = lista.map(p => {
    const img     = p.images?.[0] || '';
    const catNome = p.categories?.name || '';
    return `
      <div class="product-card" onclick="abrirProdutoPainel('${p.id}')">
        <div class="product-img">
          ${img ? `<img src="${img}" alt="${p.name}" loading="lazy"/>` : `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`}
          ${catNome ? `<div class="product-tag"><span class="pill pill-pink">${catNome}</span></div>` : ''}
        </div>
        <div class="product-info">
          <div class="product-name">${p.name}</div>
          <div class="product-desc">${p.description || ''}</div>
          <div class="product-bottom">
            <div>
              <div class="product-price">${formatBRL(p.price)}</div>
              <div class="product-min">mín. ${p.min_quantity} un.</div>
            </div>
            <button class="btn-add" onclick="event.stopPropagation();addToCart(_todosProdutos.find(x=>x.id==='${p.id}'))">+</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function abrirProdutoPainel(id) {
  const p    = _todosProdutos.find(x => x.id === id);
  if (!p) return;
  const modal = document.getElementById('modal-produto');
  const imgs  = Array.isArray(p.images) && p.images.length ? p.images : [];

  modal.innerHTML = `
    <div class="card" style="max-width:420px;width:100%;position:relative">
      <button onclick="document.getElementById('modal-produto').style.display='none';document.body.style.overflow=''" style="position:absolute;top:12px;right:12px;z-index:10;background:rgba(0,0,0,0.5);border:none;color:#fff;cursor:pointer;font-size:18px;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center">✕</button>
      <div style="background:var(--black);border-radius:var(--radius-md);margin-bottom:16px;overflow:hidden">
        ${imgs.length ? `
          <div id="carousel-track" style="display:flex;transition:transform 0.3s ease">
            ${imgs.map(url=>`<div style="min-width:100%;flex-shrink:0"><img src="${url}" style="width:100%;height:auto;display:block;max-height:320px;object-fit:contain"/></div>`).join('')}
          </div>
          ${imgs.length > 1 ? `
            <button onclick="moverCarrosselPainel(-1)" style="position:absolute;left:8px;top:40%;background:rgba(0,0,0,0.6);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px">‹</button>
            <button onclick="moverCarrosselPainel(1)" style="position:absolute;right:8px;top:40%;background:rgba(0,0,0,0.6);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px">›</button>
          ` : ''}
        ` : `<div style="height:200px;display:flex;align-items:center;justify-content:center"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg></div>`}
      </div>
      ${imgs.length > 1 ? `<div style="display:flex;gap:6px;margin-bottom:14px;overflow-x:auto">${imgs.map((url,i)=>`<img src="${url}" onclick="moverParaSlidePainel(${i})" id="pthumb-${i}" style="width:52px;height:52px;object-fit:cover;border-radius:6px;cursor:pointer;border:2px solid ${i===0?'var(--pink)':'transparent'};flex-shrink:0"/>`).join('')}</div>` : ''}
      <h3 style="font-size:16px;font-weight:800;margin-bottom:6px">${p.name}</h3>
      <p style="font-size:13px;color:var(--gray);margin-bottom:16px;line-height:1.6">${p.description||''}</p>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div><div style="font-size:22px;font-weight:900">${formatBRL(p.price)}</div><div style="font-size:11px;color:var(--gray)">por unidade</div></div>
        <div class="info-box" style="margin:0;padding:8px 12px"><div class="info-box-dot"></div><p style="font-size:11px">Mínimo <strong>${p.min_quantity} un.</strong></p></div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
        <label style="font-size:11px;color:var(--gray);text-transform:uppercase;letter-spacing:1px">Quantidade</label>
        <button class="qty-btn" onclick="ajustarQtyPainel(-1,${p.min_quantity})">−</button>
        <span class="qty-value" id="pmodal-qty">${p.min_quantity}</span>
        <button class="qty-btn" onclick="ajustarQtyPainel(1,${p.min_quantity})">+</button>
        <span style="font-size:12px;color:var(--pink);font-weight:700" id="pmodal-sub">${formatBRL(p.price*p.min_quantity)}</span>
      </div>
      <button class="btn btn-primary" onclick="adicionarDoModalPainel('${p.id}')">Adicionar ao carrinho</button>
    </div>
  `;
  window._carouselIdxP = 0;
  window._carouselTotalP = imgs.length;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function moverCarrosselPainel(dir) {
  const total = window._carouselTotalP || 1;
  window._carouselIdxP = ((window._carouselIdxP||0) + dir + total) % total;
  moverParaSlidePainel(window._carouselIdxP);
}

function moverParaSlidePainel(idx) {
  const track = document.getElementById('carousel-track');
  if (track) track.style.transform = `translateX(-${idx*100}%)`;
  window._carouselIdxP = idx;
  for (let i=0; i<(window._carouselTotalP||1); i++) {
    const t = document.getElementById(`pthumb-${i}`);
    if (t) t.style.borderColor = i===idx ? 'var(--pink)' : 'transparent';
  }
}

function ajustarQtyPainel(delta, min) {
  const el  = document.getElementById('pmodal-qty');
  const sub = document.getElementById('pmodal-sub');
  if (!el) return;
  let qty = parseInt(el.textContent) + delta;
  if (qty < min) qty = min;
  el.textContent = qty;
  const btn = document.querySelector('[onclick^="adicionarDoModalPainel"]');
  const id  = btn?.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
  const p   = _todosProdutos.find(x => x.id === id);
  if (p && sub) sub.textContent = formatBRL(p.price * qty);
}

function adicionarDoModalPainel(id) {
  const p   = _todosProdutos.find(x => x.id === id);
  const qty = parseInt(document.getElementById('pmodal-qty').textContent);
  if (!p) return;
  addToCart(p, qty);
  document.getElementById('modal-produto').style.display = 'none';
  document.body.style.overflow = '';
}
async function renderPerfil() {
  const { data: p } = await _supabase
    .from('profiles')
    .select('*')
    .eq('id', _perfil.id)
    .single();

  const addr = p.address || {};
  const ini  = initials(p.full_name);

  document.getElementById('conteudo').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <h2 style="font-size:20px;font-weight:800">Meu perfil</h2>
    </div>

    <!-- Avatar -->
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
      <div style="position:relative">
        <div id="avatar-preview" style="width:72px;height:72px;border-radius:50%;background:var(--pink-faint);border:2px solid var(--pink);overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:var(--pink);cursor:pointer" onclick="document.getElementById('avatar-file').click()">
          ${p.avatar_url
            ? `<img src="${p.avatar_url}" style="width:100%;height:100%;object-fit:cover"/>`
            : ini}
        </div>
        <div onclick="document.getElementById('avatar-file').click()" style="position:absolute;bottom:0;right:0;width:22px;height:22px;border-radius:50%;background:var(--pink);display:flex;align-items:center;justify-content:center;cursor:pointer">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </div>
      </div>
      <div>
        <div style="font-size:15px;font-weight:700">${p.full_name || ''}</div>
        <div style="font-size:12px;color:var(--gray);margin-top:2px">Clique na foto para alterar</div>
        <div id="avatar-progress" style="display:none;margin-top:6px">
          <div style="height:3px;background:var(--border);border-radius:2px;width:120px;overflow:hidden">
            <div id="avatar-bar" style="height:100%;width:0%;background:var(--pink);transition:width 0.3s"></div>
          </div>
        </div>
      </div>
      <input type="file" id="avatar-file" accept="image/*" style="display:none" onchange="uploadAvatar(this.files[0])"/>
    </div>

    <!-- Dados pessoais -->
    <div class="card" style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:14px">Dados pessoais</div>
      <div class="form-group">
        <label>Nome completo *</label>
        <input type="text" id="pf-nome" value="${p.full_name || ''}"/>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>WhatsApp *</label>
          <input type="tel" id="pf-phone" value="${p.phone || ''}" placeholder="(21) 99999-9999" oninput="mascaraTel(this)"/>
        </div>
        <div class="form-group">
          <label>E-mail *</label>
          <input type="email" id="pf-email" value="${p.email || ''}"/>
        </div>
      </div>
    </div>

    <!-- Endereço -->
    <div class="card" style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:14px">Endereço de entrega</div>
      <div class="form-row">
        <div class="form-group">
          <label>CEP</label>
          <div style="position:relative">
            <input type="text" id="pf-cep" value="${addr.cep || ''}" placeholder="00000-000" maxlength="9" oninput="mascaraCEP(this)" onblur="buscarCEP(this.value)"/>
            <div id="cep-loading" style="display:none;position:absolute;right:10px;top:50%;transform:translateY(-50%)">
              <div class="spinner" style="width:14px;height:14px"></div>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>Estado</label>
          <input type="text" id="pf-estado" value="${addr.estado || ''}" placeholder="RJ" maxlength="2"/>
        </div>
      </div>
      <div class="form-group">
        <label>Rua / Logradouro</label>
        <input type="text" id="pf-rua" value="${addr.rua || ''}" placeholder="Rua das Flores"/>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Número</label>
          <input type="text" id="pf-numero" value="${addr.numero || ''}" placeholder="123"/>
        </div>
        <div class="form-group">
          <label>Complemento</label>
          <input type="text" id="pf-complemento" value="${addr.complemento || ''}" placeholder="Apto 4"/>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Bairro</label>
          <input type="text" id="pf-bairro" value="${addr.bairro || ''}" placeholder="Centro"/>
        </div>
        <div class="form-group">
          <label>Cidade</label>
          <input type="text" id="pf-cidade" value="${addr.cidade || ''}" placeholder="Rio de Janeiro"/>
        </div>
      </div>
    </div>

    <button class="btn btn-primary" id="btn-salvar-perfil" onclick="salvarPerfil()">Salvar alterações</button>
  `;
}

// ── Upload avatar ──
async function uploadAvatar(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('Selecione uma imagem.','error'); return; }
  if (file.size > 3*1024*1024) { showToast('Máximo 3MB.','error'); return; }

  document.getElementById('avatar-progress').style.display = 'block';
  document.getElementById('avatar-bar').style.width = '40%';

  const ext  = file.name.split('.').pop();
  const name = `avatar_${_perfil.id}.${ext}`;

  // faz upload para bucket 'depoimentos' (já existe e é público)
  const { error } = await _supabase.storage.from('depoimentos').upload(name, file, { upsert: true, cacheControl: '3600' });
  if (error) { showToast('Erro no upload.','error'); return; }

  document.getElementById('avatar-bar').style.width = '100%';

  const { data: { publicUrl } } = _supabase.storage.from('depoimentos').getPublicUrl(name);

  // salva no perfil
  await _supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', _perfil.id);
  _perfil.avatar_url = publicUrl;

  // atualiza preview
  const prev = document.getElementById('avatar-preview');
  prev.innerHTML = `<img src="${publicUrl}" style="width:100%;height:100%;object-fit:cover"/>`;

  setTimeout(() => { document.getElementById('avatar-progress').style.display = 'none'; }, 500);
  showToast('Foto atualizada!', 'success');
}

// ── Máscaras ──
function mascaraTel(input) {
  let v = input.value.replace(/\D/g,'').slice(0,11);
  if (v.length > 6) v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
  else if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
  else if (v.length > 0) v = `(${v}`;
  input.value = v;
}

function mascaraCEP(input) {
  let v = input.value.replace(/\D/g,'').slice(0,8);
  if (v.length > 5) v = `${v.slice(0,5)}-${v.slice(5)}`;
  input.value = v;
}

// ── Busca CEP ──
async function buscarCEP(cep) {
  const digits = cep.replace(/\D/g,'');
  if (digits.length !== 8) return;

  document.getElementById('cep-loading').style.display = 'flex';

  try {
    const resp = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    const data = await resp.json();

    if (data.erro) { showToast('CEP não encontrado.','error'); return; }

    document.getElementById('pf-rua').value    = data.logradouro || '';
    document.getElementById('pf-bairro').value = data.bairro || '';
    document.getElementById('pf-cidade').value = data.localidade || '';
    document.getElementById('pf-estado').value = data.uf || '';

    // foca no campo número
    document.getElementById('pf-numero').focus();
    showToast('Endereço preenchido!', 'success');
  } catch {
    showToast('Erro ao buscar CEP.','error');
  } finally {
    document.getElementById('cep-loading').style.display = 'none';
  }
}

// ── Salva perfil ──
async function salvarPerfil() {
  const nome  = document.getElementById('pf-nome').value.trim();
  const phone = document.getElementById('pf-phone').value.trim();
  const email = document.getElementById('pf-email').value.trim();

  if (!nome)  { showToast('Informe o nome.','error'); return; }
  if (!phone) { showToast('Informe o WhatsApp.','error'); return; }
  if (!email) { showToast('Informe o e-mail.','error'); return; }

  const btn = document.getElementById('btn-salvar-perfil');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="margin:0 auto"></div>';

  const address = {
    cep:         document.getElementById('pf-cep').value.trim(),
    rua:         document.getElementById('pf-rua').value.trim(),
    numero:      document.getElementById('pf-numero').value.trim(),
    complemento: document.getElementById('pf-complemento').value.trim(),
    bairro:      document.getElementById('pf-bairro').value.trim(),
    cidade:      document.getElementById('pf-cidade').value.trim(),
    estado:      document.getElementById('pf-estado').value.trim(),
  };

  const { error } = await _supabase.from('profiles').update({
    full_name: nome,
    phone,
    email,
    address,
  }).eq('id', _perfil.id);

  if (error) {
    showToast('Erro ao salvar: ' + error.message, 'error');
    btn.disabled = false; btn.textContent = 'Salvar alterações';
    return;
  }

  // atualiza cache local
  _perfil.full_name = nome;
  _perfil.phone     = phone;
  _perfil.email     = email;
  _perfil.address   = address;

  showToast('Perfil atualizado!', 'success');
  btn.disabled = false; btn.textContent = 'Salvar alterações';
}

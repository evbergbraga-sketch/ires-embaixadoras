// ============================================
// IRES EMBAIXADORAS — painel.js
// Todas as abas unificadas numa única SPA
// ============================================

let _perfil    = null;
let _abaAtiva  = 'painel';

// ── Inicialização ──
(async () => {
  const ctx = await requireActive();
  if (!ctx) return;
  _perfil = ctx.profile;
  window._perfilAtual = ctx.profile;
  await renderTopbar();

  const hash     = window.location.hash.replace('#', '');
  const abaValida = ['painel','vitrine','pedidos','avisos','perfil','depoimentos','suporte','criativos','capacitacao'].includes(hash);
  irAba(abaValida ? hash : 'painel');
})();

// ── Navegação entre abas ──
function irAba(aba) {
  _abaAtiva = aba;

  // desktop tabs
  document.querySelectorAll('.nav-tab-new').forEach(t => t.classList.remove('active'));
  const tab = document.getElementById('tab-' + aba);
  if (tab) tab.classList.add('active');

  // bottom nav mobile
  document.querySelectorAll('.bnav-tab').forEach(t => t.classList.remove('active'));
  const bmap = { painel:0, vitrine:1, pedidos:2, avisos:3, perfil:4 };
  if (bmap[aba] !== undefined) {
    const btabs = document.querySelectorAll('.bnav-tab');
    if (btabs[bmap[aba]]) btabs[bmap[aba]].classList.add('active');
  }

  history.replaceState(null, '', '#' + aba);

  const acoes = {
    painel:      renderInicio,
    vitrine:     renderVitrine,
    pedidos:     renderPedidos,
    avisos:      renderAvisos,
    perfil:      renderPerfil,
    depoimentos: renderDepoimentos,
    suporte:     renderSuporte,
    criativos:   renderCriativos,
    capacitacao: renderCapacitacao,
  };
  (acoes[aba] || renderInicio)();
}

// ════════════════════════════════════════════
// INÍCIO
// ════════════════════════════════════════════
async function renderInicio() {
  const nome = _perfil.full_name?.split(' ')[0] || 'Embaixadora';

  const [
    { data: pedidos   },
    { data: avisos    },
    { data: produtos  },
    { data: modulos   },
    { data: progresso },
    { data: notificacoes },
  ] = await Promise.all([
    _supabase.from('orders')
      .select('id,total,status,created_at')
      .eq('reseller_id', _perfil.id)
      .order('created_at', { ascending: false })
      .limit(3),
    _supabase.from('messages')
      .select('id,subject,body,created_at,type')
      .eq('is_broadcast', true)
      .order('created_at', { ascending: false })
      .limit(3),
    _supabase.from('products')
      .select('id,name,price,min_quantity,images,categories(name)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(6),
    _supabase.from('modules')
      .select('id, lessons(id,title,duration_seconds,"order")')
      .eq('is_active', true)
      .order('"order"', { ascending: true })
      .limit(3),
    _supabase.from('lesson_progress')
      .select('lesson_id')
      .eq('reseller_id', _perfil.id),
    _supabase.from('notifications')
      .select('id,title,body,type,read_at,created_at')
      .eq('user_id', _perfil.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const totalGasto = (pedidos || []).reduce((a, o) => a + Number(o.total), 0);
  // Busca contagem real de pedidos pagos (não apenas os últimos 3)
  const { count: qtdPedidosPagos } = await _supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('reseller_id', _perfil.id)
    .in('status', ['paid','processing','shipped','delivered']);
  const qtdPedidos = qtdPedidosPagos || 0;
  const pendentes  = (pedidos || []).filter(o => o.status === 'pending').length;

  // Capacitação — dados reais
  const todasAulas   = (modulos || []).flatMap(m => m.lessons || []);
  const totalAulas   = todasAulas.length;
  const concluidas   = new Set((progresso || []).map(p => p.lesson_id));
  const totalConc    = concluidas.size;
  const pctCap       = totalAulas ? Math.round((totalConc / totalAulas) * 100) : 0;
  const primeiraAula = todasAulas.sort((a,b) => a.order - b.order)[0];
  const durMin       = primeiraAula?.duration_seconds ? Math.ceil(primeiraAula.duration_seconds / 60) : null;

  function tagNova(status) {
    const map = {
      pending:    { label:'Pendente',    cls:'pend' },
      paid:       { label:'Pago',        cls:'ok'   },
      processing: { label:'Em processo', cls:'ship' },
      shipped:    { label:'Enviado',     cls:'ship' },
      delivered:  { label:'Entregue',    cls:'ok'   },
      cancelled:  { label:'Cancelado',   cls:'wait' },
    };
    const s = map[status] || { label: status, cls: 'wait' };
    return `<span class="tag-new ${s.cls}">${s.label}</span>`;
  }

  function corValor(status) {
    if (status === 'pending')   return 'var(--nb-amber)';
    if (status === 'delivered') return 'var(--nb-text-low)';
    return 'var(--nb-text-mid)';
  }

  // Avisos — últimos 3, cores por tipo
  const tipoAviso = (msg) => {
    const t = msg.type || '';
    if (t === 'video')   return { cls:'gold', icon:'<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>' };
    if (t === 'produto') return { cls:'info', icon:'<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>' };
    return { cls:'info', icon:'<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>' };
  };

  const avisosHTML = (avisos || []).map(aviso => {
    const { cls, icon } = tipoAviso(aviso);
    return `
      <div class="aviso-card ${cls}">
        <div class="aviso-card-icon">
          <svg viewBox="0 0 24 24">${icon}</svg>
        </div>
        <div style="flex:1;min-width:0;">
          <div class="aviso-card-title">${s(aviso.subject) || 'Aviso'}</div>
          <div class="aviso-card-body">${s((aviso.body||'').slice(0,120))}${(aviso.body||'').length > 120 ? '…' : ''}</div>
        </div>
        <button onclick="irAba('avisos')" style="background:none;border:none;color:var(--nb-gold);font-size:18px;cursor:pointer;flex-shrink:0;line-height:1;padding:0 0 0 8px;">›</button>
      </div>`;
  }).join('');

  const produtosHTML = (produtos || []).length ? `
    <div class="home-card home-vitrine">
      <div class="home-card-header">
        <div class="home-card-label">
          <svg viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          Vitrine
        </div>
        <a href="#" onclick="irAba('vitrine'); return false" class="home-card-link">Ver tudo →</a>
      </div>
      <div class="produtos-scroll">
        ${(produtos || []).map(p => {
          const img     = p.images?.[0] || '';
          const catNome = p.categories?.name || '';
          return `
            <div class="produto-chip" onclick="irAba('vitrine')">
              <div class="produto-chip-img">
                ${img
                  ? `<img src="${s(img)}" alt="${s(p.name)}" loading="lazy"/>`
                  : `<div class="produto-chip-img-placeholder"><svg viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg></div>`
                }
                ${catNome ? `<div class="produto-chip-cat">${s(catNome)}</div>` : ''}
              </div>
              <div class="produto-chip-body">
                <div class="produto-chip-name">${s(p.name)}</div>
                <div class="produto-chip-price">${formatBRL(p.price)}</div>
                <div class="produto-chip-min">mín. ${p.min_quantity} un.</div>
                <div class="produto-chip-footer">
                  <button class="produto-chip-add" onclick="event.stopPropagation(); _addProdutoHome('${p.id}')" aria-label="Adicionar ao carrinho">
                    <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';


  // — Notificações de nível e incentivo não lidas
  const notifNivel = (notificacoes || []).filter(n => (n.type === 'nivel' || n.type === 'incentivo') && !n.read_at);

  // Marca como lida 3s após exibição (dá tempo de ver o banner)
  if (notifNivel.length) {
    setTimeout(() => {
      _supabase.from('notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', notifNivel.map(n => n.id))
        .then(() => {});
    }, 3000);
  }

  const nivelBannerHTML = notifNivel.length ? notifNivel.map(n => `
    <div style="background:${n.type === 'incentivo' ? 'linear-gradient(135deg,#1a3a1a,#2d5e2d)' : 'linear-gradient(135deg,#3D0E20,#6B1A3A)'};border-radius:14px;padding:16px 18px;margin-bottom:14px;display:flex;align-items:flex-start;gap:14px;border:0.5px solid rgba(200,169,110,.2);box-shadow:0 4px 20px rgba(58,14,29,.25);animation:slideDown .4s ease;">
      <div style="font-size:28px;flex-shrink:0;line-height:1;">${n.title.startsWith('🥇') ? '🥇' : n.title.startsWith('🥈') ? '🥈' : n.title.startsWith('⭐') ? '⭐' : '🎉'}</div>
      <div style="flex:1;">
        <div style="font-size:14px;font-weight:700;color:#C8A96E;margin-bottom:4px;">${s(n.title.replace(/^[🥇🥈🎉⭐]\s*/,''))}</div>
        <div style="font-size:12px;color:rgba(200,169,110,.75);line-height:1.5;">${s(n.body)}</div>
      </div>
    </div>
  `).join('') : '';

  const metricsHTML = `
    <div class="metrics-home">
      <div class="metric-home-card">
        <div class="metric-home-label">
          <svg viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          Pedidos
        </div>
        <div class="metric-home-val" style="color:var(--nb-burg);">${qtdPedidos}</div>
        <div class="metric-home-bar">
          <div class="metric-home-bar-fill" style="width:${Math.min(qtdPedidos*10,100)}%;background:var(--nb-burg);opacity:.45;"></div>
        </div>
        <div class="metric-home-sub">
          ${pendentes > 0
            ? `<span class="metric-home-badge pend">${pendentes} pendente${pendentes > 1 ? 's' : ''}</span>`
            : `<span class="metric-home-badge empty">Em dia ✓</span>`
          }
        </div>
      </div>
      <div class="metric-home-card">
        <div class="metric-home-label">
          <svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          Total comprado
        </div>
        <div class="metric-home-val" style="font-size:${totalGasto >= 1000 ? '18px' : '24px'};color:var(--nb-gold);">
          ${formatBRL(totalGasto)}
        </div>
        <div class="metric-home-bar">
          <div class="metric-home-bar-fill" style="width:${Math.min(totalGasto/10,100)}%;background:var(--nb-gold);opacity:.45;"></div>
        </div>
        <div class="metric-home-sub"><span>últimos ${(pedidos||[]).length} pedidos</span></div>
      </div>
    </div>
  `;

  // Capacitação com dados reais
  const capHTML = totalAulas > 0 ? `
    <div class="home-card home-cap" onclick="irAba('capacitacao')" style="cursor:pointer">
      <div class="home-card-header">
        <div class="home-card-label">
          <svg viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          Capacitação
        </div>
        <span class="home-card-link">Ver tudo →</span>
      </div>
      ${primeiraAula ? `
        <div class="aula-row-new">
          <button class="play-btn-new">
            <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </button>
          <div style="flex:1;min-width:0;">
            <div class="aula-title-new">${primeiraAula.title}</div>
            <div class="aula-meta-new">Módulo 1${durMin ? ' · ' + durMin + ' min' : ''}</div>
          </div>
          ${concluidas.has(primeiraAula.id)
            ? `<span class="aula-badge-new" style="background:var(--nb-green-dim);color:var(--nb-green);border-color:var(--nb-green-bdr)">Concluída</span>`
            : `<span class="aula-badge-new">Assistir</span>`}
        </div>
      ` : ''}
      <div class="prog-track-new"><div class="prog-fill-new" style="width:${pctCap}%;"></div></div>
      <div class="prog-row-new">
        <span>${totalConc} de ${totalAulas} aulas</span>
        <span style="color:${pctCap>0?'var(--nb-burg)':'var(--nb-text-low)'}">${pctCap}%</span>
      </div>
    </div>
  ` : `
    <div class="home-card home-cap">
      <div class="home-card-header">
        <div class="home-card-label">
          <svg viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          Capacitação
        </div>
        <span class="home-card-link" style="cursor:default;opacity:.5;">Em breve</span>
      </div>
      <div style="font-size:13px;color:var(--nb-text-low);padding:8px 0">Treinamentos em preparação.</div>
    </div>
  `;

  const pedidosHTML = `
    <div class="home-card home-pedidos">
      <div class="home-card-header">
        <div class="home-card-label">
          <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Últimos pedidos
        </div>
        <a href="#" onclick="irAba('pedidos'); return false" class="home-card-link">Ver todos →</a>
      </div>
      ${(pedidos || []).length ? pedidos.map(o => `
        <div class="order-row-new">
          <div>
            <div class="order-id-new">#${o.id.slice(-6).toUpperCase()}</div>
            <div class="order-date-new">${new Date(o.created_at).toLocaleDateString('pt-BR')}</div>
          </div>
          <div class="order-right-new">
            <span class="order-val-new" style="color:${corValor(o.status)};">${formatBRL(o.total)}</span>
            ${tagNova(o.status)}
          </div>
        </div>
      `).join('') : `
        <div style="padding:20px 0;text-align:center;">
          <p style="font-size:13px;color:var(--nb-text-low);">Nenhum pedido ainda.</p>
          <a href="#" onclick="irAba('vitrine'); return false" class="btn-primary-new" style="margin-top:12px;font-size:12px;padding:8px 16px;">
            Fazer primeiro pedido →
          </a>
        </div>
      `}
    </div>
  `;

  const avatarContent = _perfil.avatar_url
    ? `<img src="${_perfil.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`
    : `<span style="font-size:14px;font-weight:700;color:var(--ouro-cl);">${initials(_perfil.full_name)}</span>`;

  document.getElementById('conteudo').innerHTML = `
    <div class="home-bento">
      <div class="hero-card">
        <div style="display:flex;align-items:center;gap:14px;">
          <div onclick="irAba('perfil')" style="width:46px;height:46px;border-radius:50%;background:rgba(196,154,122,.2);border:1.5px solid rgba(196,154,122,.5);overflow:hidden;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;">
            ${avatarContent}
          </div>
          <div>
            <div class="hero-card-name">Olá, ${nome} 👋</div>
            <div class="hero-card-sub"><span class="hero-status-dot"></span>Embaixadora ${{bronze:'Bronze',prata:'Prata',ouro:'Ouro'}[_perfil.nivel||'bronze']||'Bronze'}</div>
          </div>
        </div>
        <button onclick="irAba('vitrine')" class="btn-primary-new">Ver vitrine →</button>
      </div>
      ${avisosHTML}
      ${produtosHTML}
      ${nivelBannerHTML}
      ${metricsHTML}
      ${capHTML}
      ${pedidosHTML}
    </div>
  `;

  window._produtosPainel = produtos || [];
}

function _addProdutoHome(id) {
  const p = (window._produtosPainel || []).find(x => x.id === id);
  if (!p) return;
  addToCart(p);
}

// ════════════════════════════════════════════
// PEDIDOS (absorvido do pedidos.html)
// ════════════════════════════════════════════
let _todosPedidos = [];

async function renderPedidos() {
  document.getElementById('conteudo').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <h2 style="font-size:20px;font-weight:700;color:var(--nb-text-hi)">Meus pedidos</h2>
      <a href="#" onclick="irAba('vitrine'); return false" class="btn-primary-new" style="font-size:12px;padding:8px 14px;">+ Novo pedido</a>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <div class="filter-pill active" onclick="filtrarPedidos(this,'')">Todos</div>
      <div class="filter-pill" onclick="filtrarPedidos(this,'pending')">Pendente</div>
      <div class="filter-pill" onclick="filtrarPedidos(this,'paid')">Pago</div>
      <div class="filter-pill" onclick="filtrarPedidos(this,'processing')">Em processo</div>
      <div class="filter-pill" onclick="filtrarPedidos(this,'shipped')">Enviado</div>
      <div class="filter-pill" onclick="filtrarPedidos(this,'delivered')">Entregue</div>
    </div>

    <div id="loading-pedidos" class="loading"><div class="spinner"></div> Carregando...</div>
    <div class="orders-list" id="lista-pedidos" style="display:none"></div>
    <div class="empty-state" id="empty-pedidos" style="display:none">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gray)" stroke-width="1.5">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 01-8 0"/>
      </svg>
      <p>Nenhum pedido encontrado.</p>
      <a href="#" onclick="irAba('vitrine'); return false" class="btn btn-primary btn-sm" style="width:auto;margin-top:16px">Fazer primeiro pedido</a>
    </div>
  `;

  _garantirModalPedido();

  const { data, error } = await _supabase
    .from('orders')
    .select('id,status,total,notes,payment_url,payment_ref,created_at,order_items(quantity,unit_price,subtotal,size,color,products(name,images,min_quantity,price))')
    .eq('reseller_id', _perfil.id)
    .order('created_at', { ascending: false });

  document.getElementById('loading-pedidos').style.display = 'none';

  if (error || !data?.length) {
    document.getElementById('empty-pedidos').style.display = 'block';
    return;
  }

  _todosPedidos = data;
  _renderListaPedidos(data);
}

function _garantirModalPedido() {
  if (!document.getElementById('modal-pedido')) {
    const m = document.createElement('div');
    m.id = 'modal-pedido';
    m.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:999;align-items:flex-start;justify-content:center;padding:24px 16px;overflow-y:auto';
    m.innerHTML = '<div id="modal-pedido-body" class="card" style="max-width:480px;width:100%;position:relative;margin:auto"></div>';
    m.onclick = (e) => { if (e.target === m) _fecharModalPedido(); };
    document.body.appendChild(m);
  }
}

function _fecharModalPedido() {
  const m = document.getElementById('modal-pedido');
  if (m) m.style.display = 'none';
  document.body.style.overflow = '';
}

function _renderListaPedidos(lista) {
  const el    = document.getElementById('lista-pedidos');
  const empty = document.getElementById('empty-pedidos');
  if (!lista.length) { el.style.display='none'; empty.style.display='block'; return; }
  empty.style.display = 'none';
  el.style.display    = 'flex';
  el.innerHTML = lista.map(o => {
    const itens   = o.order_items || [];
    const preview = itens.slice(0,2).map(i => i.products?.name).filter(Boolean).join(', ');
    const img     = itens[0]?.products?.images?.[0] || '';
    return `
      <div class="order-row" onclick="abrirDetalhePedido('${o.id}')" style="cursor:pointer">
        <div style="width:44px;height:44px;border-radius:var(--radius-md);background:var(--pink-faint);border:0.5px solid var(--pink-deep);overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center">
          ${img
            ? `<img src="${img}" style="width:100%;height:100%;object-fit:cover"/>`
            : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--pink)" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`
          }
        </div>
        <div style="flex:1;min-width:0">
          <div class="order-id">#${o.id.slice(-6).toUpperCase()}</div>
          <div class="order-date">${new Date(o.created_at).toLocaleDateString('pt-BR')} · ${itens.length} item${itens.length>1?'s':''}</div>
          <div class="order-items-preview" style="margin-top:2px">${preview}</div>
        </div>
        <div style="text-align:right">
          <div class="order-total">${formatBRL(o.total)}</div>
          <div style="margin-top:4px">${statusLabel(o.status)}</div>
        </div>
      </div>
    `;
  }).join('');
}

function filtrarPedidos(el, status) {
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  const filtrados = status ? _todosPedidos.filter(o => o.status === status) : _todosPedidos;
  _renderListaPedidos(filtrados);
}

async function abrirDetalhePedido(id) {
  const o = _todosPedidos.find(x => x.id === id);
  if (!o) return;
  const itens = o.order_items || [];

  document.getElementById('modal-pedido-body').innerHTML = `
    <button onclick="_fecharModalPedido()" style="position:absolute;top:12px;right:12px;background:none;border:none;color:var(--gray);cursor:pointer;font-size:20px">✕</button>
    <h3 style="font-size:16px;font-weight:800;margin-bottom:4px">Pedido #${o.id.slice(-6).toUpperCase()}</h3>
    <p style="font-size:12px;color:var(--gray);margin-bottom:16px">${new Date(o.created_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})}</p>
    <div style="margin-bottom:16px">
      ${itens.map(i => {
        const img = i.products?.images?.[0] || '';
        return `
          <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:0.5px solid var(--border2)">
            <div style="width:48px;height:48px;border-radius:var(--radius-md);background:var(--pink-faint);border:0.5px solid var(--pink-deep);overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center">
              ${img ? `<img src="${img}" style="width:100%;height:100%;object-fit:cover"/>` : ''}
            </div>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:600">${s(i.products?.name)||'Produto'}</div>${(i.size||i.color)?`<div style="font-size:10px;color:#8B6050;margin-top:1px">${[i.size,i.color].filter(Boolean).join(' / ')}</div>`:''}
              <div style="font-size:11px;color:var(--gray)">${i.quantity} un. × ${formatBRL(i.unit_price)}</div>
            </div>
            <div style="font-size:13px;font-weight:700">${formatBRL(i.subtotal)}</div>
          </div>
        `;
      }).join('')}
      <div style="display:flex;justify-content:space-between;padding:12px 0;font-weight:800;font-size:15px">
        <span>Total</span><span style="color:var(--pink)">${formatBRL(o.total)}</span>
      </div>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <span style="font-size:13px;color:var(--gray)">Status</span>
      ${statusLabel(o.status)}
    </div>
    ${o.notes ? `<div class="info-box" style="margin-bottom:16px"><div class="info-box-dot"></div><p>${s(o.notes)}</p></div>` : ''}
    ${o.status === 'pending' ? (o.payment_url
      ? `<a href="${o.payment_url}" target="_blank" class="btn btn-primary" style="margin-bottom:10px">Finalizar pagamento agora ↗</a>`
      : `<button class="btn btn-primary" style="margin-bottom:10px" id="btn-gerar-${o.id}" onclick="gerarCobrancaPainel('${o.id}',${o.total})">Gerar link de pagamento</button>`
    ) : ''}
    <div style="display:flex;gap:8px">
      <button class="btn btn-outline" style="flex:1" onclick="recomprarPainel('${o.id}')">Recomprar →</button>
      <button class="btn btn-outline" style="flex:1" onclick="_fecharModalPedido()">Fechar</button>
    </div>
  `;
  document.getElementById('modal-pedido').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

async function recomprarPainel(orderId) {
  const o = _todosPedidos.find(x => x.id === orderId);
  if (!o) return;
  (o.order_items || []).forEach(i => {
    if (!i.products) return;
    addToCart({ ...i.products, price: Number(i.unit_price)||Number(i.products.price)||0, min_quantity: Number(i.products.min_quantity)||1 }, i.quantity);
  });
  showToast('Itens adicionados ao carrinho!', 'success');
  setTimeout(() => window.location.href = 'carrinho.html', 1000);
}

async function gerarCobrancaPainel(orderId, total) {
  const btn = document.getElementById(`btn-gerar-${orderId}`);
  if (btn) { btn.disabled=true; btn.innerHTML='<div class="spinner" style="margin:0 auto;width:14px;height:14px"></div>'; }
  try {
    const resp   = await fetch('https://webhook.ruahsystems.com.br/webhook/asaas-buscar-cobranca', {
      method: 'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ pedido_id: orderId }),
    });
    const result = await resp.json();
    if (result.ok && result.link) {
      const o = _todosPedidos.find(x => x.id === orderId);
      if (o) o.payment_url = result.link;
      if (btn) btn.outerHTML = `<a href="${result.link}" target="_blank" class="btn btn-primary" style="margin-bottom:10px">Efetuar pagamento ↗</a>`;
      showToast('Link encontrado!', 'success');
    } else {
      showToast('Não foi possível recuperar o link.', 'error');
      if (btn) { btn.disabled=false; btn.textContent='Gerar link de pagamento'; }
    }
  } catch(e) {
    showToast('Erro: '+e.message, 'error');
    if (btn) { btn.disabled=false; btn.textContent='Gerar link de pagamento'; }
  }
}

// ════════════════════════════════════════════
// AVISOS
// ════════════════════════════════════════════
async function renderAvisos() {
  const { data } = await _supabase
    .from('messages').select('*').eq('is_broadcast', true).order('created_at', { ascending: false });

  document.getElementById('conteudo').innerHTML = `
    <div style="margin-bottom:20px">
      <h2 style="font-size:20px;font-weight:700;color:var(--nb-text-hi)">Avisos da IRES</h2>
      <p style="font-size:13px;color:var(--gray);margin-top:4px">Comunicados enviados para todas as embaixadoras</p>
    </div>
    ${(data||[]).length ? data.map(a => `
      <div class="card" style="margin-bottom:12px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;gap:12px">
          <div style="font-size:14px;font-weight:700">${s(a.subject)||'Aviso'}</div>
          <div style="font-size:11px;color:var(--gray);white-space:nowrap">${new Date(a.created_at).toLocaleDateString('pt-BR')}</div>
        </div>
        <p style="font-size:13px;color:var(--gray-lighter);line-height:1.7">${s(a.body)}</p>
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

// ════════════════════════════════════════════
// DEPOIMENTOS (absorvido do comunidade.html)
// ════════════════════════════════════════════
async function renderDepoimentos() {
  const [{ data: todos }, { data: meus }] = await Promise.all([
    _supabase.from('testimonials').select('*, profiles(full_name)').eq('status','approved').order('created_at',{ascending:false}),
    _supabase.from('testimonials').select('*').eq('reseller_id',_perfil.id).order('created_at',{ascending:false}),
  ]);

  _garantirModalComunidade();

  document.getElementById('conteudo').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <div>
        <h2 style="font-size:20px;font-weight:700;color:var(--nb-text-hi)">Depoimentos</h2>
        <p style="font-size:12px;color:var(--gray);margin-top:3px">O que as embaixadoras estão dizendo</p>
      </div>
      <button class="btn btn-primary btn-sm" style="width:auto" onclick="abrirFormDepoimento()">+ Meu depoimento</button>
    </div>
    ${(meus||[]).filter(m=>m.status==='pending').length ? `
      <div class="info-box" style="margin-bottom:20px">
        <div class="info-box-dot"></div>
        <p>Você tem <strong>${meus.filter(m=>m.status==='pending').length} depoimento(s)</strong> aguardando aprovação.</p>
      </div>
    ` : ''}
    <div style="display:flex;flex-direction:column;gap:14px">
      ${(todos||[]).length ? todos.map(t => _depoimentoCard(t)).join('') : `
        <div class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gray)" stroke-width="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          <p>Nenhum depoimento ainda. Seja a primeira!</p>
        </div>
      `}
    </div>
  `;
}

function _depoimentoCard(t) {
  const nome    = t.profiles?.full_name || 'Embaixadora';
  const inicial = nome.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  return `
    <div class="card">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
        <div class="avatar">${inicial}</div>
        <div>
          <div style="font-size:13px;font-weight:700">${s(nome)}</div>
          <div style="font-size:11px;color:var(--gray)">${new Date(t.created_at).toLocaleDateString('pt-BR')}</div>
        </div>
        <span class="pill pill-pink" style="margin-left:auto">Embaixadora</span>
      </div>
      ${t.image_url ? `
        <div onclick="abrirLightboxDep('${t.image_url}')"
          style="border-radius:var(--radius-md);overflow:hidden;margin-bottom:12px;height:180px;cursor:zoom-in;position:relative;background:var(--creme2)">
          <img src="${t.image_url}" style="width:100%;height:100%;object-fit:cover;display:block"/>
          <div style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.6);border-radius:6px;padding:4px 8px;font-size:10px;color:#fff">Clique para ampliar</div>
        </div>
      ` : ''}
      <p style="font-size:13px;color:var(--gray-lighter);line-height:1.7">${s(t.body)}</p>
    </div>
  `;
}

function abrirLightboxDep(url) {
  let lb = document.getElementById('lightbox-dep');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'lightbox-dep';
    lb.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;cursor:zoom-out';
    document.body.appendChild(lb);
  }
  lb.innerHTML = `
    <div style="position:relative;max-width:90vw;max-height:90vh">
      <img src="${url}" style="max-width:100%;max-height:90vh;border-radius:var(--radius-lg);display:block;object-fit:contain"/>
      <button onclick="document.getElementById('lightbox-dep').remove();document.body.style.overflow=''"
        style="position:absolute;top:-14px;right:-14px;width:30px;height:30px;border-radius:50%;background:var(--bord);border:none;color:var(--ouro-cl);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:700">✕</button>
    </div>
  `;
  lb.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  lb.onclick = (e) => { if (e.target === lb) { lb.remove(); document.body.style.overflow=''; } };
}

function _garantirModalComunidade() {
  if (!document.getElementById('modal-comunidade')) {
    const m = document.createElement('div');
    m.id = 'modal-comunidade';
    m.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:999;align-items:flex-start;justify-content:center;padding:24px 16px;overflow-y:auto';
    m.innerHTML = '<div id="modal-comunidade-body" class="card" style="max-width:480px;width:100%;position:relative;margin:auto"></div>';
    m.onclick = (e) => { if (e.target === m) _fecharModalComunidade(); };
    document.body.appendChild(m);
  }
}

function _fecharModalComunidade() {
  const m = document.getElementById('modal-comunidade');
  if (m) m.style.display = 'none';
  document.body.style.overflow = '';
}

function abrirFormDepoimento() {
  _garantirModalComunidade();
  document.getElementById('modal-comunidade-body').innerHTML = `
    <button onclick="_fecharModalComunidade()" style="position:absolute;top:12px;right:12px;background:none;border:none;color:var(--gray);cursor:pointer;font-size:20px">✕</button>
    <h3 style="font-size:16px;font-weight:800;margin-bottom:6px">Compartilhar depoimento</h3>
    <p style="font-size:12px;color:var(--gray);margin-bottom:16px">Será analisado e publicado após aprovação da IRES.</p>
    <div class="form-group">
      <label>Seu depoimento *</label>
      <textarea id="dep-texto" rows="5" placeholder="Conte sua experiência..." style="resize:vertical"></textarea>
    </div>
    <div class="form-group">
      <label>Foto (opcional)</label>
      <div onclick="document.getElementById('dep-foto').click()"
        style="border:0.5px dashed var(--border);border-radius:var(--radius-md);padding:20px;text-align:center;cursor:pointer;background:var(--creme2)"
        onmouseover="this.style.borderColor='var(--pink)'" onmouseout="this.style.borderColor='var(--border)'">
        <div id="dep-foto-preview">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gray)" stroke-width="1.5" style="margin-bottom:6px"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <div style="font-size:12px;color:var(--gray)">Clique para adicionar uma foto</div>
        </div>
        <div id="dep-upload-progress" style="display:none;margin-top:8px">
          <div style="height:3px;background:var(--border);border-radius:2px;overflow:hidden">
            <div id="dep-upload-bar" style="height:100%;width:0%;background:var(--pink);transition:width 0.3s"></div>
          </div>
        </div>
      </div>
      <input type="file" id="dep-foto" accept="image/*" style="display:none" onchange="uploadFotoDepoimento(this.files[0])"/>
      <input type="hidden" id="dep-foto-url"/>
    </div>
    <div style="display:flex;gap:10px;margin-top:4px">
      <button class="btn btn-outline" style="flex:1" onclick="_fecharModalComunidade()">Cancelar</button>
      <button class="btn btn-primary" style="flex:1" id="btn-dep" onclick="enviarDepoimento()">Enviar depoimento</button>
    </div>
  `;
  document.getElementById('modal-comunidade').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

async function uploadFotoDepoimento(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('Selecione uma imagem.','error'); return; }
  if (file.size > 5*1024*1024) { showToast('Imagem máximo 5MB.','error'); return; }
  document.getElementById('dep-upload-progress').style.display = 'block';
  document.getElementById('dep-upload-bar').style.width = '40%';
  document.getElementById('btn-dep').disabled = true;
  const ext  = file.name.split('.').pop();
  const name = `dep_${Date.now()}.${ext}`;
  const { error } = await _supabase.storage.from('depoimentos').upload(name, file, { cacheControl:'3600', upsert:false });
  if (error) { showToast('Erro no upload.','error'); return; }
  document.getElementById('dep-upload-bar').style.width = '100%';
  const { data: { publicUrl } } = _supabase.storage.from('depoimentos').getPublicUrl(name);
  document.getElementById('dep-foto-url').value = publicUrl;
  document.getElementById('dep-foto-preview').innerHTML = `
    <img src="${publicUrl}" style="max-height:120px;border-radius:8px;margin:0 auto;display:block"/>
    <div style="font-size:11px;color:var(--green);margin-top:6px">Foto adicionada!</div>`;
  setTimeout(() => { document.getElementById('dep-upload-progress').style.display='none'; document.getElementById('btn-dep').disabled=false; }, 500);
}

async function enviarDepoimento() {
  const body = document.getElementById('dep-texto').value.trim();
  const img  = document.getElementById('dep-foto-url').value;
  if (!body) { showToast('Escreva seu depoimento.','error'); return; }
  const btn = document.getElementById('btn-dep');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="margin:0 auto"></div>';
  const { error } = await _supabase.from('testimonials').insert({ reseller_id:_perfil.id, body, image_url:img||null, status:'pending' });
  if (error) { showToast('Erro ao enviar.','error'); btn.disabled=false; btn.textContent='Enviar depoimento'; return; }
  showToast('Depoimento enviado! Aguardando aprovação.','success');
  _fecharModalComunidade();
  renderDepoimentos();
}

// ════════════════════════════════════════════
// SUPORTE (absorvido do comunidade.html)
// ════════════════════════════════════════════
async function renderSuporte() {
  const { data } = await _supabase
    .from('support_messages').select('*').eq('reseller_id',_perfil.id).order('created_at',{ascending:false});

  _garantirModalComunidade();

  document.getElementById('conteudo').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <div>
        <h2 style="font-size:20px;font-weight:700;color:var(--nb-text-hi)">Fale com a IRES</h2>
        <p style="font-size:12px;color:var(--gray);margin-top:3px">Tire dúvidas ou envie sugestões</p>
      </div>
      <button class="btn btn-primary btn-sm" style="width:auto" onclick="abrirFormSuporte()">+ Nova mensagem</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${(data||[]).length ? data.map(m => _suporteCard(m)).join('') : `
        <div class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gray)" stroke-width="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          <p>Nenhuma mensagem ainda.</p>
          <button class="btn btn-primary btn-sm" style="width:auto;margin-top:14px" onclick="abrirFormSuporte()">Enviar primeira mensagem</button>
        </div>
      `}
    </div>
  `;
}

function _suporteCard(m) {
  const statusMap = {
    open:     { label:'Aguardando', cls:'pill-amber' },
    answered: { label:'Respondido', cls:'pill-green' },
    closed:   { label:'Encerrado',  cls:'pill-gray'  },
  };
  const st = statusMap[m.status] || statusMap.open;
  return `
    <div class="card">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px">
        <div style="font-size:13px;font-weight:700">${s(m.subject)}</div>
        <span class="pill ${st.cls}" style="flex-shrink:0">${st.label}</span>
      </div>
      <p style="font-size:12px;color:var(--gray);line-height:1.6;margin-bottom:8px">${s(m.body.slice(0,100))}${m.body.length>100?'...':''}</p>
      <div style="font-size:11px;color:var(--gray)">${new Date(m.created_at).toLocaleDateString('pt-BR')}</div>
      ${m.reply ? `
        <div style="border-top:0.5px solid var(--border);margin-top:10px;padding-top:10px">
          <div style="font-size:10px;font-weight:700;color:var(--pink);text-transform:uppercase;letter-spacing:1px;margin-bottom:5px">Resposta da IRES</div>
          <p style="font-size:12px;color:var(--gray-lighter);line-height:1.6">${s(m.reply)}</p>
        </div>
      ` : ''}
    </div>
  `;
}

function abrirFormSuporte() {
  _garantirModalComunidade();
  document.getElementById('modal-comunidade-body').innerHTML = `
    <button onclick="_fecharModalComunidade()" style="position:absolute;top:12px;right:12px;background:none;border:none;color:var(--gray);cursor:pointer;font-size:20px">✕</button>
    <h3 style="font-size:16px;font-weight:800;margin-bottom:6px">Nova mensagem</h3>
    <p style="font-size:12px;color:var(--gray);margin-bottom:16px">A equipe IRES responderá em breve.</p>
    <div class="form-group">
      <label>Assunto *</label>
      <select id="sup-assunto">
        <option value="" disabled selected>Selecione</option>
        <option>Dúvida sobre pedido</option>
        <option>Problema com produto</option>
        <option>Dúvida sobre pagamento</option>
        <option>Sugestão</option>
        <option>Outro</option>
      </select>
    </div>
    <div class="form-group">
      <label>Mensagem *</label>
      <textarea id="sup-body" rows="5" placeholder="Descreva sua dúvida..." style="resize:vertical"></textarea>
    </div>
    <div style="display:flex;gap:10px;margin-top:4px">
      <button class="btn btn-outline" style="flex:1" onclick="_fecharModalComunidade()">Cancelar</button>
      <button class="btn btn-primary" style="flex:1" id="btn-sup" onclick="enviarSuporte()">Enviar mensagem</button>
    </div>
  `;
  document.getElementById('modal-comunidade').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

async function enviarSuporte() {
  const subject = document.getElementById('sup-assunto').value;
  const body    = document.getElementById('sup-body').value.trim();
  if (!subject) { showToast('Selecione o assunto.','error'); return; }
  if (!body)    { showToast('Escreva sua mensagem.','error'); return; }
  const btn = document.getElementById('btn-sup');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="margin:0 auto"></div>';
  const { error } = await _supabase.from('support_messages').insert({ reseller_id:_perfil.id, subject, body, status:'open' });
  if (error) { showToast('Erro ao enviar.','error'); btn.disabled=false; btn.textContent='Enviar mensagem'; return; }
  showToast('Mensagem enviada! A IRES responderá em breve.','success');
  _fecharModalComunidade();
  renderSuporte();
}

// ════════════════════════════════════════════
// VITRINE
// ════════════════════════════════════════════
let _todosProdutos = [];
let _categoriaAtiva = '';

async function renderVitrine() {
  const meuNivel  = _perfil.nivel || 'bronze';
  const NIVEL_PRATA = 5;
  const NIVEL_OURO  = 15;
  const corDot = meuNivel === 'ouro' ? '#C8A96E' : meuNivel === 'prata' ? '#A8A9AD' : '#CD7F32';
  const corBorder = meuNivel === 'ouro' ? 'rgba(200,169,110,.3)' : meuNivel === 'prata' ? 'rgba(168,169,173,.3)' : 'rgba(205,127,50,.3)';
  const nivelLabel = {bronze:'Bronze',prata:'Prata',ouro:'Ouro'}[meuNivel];

  // Conta pedidos pagos para barra de progresso
  const { count: totalPagosVitrine } = await _supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('reseller_id', _perfil.id)
    .in('status', ['paid','processing','shipped','delivered']);

  const totalPagos = totalPagosVitrine || 0;
  const prox = meuNivel === 'bronze' ? { nome:'Prata', faltam: NIVEL_PRATA }
             : meuNivel === 'prata'  ? { nome:'Ouro',  faltam: NIVEL_OURO  }
             : null;
  const pct = prox ? Math.min(100, Math.round((totalPagos / prox.faltam) * 100)) : 100;

  document.getElementById('conteudo').innerHTML = `
    <div style="background:#fff;border:0.5px solid ${corBorder};border-radius:10px;padding:8px 12px;display:flex;align-items:center;gap:10px;margin-bottom:12px;">
      <div style="width:8px;height:8px;border-radius:50%;background:${corDot};flex-shrink:0;"></div>
      <div style="font-size:12px;font-weight:500;color:#3D0E20;flex-shrink:0;">${nivelLabel}</div>
      <div style="flex:1;height:6px;background:#EDD9C0;border-radius:99px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:${corDot};border-radius:99px;transition:width .4s ease;"></div>
      </div>
      <div style="font-size:10px;color:#A0622A;white-space:nowrap;flex-shrink:0;">${prox ? `${totalPagos}/${prox.faltam} para ${prox.nome}` : 'Nível máximo 🏆'}</div>
    </div>
    <div style="position:relative;margin-bottom:10px;">
      <div id="filters-row" style="display:flex;gap:7px;overflow-x:auto;padding-bottom:2px;padding-right:40px;scrollbar-width:none;-webkit-overflow-scrolling:touch;align-items:center;">
        <div class="filter-pill active" id="filtro-todos" onclick="setFiltroCatPainel(this,'')">Todos</div>
        <div id="filtros-cat" style="display:flex;gap:7px;flex-shrink:0;"></div>
      </div>
      <div id="filters-fade" style="position:absolute;top:0;right:0;bottom:0;width:48px;background:linear-gradient(to right,transparent,var(--creme) 75%);pointer-events:none;display:flex;align-items:center;justify-content:flex-end;padding-right:6px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B6050" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    </div>
    <input type="text" id="busca-vitrine" placeholder="Buscar produto..."
      style="width:100%;background:#fff;border:0.5px solid #E8D9C5;border-radius:20px;padding:7px 14px;font-size:13px;color:#2C1018;outline:none;margin-bottom:14px;"
      oninput="filtrarProdutosPainel()"/>
    <div id="loading-vitrine" class="loading"><div class="spinner"></div> Carregando...</div>
    <div class="products-grid" id="grid-vitrine" style="display:none"></div>
    <div class="empty-state" id="empty-vitrine" style="display:none">
      <div class="empty-state-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--bord)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg></div>
      <div class="empty-state-title">Nenhum produto encontrado</div>
    </div>
  `;

  if (!document.getElementById('modal-produto')) {
    const m = document.createElement('div');
    m.id = 'modal-produto';
    m.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:999;align-items:center;justify-content:center;padding:16px';
    m.onclick = (e) => { if (e.target === m) { m.style.display='none'; document.body.style.overflow=''; } };
    document.body.appendChild(m);
  }

  // Oculta seta quando scroll chega ao fim
  setTimeout(() => {
    const row = document.getElementById('filters-row');
    const fade = document.getElementById('filters-fade');
    if (row && fade) {
      row.addEventListener('scroll', () => {
        fade.style.opacity = (row.scrollLeft + row.clientWidth >= row.scrollWidth - 10) ? '0' : '1';
      }, { passive: true });
    }
  }, 300);

  const [{ data: cats }, { data: prods }] = await Promise.all([
    _supabase.from('categories').select('id,name').order('name'),
    _supabase.from('products').select('*, categories(name)').eq('is_active',true).order('created_at',{ascending:false}),
  ]);

  _todosProdutos = prods || [];
  document.getElementById('loading-vitrine').style.display = 'none';
  const totalEl = document.getElementById('total-produtos');
  if (totalEl) totalEl.textContent = _todosProdutos.length;

  const filtrosCat = document.getElementById('filtros-cat');
  (cats||[]).forEach(c => {
    const el = document.createElement('div');
    el.className = 'filter-pill';
    el.textContent = c.name;
    el.onclick = () => {
      _categoriaAtiva = c.id;
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      el.classList.add('active');
      filtrarProdutosPainel();
    };
    filtrosCat.appendChild(el);
  });

  document.getElementById('filtro-todos').onclick = () => {
    _categoriaAtiva = '';
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    document.getElementById('filtro-todos').classList.add('active');
    filtrarProdutosPainel();
  };

  filtrarProdutosPainel();
}

function setFiltroCatPainel(el, filtro) {
  _categoriaAtiva = '';
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  filtrarProdutosPainel();
}

function filtrarProdutosPainel() {
  const busca = (document.getElementById('busca-vitrine')?.value||'').toLowerCase().trim();
  const lista = _todosProdutos.filter(p => {
    const matchCat   = !_categoriaAtiva || p.category_id === _categoriaAtiva;
    const matchBusca = !busca || p.name.toLowerCase().includes(busca) || (p.description||'').toLowerCase().includes(busca);
    return matchCat && matchBusca;
  });
  const grid  = document.getElementById('grid-vitrine');
  const empty = document.getElementById('empty-vitrine');
  if (!lista.length) { grid.style.display='none'; empty.style.display='block'; return; }
  grid.style.display='grid'; empty.style.display='none';
  grid.innerHTML = lista.map(p => {
    const img     = p.images?.[0]||'';
    const catNome = p.categories?.name||'';
    return `
      <div class="product-card" onclick="abrirProdutoPainel('${p.id}')">
        <div class="product-img">
          ${img ? `<img src="${s(img)}" alt="${s(p.name)}" loading="lazy"/>` : `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`}
          ${catNome ? `<div class="product-tag"><span class="pill pill-pink">${catNome}</span></div>` : ''}
        </div>
        <div class="product-info">
          <div class="product-name">${s(p.name)}</div>
          <div class="product-desc">${p.description||''}</div>
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
  const p      = _todosProdutos.find(x => x.id === id);
  if (!p) return;
  const modal  = document.getElementById('modal-produto');
  const imgs   = Array.isArray(p.images) && p.images.length ? p.images : [];
  const sizes  = Array.isArray(p.sizes)  && p.sizes.length  ? p.sizes  : [];
  const colors = Array.isArray(p.colors) && p.colors.length ? p.colors : [];
  const hasVariations = sizes.length > 0 || colors.length > 0;

  // ── Grade de variações: qty por linha (tamanho × cor) ──
  function buildVariationGrid() {
    if (!hasVariations) return '';

    // Caso: só tamanho, sem cor
    if (sizes.length && !colors.length) {
      return `
        <div style="margin-bottom:16px;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--gray);margin-bottom:10px;">Tamanho e quantidade</div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${sizes.map(sz => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--creme2);border-radius:8px;">
                <span style="font-size:13px;font-weight:600;color:var(--bord-esc);min-width:40px;">${s(sz)}</span>
                <div style="display:flex;align-items:center;gap:8px;">
                  <button onclick="_varQty('${s(sz)}','',false)" style="width:26px;height:26px;border-radius:50%;border:1px solid var(--border);background:#fff;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;">−</button>
                  <span id="vqty-${s(sz)}-" style="min-width:20px;text-align:center;font-size:13px;font-weight:700;color:var(--bord-esc);">0</span>
                  <button onclick="_varQty('${s(sz)}','',true)" style="width:26px;height:26px;border-radius:50%;border:1px solid var(--border);background:#fff;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;">+</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Caso: só cor, sem tamanho
    if (colors.length && !sizes.length) {
      return `
        <div style="margin-bottom:16px;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--gray);margin-bottom:10px;">Cor e quantidade</div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${colors.map(cor => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--creme2);border-radius:8px;">
                <span style="font-size:13px;font-weight:600;color:var(--bord-esc);">${s(cor)}</span>
                <div style="display:flex;align-items:center;gap:8px;">
                  <button onclick="_varQty('',${JSON.stringify(cor)},false)" style="width:26px;height:26px;border-radius:50%;border:1px solid var(--border);background:#fff;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;">−</button>
                  <span id="vqty--${s(cor).replace(/\s/g,'_')}" style="min-width:20px;text-align:center;font-size:13px;font-weight:700;color:var(--bord-esc);">0</span>
                  <button onclick="_varQty('',${JSON.stringify(cor)},true)" style="width:26px;height:26px;border-radius:50%;border:1px solid var(--border);background:#fff;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;">+</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Caso: tamanho + cor — grade completa
    return `
      <div style="margin-bottom:16px;">
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--gray);margin-bottom:10px;">Tamanho / Cor — quantidade por combinacao</div>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr>
                <th style="text-align:left;padding:6px 8px;color:var(--gray);font-weight:600;border-bottom:1px solid var(--border);">Cor</th>
                ${sizes.map(sz => `<th style="text-align:center;padding:6px 8px;color:var(--bord-esc);font-weight:700;border-bottom:1px solid var(--border);">${s(sz)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${colors.map(cor => `
                <tr style="border-bottom:.5px solid var(--border);">
                  <td style="padding:8px 8px;color:var(--bord-esc);font-weight:600;white-space:nowrap;">${s(cor)}</td>
                  ${sizes.map(sz => `
                    <td style="text-align:center;padding:6px 4px;">
                      <div style="display:flex;align-items:center;justify-content:center;gap:4px;">
                        <button onclick="_varQty('${s(sz)}',${JSON.stringify(cor)},false)" style="width:22px;height:22px;border-radius:50%;border:1px solid var(--border);background:#fff;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">−</button>
                        <span id="vqty-${s(sz)}-${s(cor).replace(/\s/g,'_')}" style="min-width:18px;text-align:center;font-weight:700;color:var(--bord-esc);">0</span>
                        <button onclick="_varQty('${s(sz)}',${JSON.stringify(cor)},true)" style="width:22px;height:22px;border-radius:50%;border:1px solid var(--border);background:#fff;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">+</button>
                      </div>
                    </td>
                  `).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ── Sem variações: seletor simples de quantidade ──
  function buildSimpleQty() {
    if (hasVariations) return '';
    return `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <label style="font-size:11px;color:var(--gray);text-transform:uppercase;letter-spacing:1px;">Quantidade</label>
        <button class="qty-btn" onclick="ajustarQtyPainel(-1,${p.min_quantity})">-</button>
        <span class="qty-value" id="pmodal-qty">${p.min_quantity}</span>
        <button class="qty-btn" onclick="ajustarQtyPainel(1,${p.min_quantity})">+</button>
        <span style="font-size:12px;color:var(--pink);font-weight:700" id="pmodal-sub">${formatBRL(p.price*p.min_quantity)}</span>
      </div>
    `;
  }

  modal.innerHTML = `
    <div class="card" style="max-width:480px;width:100%;position:relative;max-height:90vh;overflow-y:auto;">
      <button onclick="document.getElementById('modal-produto').style.display='none';document.body.style.overflow=''"
        style="position:absolute;top:12px;right:12px;z-index:10;background:var(--bord);border:none;color:var(--ouro-cl);cursor:pointer;font-size:18px;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center">x</button>

      <div style="background:var(--black);border-radius:var(--radius-md);margin-bottom:16px;overflow:hidden;position:relative;">
        ${imgs.length ? `
          <div id="carousel-track" style="display:flex;transition:transform 0.3s ease">
            ${imgs.map(url=>`<div style="min-width:100%;flex-shrink:0"><img src="${url}" style="width:100%;height:auto;display:block;max-height:280px;object-fit:contain"/></div>`).join('')}
          </div>
          ${imgs.length>1 ? `
            <button onclick="moverCarrosselPainel(-1)" style="position:absolute;left:8px;top:40%;background:var(--bord-esc);border:none;color:var(--ouro-cl);width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px;">&#8249;</button>
            <button onclick="moverCarrosselPainel(1)" style="position:absolute;right:8px;top:40%;background:var(--bord-esc);border:none;color:var(--ouro-cl);width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px;">&#8250;</button>
          ` : ''}
        ` : `<div style="height:180px;display:flex;align-items:center;justify-content:center"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg></div>`}
      </div>

      ${imgs.length>1 ? `<div style="display:flex;gap:6px;margin-bottom:14px;overflow-x:auto">${imgs.map((url,i)=>`<img src="${url}" onclick="moverParaSlidePainel(${i})" id="pthumb-${i}" style="width:48px;height:48px;object-fit:cover;border-radius:6px;cursor:pointer;border:2px solid ${i===0?'var(--pink)':'transparent'};flex-shrink:0"/>`).join('')}</div>` : ''}

      <h3 style="font-size:16px;font-weight:800;margin-bottom:4px;">${s(p.name)}</h3>
      ${p.description ? `<p style="font-size:12px;color:var(--gray);margin-bottom:12px;line-height:1.5;">${s(p.description)}</p>` : ''}

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding:10px 14px;background:var(--creme2);border-radius:10px;">
        <div><div style="font-size:20px;font-weight:900;">${formatBRL(p.price)}</div><div style="font-size:11px;color:var(--gray);">por unidade</div></div>
        <div style="font-size:11px;color:var(--gray);text-align:right;">Minimo <strong style="color:var(--bord-esc);">${p.min_quantity} un.</strong></div>
      </div>

      ${buildVariationGrid()}
      ${buildSimpleQty()}

      <div id="pmodal-total-wrap" style="display:none;padding:10px 14px;background:var(--creme2);border-radius:10px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:12px;color:var(--gray);">Total selecionado</span>
        <span id="pmodal-total-val" style="font-size:16px;font-weight:800;color:var(--bord-esc);">${formatBRL(0)}</span>
      </div>

      <button class="btn btn-primary" onclick="adicionarDoModalPainel('${p.id}')">Adicionar ao carrinho</button>
    </div>
  `;

  window._carouselIdxP   = 0;
  window._carouselTotalP = imgs.length;
  window._pmodalVars     = {}; // { 'G|Preto': 2, 'M|Vermelho': 1, ... }
  window._pmodalProdId   = id;
  modal.style.display    = 'flex';
  document.body.style.overflow = 'hidden';
}

function _varQty(size, color, add) {
  const key    = `${size}|${color}`;
  const elId   = `vqty-${size}-${(color||'').replace(/\s/g,'_')}`;
  const el     = document.getElementById(elId);
  if (!el) return;

  const current = window._pmodalVars[key] || 0;
  const next    = add ? current + 1 : Math.max(0, current - 1);
  window._pmodalVars[key] = next;
  el.textContent = next;

  // Destaca visualmente a linha se tem quantidade
  el.style.color = next > 0 ? 'var(--pink)' : 'var(--bord-esc)';

  // Atualiza total
  const p = _todosProdutos.find(x => x.id === window._pmodalProdId);
  if (!p) return;
  const totalQty = Object.values(window._pmodalVars).reduce((a,b) => a+b, 0);
  const totalVal = totalQty * parseFloat(p.price);
  const wrap = document.getElementById('pmodal-total-wrap');
  const valEl = document.getElementById('pmodal-total-val');
  if (wrap) wrap.style.display = totalQty > 0 ? 'flex' : 'none';
  if (valEl) valEl.textContent = formatBRL(totalVal);
}

function moverCarrosselPainel(dir) {
  const total = window._carouselTotalP||1;
  window._carouselIdxP = ((window._carouselIdxP||0)+dir+total)%total;
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
  let qty = parseInt(el.textContent)+delta;
  if (qty < min) qty = min;
  el.textContent = qty;
  const btn = document.querySelector('[onclick^="adicionarDoModalPainel"]');
  const id  = btn?.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
  const p   = _todosProdutos.find(x => x.id === id);
  if (p && sub) sub.textContent = formatBRL(p.price*qty);
}
function adicionarDoModalPainel(id) {
  const p      = _todosProdutos.find(x => x.id === id);
  if (!p) return;
  const sizes  = Array.isArray(p.sizes)  && p.sizes.length  ? p.sizes  : [];
  const colors = Array.isArray(p.colors) && p.colors.length ? p.colors : [];
  const hasVariations = sizes.length > 0 || colors.length > 0;

  if (hasVariations) {
    // Modo grade: adiciona todos os itens com qty > 0
    const vars   = window._pmodalVars || {};
    const itens  = Object.entries(vars).filter(([,qty]) => qty > 0);

    if (!itens.length) { showToast('Informe a quantidade para pelo menos uma variacao.','error'); return; }

    // Valida quantidade minima total
    const totalQty = itens.reduce((acc,[,qty]) => acc+qty, 0);
    if (totalQty < p.min_quantity) {
      showToast(`Quantidade minima: ${p.min_quantity} unidades no total.`,'error'); return;
    }

    itens.forEach(([key, qty]) => {
      const [size, color] = key.split('|');
      addToCart({ ...p, _size: size||null, _color: color||null }, qty);
    });

  } else {
    // Modo simples
    const qty = parseInt(document.getElementById('pmodal-qty')?.textContent || p.min_quantity);
    addToCart(p, qty);
  }

  document.getElementById('modal-produto').style.display = 'none';
  document.body.style.overflow = '';
}


// ════════════════════════════════════════════
// PERFIL
// ════════════════════════════════════════════
async function renderPerfil() {
  const { data: p } = await _supabase.from('profiles').select('*').eq('id',_perfil.id).single();
  const addr = p.address || {};

  document.getElementById('conteudo').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <h2 style="font-size:20px;font-weight:700;color:var(--nb-text-hi)">Meu perfil</h2>
    </div>
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
      <div style="position:relative">
        <div id="avatar-preview" style="width:72px;height:72px;border-radius:50%;background:var(--pink-faint);border:2px solid var(--pink);overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:var(--pink);cursor:pointer" onclick="document.getElementById('avatar-file').click()">
          ${p.avatar_url ? `<img src="${p.avatar_url}" style="width:100%;height:100%;object-fit:cover"/>` : initials(p.full_name)}
        </div>
        <div onclick="document.getElementById('avatar-file').click()" style="position:absolute;bottom:0;right:0;width:22px;height:22px;border-radius:50%;background:var(--pink);display:flex;align-items:center;justify-content:center;cursor:pointer">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </div>
      </div>
      <div>
        <div style="font-size:15px;font-weight:700">${p.full_name||''}</div>
        <div style="font-size:12px;color:var(--gray);margin-top:2px">Clique na foto para alterar</div>
        <div id="avatar-progress" style="display:none;margin-top:6px">
          <div style="height:3px;background:var(--border);border-radius:2px;width:120px;overflow:hidden">
            <div id="avatar-bar" style="height:100%;width:0%;background:var(--pink);transition:width 0.3s"></div>
          </div>
        </div>
      </div>
      <input type="file" id="avatar-file" accept="image/*" style="display:none" onchange="uploadAvatar(this.files[0])"/>
    </div>
    <div class="card" style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:14px">Dados pessoais</div>
      <div class="form-group"><label>Nome completo *</label><input type="text" id="pf-nome" value="${p.full_name||''}"/></div>
      <div class="form-row">
        <div class="form-group"><label>WhatsApp *</label><input type="tel" id="pf-phone" value="${p.phone||''}" placeholder="(21) 99999-9999" oninput="mascaraTel(this)"/></div>
        <div class="form-group"><label>E-mail *</label><input type="email" id="pf-email" value="${p.email||''}"/></div>
      </div>
    </div>
    <div class="card" style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:14px">Endereço de entrega</div>
      <div class="form-row">
        <div class="form-group">
          <label>CEP</label>
          <div style="position:relative">
            <input type="text" id="pf-cep" value="${addr.cep||''}" placeholder="00000-000" maxlength="9" oninput="mascaraCEP(this)" onblur="buscarCEP(this.value)"/>
            <div id="cep-loading" style="display:none;position:absolute;right:10px;top:50%;transform:translateY(-50%)"><div class="spinner" style="width:14px;height:14px"></div></div>
          </div>
        </div>
        <div class="form-group"><label>Estado</label><input type="text" id="pf-estado" value="${addr.estado||''}" placeholder="RJ" maxlength="2"/></div>
      </div>
      <div class="form-group"><label>Rua / Logradouro</label><input type="text" id="pf-rua" value="${addr.rua||''}" placeholder="Rua das Flores"/></div>
      <div class="form-row">
        <div class="form-group"><label>Número</label><input type="text" id="pf-numero" value="${addr.numero||''}" placeholder="123"/></div>
        <div class="form-group"><label>Complemento</label><input type="text" id="pf-complemento" value="${addr.complemento||''}" placeholder="Apto 4"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Bairro</label><input type="text" id="pf-bairro" value="${addr.bairro||''}" placeholder="Centro"/></div>
        <div class="form-group"><label>Cidade</label><input type="text" id="pf-cidade" value="${addr.cidade||''}" placeholder="Rio de Janeiro"/></div>
      </div>
    </div>
    <button class="btn btn-primary" id="btn-salvar-perfil" onclick="salvarPerfil()">Salvar alterações</button>
  `;
}

async function uploadAvatar(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('Selecione uma imagem.','error'); return; }
  if (file.size > 3*1024*1024) { showToast('Máximo 3MB.','error'); return; }
  document.getElementById('avatar-progress').style.display = 'block';
  document.getElementById('avatar-bar').style.width = '40%';
  const ext  = file.name.split('.').pop();
  const name = `avatar_${_perfil.id}.${ext}`;
  const { error } = await _supabase.storage.from('depoimentos').upload(name, file, { upsert:true, cacheControl:'3600' });
  if (error) { showToast('Erro no upload.','error'); return; }
  document.getElementById('avatar-bar').style.width = '100%';
  const { data: { publicUrl } } = _supabase.storage.from('depoimentos').getPublicUrl(name);
  await _supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', _perfil.id);
  _perfil.avatar_url = publicUrl;
  document.getElementById('avatar-preview').innerHTML = `<img src="${publicUrl}" style="width:100%;height:100%;object-fit:cover"/>`;
  setTimeout(() => { document.getElementById('avatar-progress').style.display='none'; }, 500);
  showToast('Foto atualizada!', 'success');
}

function mascaraTel(input) {
  let v = input.value.replace(/\D/g,'').slice(0,11);
  if (v.length>6) v=`(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
  else if (v.length>2) v=`(${v.slice(0,2)}) ${v.slice(2)}`;
  else if (v.length>0) v=`(${v}`;
  input.value = v;
}

function mascaraCEP(input) {
  let v = input.value.replace(/\D/g,'').slice(0,8);
  if (v.length>5) v=`${v.slice(0,5)}-${v.slice(5)}`;
  input.value = v;
}

async function buscarCEP(cep) {
  const digits = cep.replace(/\D/g,'');
  if (digits.length !== 8) return;
  document.getElementById('cep-loading').style.display = 'flex';
  try {
    const resp = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    const data = await resp.json();
    if (data.erro) { showToast('CEP não encontrado.','error'); return; }
    document.getElementById('pf-rua').value    = data.logradouro||'';
    document.getElementById('pf-bairro').value = data.bairro||'';
    document.getElementById('pf-cidade').value = data.localidade||'';
    document.getElementById('pf-estado').value = data.uf||'';
    document.getElementById('pf-numero').focus();
    showToast('Endereço preenchido!', 'success');
  } catch { showToast('Erro ao buscar CEP.','error'); }
  finally  { document.getElementById('cep-loading').style.display = 'none'; }
}

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
  const { error } = await _supabase.from('profiles').update({ full_name:nome, phone, email, address }).eq('id',_perfil.id);
  if (error) { showToast('Erro: '+error.message,'error'); btn.disabled=false; btn.textContent='Salvar alterações'; return; }
  _perfil.full_name=nome; _perfil.phone=phone; _perfil.email=email; _perfil.address=address;
  showToast('Perfil atualizado!', 'success');
  btn.disabled=false; btn.textContent='Salvar alterações';
}
// ============================================
// IRES — painel.js PATCH
// Adicionar estas duas funções ao painel.js
// existente, antes do último fechamento.
// Também atualizar irAba() para incluir
// 'criativos' e 'capacitacao' no mapa de ações.
// ============================================

// ── Atualização necessária no irAba() existente ──
// Substituir a linha do objeto `acoes` por:
//
// const acoes = {
//   painel:      renderInicio,
//   vitrine:     renderVitrine,
//   pedidos:     renderPedidos,
//   avisos:      renderAvisos,
//   perfil:      renderPerfil,
//   depoimentos: renderDepoimentos,
//   suporte:     renderSuporte,
//   criativos:   renderCriativos,       // <-- novo
//   capacitacao: renderCapacitacao,     // <-- novo
// };
//
// E no hash de inicialização, adicionar ao array de abas válidas:
// ['painel','vitrine','pedidos','avisos','perfil','depoimentos','suporte','criativos','capacitacao']

// ════════════════════════════════════════════
// CRIATIVOS
// ════════════════════════════════════════════
async function renderCriativos() {
  document.getElementById('conteudo').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
      <div>
        <h2 style="font-size:20px;font-weight:700;color:var(--nb-text-hi)">Criativos</h2>
        <p style="font-size:13px;color:var(--nb-text-low);margin-top:3px">Materiais prontos para usar nas suas redes sociais</p>
      </div>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
      <div class="filter-pill active" onclick="filtrarCriativos(this,'')">Todos</div>
      <div class="filter-pill" onclick="filtrarCriativos(this,'story')">Story</div>
      <div class="filter-pill" onclick="filtrarCriativos(this,'feed')">Feed</div>
      <div class="filter-pill" onclick="filtrarCriativos(this,'reels')">Reels</div>
      <div class="filter-pill" onclick="filtrarCriativos(this,'outro')">Outros</div>
    </div>

    <div id="loading-criativos" class="loading"><div class="spinner"></div> Carregando...</div>
    <div id="grid-criativos" style="display:none;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px"></div>
    <div id="empty-criativos" style="display:none" class="empty-state">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gray)" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
      <p>Nenhum criativo disponível ainda.</p>
    </div>
  `;

  const { data } = await _supabase
    .from('creatives')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  window._todosCriativos = data || [];
  _renderGridCriativos(data || []);
}

function _renderGridCriativos(lista) {
  document.getElementById('loading-criativos').style.display = 'none';
  const grid  = document.getElementById('grid-criativos');
  const empty = document.getElementById('empty-criativos');

  if (!lista.length) {
    grid.style.display  = 'none';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  grid.style.display  = 'grid';

  const fmtColor = {
    story:  { bg: 'var(--nb-burg-dim)',  border: 'var(--nb-burg-bdr)',  text: 'var(--nb-burg)'  },
    feed:   { bg: 'var(--nb-green-dim)', border: 'var(--nb-green-bdr)', text: 'var(--nb-green)' },
    reels:  { bg: 'var(--nb-gold-dim)',  border: 'var(--nb-gold-bdr)',  text: 'var(--nb-gold)'  },
    outro:  { bg: 'var(--nb-info-dim)',  border: 'var(--nb-info-bdr)',  text: 'var(--nb-info)'  },
  };

  grid.innerHTML = lista.map(c => {
    const fmt   = fmtColor[c.format] || fmtColor.outro;
    const isVid = c.file_type === 'video';
    const thumb = c.thumbnail_url || c.file_url;

    return `
      <div style="background:var(--nb-card);border:0.5px solid var(--nb-border-s);border-radius:14px;overflow:hidden;transition:border-color .15s;"
        onmouseover="this.style.borderColor='var(--nb-border-s)'"
        onmouseout="this.style.borderColor='var(--nb-border-s)'">

        <!-- Thumb -->
        <div style="position:relative;height:180px;background:var(--nb-inset);overflow:hidden;cursor:pointer"
          onclick="_abrirPreviewCriativo('${c.id}')">
          ${thumb
            ? `<img src="${thumb}" style="width:100%;height:100%;object-fit:cover;display:block;transition:transform .3s"
                onmouseover="this.style.transform='scale(1.04)'"
                onmouseout="this.style.transform='scale(1)'"/>`
            : `<div style="display:flex;align-items:center;justify-content:center;height:100%">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--nb-border-s)" stroke-width="1.2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>`
          }
          <!-- Badge formato -->
          <div style="position:absolute;top:8px;left:8px;
            background:${fmt.bg};border:0.5px solid ${fmt.border};color:${fmt.text};
            font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;letter-spacing:.3px">
            ${c.format.toUpperCase()}
          </div>
          ${isVid ? `
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none">
              <div style="width:44px;height:44px;background:rgba(0,0,0,0.55);border-radius:50%;display:flex;align-items:center;justify-content:center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Info -->
        <div style="padding:12px 14px">
          <div style="font-size:13px;font-weight:600;color:var(--nb-text-hi);margin-bottom:4px;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.title}</div>
          ${c.description ? `<div style="font-size:11px;color:var(--nb-text-low);margin-bottom:10px;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.description}</div>` : ''}
          <a href="${c.file_url}" download target="_blank"
            style="display:flex;align-items:center;justify-content:center;gap:6px;
              width:100%;padding:8px;border-radius:8px;
              background:var(--nb-burg);color:var(--ouro-cl);
              font-size:12px;font-weight:600;text-decoration:none;
              transition:opacity .15s"
            onmouseover="this.style.opacity='.85'"
            onmouseout="this.style.opacity='1'">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Baixar
          </a>
        </div>
      </div>
    `;
  }).join('');
}

function filtrarCriativos(el, formato) {
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  const lista = formato
    ? (window._todosCriativos || []).filter(c => c.format === formato)
    : (window._todosCriativos || []);
  _renderGridCriativos(lista);
}

function _abrirPreviewCriativo(id) {
  const c = (window._todosCriativos || []).find(x => x.id === id);
  if (!c) return;

  let lb = document.getElementById('lightbox-criativo');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'lightbox-criativo';
    lb.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
    document.body.appendChild(lb);
  }

  const isVid = c.file_type === 'video';

  lb.innerHTML = `
    <div style="position:relative;max-width:90vw;max-height:90vh;display:flex;flex-direction:column;gap:12px">
      <button onclick="document.getElementById('lightbox-criativo').remove();document.body.style.overflow=''"
        style="position:absolute;top:-14px;right:-14px;width:30px;height:30px;border-radius:50%;
          background:var(--nb-burg);border:none;color:var(--ouro-cl);font-size:16px;cursor:pointer;
          display:flex;align-items:center;justify-content:center;font-weight:700;z-index:1">✕</button>

      ${isVid
        ? `<video src="${c.file_url}" controls autoplay
            style="max-width:100%;max-height:80vh;border-radius:12px;display:block;background:#000"></video>`
        : `<img src="${c.file_url}"
            style="max-width:100%;max-height:80vh;border-radius:12px;display:block;object-fit:contain"/>`
      }

      <a href="${c.file_url}" download target="_blank"
        style="display:flex;align-items:center;justify-content:center;gap:8px;
          padding:10px 24px;background:var(--nb-burg);color:var(--ouro-cl);border-radius:10px;
          font-size:13px;font-weight:600;text-decoration:none;align-self:center">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Baixar arquivo
      </a>
    </div>
  `;

  lb.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  lb.onclick = (e) => { if (e.target === lb) { lb.remove(); document.body.style.overflow = ''; } };
}

// ════════════════════════════════════════════
// CAPACITAÇÃO
// ════════════════════════════════════════════
async function renderCapacitacao() {
  const NIVEL_PRATA = 5;
  const NIVEL_OURO  = 15;
  const meuNivel    = _perfil.nivel || 'bronze';
  const ORDEM_NIVEL = { bronze:0, prata:1, ouro:2 };

  function nivelLiberado(n) { return ORDEM_NIVEL[meuNivel] >= ORDEM_NIVEL[n||'bronze']; }
  function nivelLabel(n)    { return {bronze:'Bronze',prata:'Prata',ouro:'Ouro'}[n]||'Bronze'; }
  function nivelCor(n) {
    return {
      bronze:{bg:'#FFF4E6',text:'#7A4A1A',border:'#CD7F32',dot:'#CD7F32'},
      prata: {bg:'#F4F4F4',text:'#444444',border:'#A8A9AD',dot:'#A8A9AD'},
      ouro:  {bg:'#FFFBE6',text:'#6B4C1A',border:'#C8A96E',dot:'#C8A96E'},
    }[n]||{bg:'#FFF4E6',text:'#7A4A1A',border:'#CD7F32',dot:'#CD7F32'};
  }
  function proximoNivel() {
    if (meuNivel==='bronze') return {nome:'Prata',faltam:NIVEL_PRATA};
    if (meuNivel==='prata')  return {nome:'Ouro', faltam:NIVEL_OURO};
    return null;
  }

  document.getElementById('conteudo').innerHTML = `
    <div id="loading-cap" class="loading"><div class="spinner"></div> Carregando...</div>
    <div id="conteudo-cap"></div>
  `;

  const [
    { data: modulos },
    { data: progresso },
    { count: totalPagosRaw },
    { data: notificacoes },
  ] = await Promise.all([
    _supabase.from('modules')
      .select('id,title,description,"order",cover_url,lessons(id,title,description,video_url,duration_seconds,"order",cover_url,nivel)')
      .eq('is_active', true)
      .order('"order"', { ascending: true }),
    _supabase.from('lesson_progress').select('lesson_id').eq('reseller_id', _perfil.id),
    _supabase.from('orders').select('id',{count:'exact',head:true}).eq('reseller_id',_perfil.id).in('status',['paid','processing','shipped','delivered']),
    _supabase.from('notifications').select('id,title,body,type,read_at,created_at').eq('user_id',_perfil.id).order('created_at',{ascending:false}).limit(5),
  ]);

  document.getElementById('loading-cap').style.display = 'none';

  const concluidas = new Set((progresso||[]).map(p=>p.lesson_id));
  const totalPagos = totalPagosRaw ?? 0;
  const prox       = proximoNivel();
  const cor        = nivelCor(meuNivel);
  const pctNivel   = prox ? Math.min(100,Math.round((totalPagos/prox.faltam)*100)) : 100;

  // Notificacoes de nivel nao lidas
  const notifNivel = (notificacoes||[]).filter(n=>(n.type==='nivel'||n.type==='incentivo')&&!n.read_at);
  if (notifNivel.length) {
    _supabase.from('notifications').update({read_at:new Date().toISOString()}).in('id',notifNivel.map(n=>n.id)).then(()=>{});
  }
  const nivelBannerHTML = notifNivel.length ? notifNivel.map(n=>`
    <div style="background:${n.type==='incentivo'?'linear-gradient(135deg,#1a3a1a,#2d5e2d)':'linear-gradient(135deg,#3D0E20,#6B1A3A)'};border-radius:14px;padding:16px 18px;margin-bottom:14px;display:flex;align-items:flex-start;gap:14px;border:.5px solid rgba(200,169,110,.2);box-shadow:0 2px 14px rgba(58,14,29,.18);">
      <div style="font-size:28px;flex-shrink:0;line-height:1;">${n.title.startsWith('\u{1F947}')?'\u{1F947}':n.title.startsWith('\u{1F948}')?'\u{1F948}':n.title.startsWith('\u2B50')?'\u2B50':'\u{1F389}'}</div>
      <div style="flex:1;">
        <div style="font-size:14px;font-weight:700;color:#C8A96E;margin-bottom:4px;">${s(n.title)}</div>
        <div style="font-size:12px;color:rgba(200,169,110,.75);line-height:1.5;">${s(n.body)}</div>
      </div>
    </div>
  `).join('') : '';

  // Banner de nivel
  const bannerNivel = `
    <div style="background:#fff;border:.5px solid ${cor.border}40;border-radius:14px;padding:14px 16px;margin-bottom:16px;display:flex;align-items:center;gap:14px;">
      <div style="width:44px;height:44px;border-radius:50%;background:${cor.bg};border:2px solid ${cor.border};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:600;color:${cor.text};flex-shrink:0;text-align:center;line-height:1.2;">${nivelLabel(meuNivel)}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:600;color:#2C1018;margin-bottom:2px;">Nivel ${nivelLabel(meuNivel)}</div>
        <div style="font-size:11px;color:#8B6050;">${prox?`${totalPagos} de ${prox.faltam} pedidos para o ${prox.nome}`:'Nivel maximo atingido! &#127942;'}</div>
        ${prox?`<div style="margin-top:6px;height:3px;background:#EDD9C0;border-radius:99px;overflow:hidden;"><div style="height:100%;width:${pctNivel}%;background:${cor.dot};border-radius:99px;"></div></div>`:''}
      </div>
    </div>
  `;

  if (!modulos?.length) {
    document.getElementById('conteudo-cap').innerHTML = bannerNivel + `
      <div class="empty-state">
        <div class="empty-state-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--bord)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg></div>
        <div class="empty-state-title">Em breve!</div>
        <div class="empty-state-body">Os treinamentos estao sendo preparados com carinho para voce.</div>
      </div>
    `;
    return;
  }

  // Injeta estilos uma vez
  if (!document.getElementById('cap-styles')) {
    const style = document.createElement('style');
    style.id = 'cap-styles';
    style.textContent = `
      /* Mobile: grid 2 colunas portrait — DEFINITIVO */
      .cap-scroll-row {
        display:grid !important;
        grid-template-columns:repeat(2,1fr) !important;
        gap:10px;
        width:100% !important;
        max-width:100% !important;
        box-sizing:border-box !important;
        overflow:visible !important;
      }
      .cap-mod-card {
        background:#fff;
        border:.5px solid #E8D9C5;
        border-radius:14px;
        overflow:hidden;
        cursor:pointer;
        transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease;
        width:100% !important;
        min-width:0 !important;
        max-width:100% !important;
        box-sizing:border-box !important;
      }
      .cap-mod-card:hover { transform:translateY(-2px);box-shadow:0 4px 16px rgba(92,26,46,.10);border-color:rgba(92,26,46,.25); }
      .cap-mod-card:active { transform:scale(.97);box-shadow:none; }
      .cap-mod-cover { width:100% !important;aspect-ratio:3/4;position:relative;overflow:hidden;background:linear-gradient(135deg,#3D0E20,#6B1A3A);display:flex;align-items:flex-end;justify-content:flex-start;flex-shrink:0;box-sizing:border-box; }
      .cap-mod-cover img { width:100%;height:100%;object-fit:cover; }
      .cap-mod-cover-label { font-size:10px;font-weight:600;color:rgba(200,169,110,.6);letter-spacing:.05em; }
      .cap-mod-badge { position:absolute;top:8px;left:8px;background:rgba(26,10,18,.65);border:.5px solid rgba(200,169,110,.3);border-radius:6px;padding:2px 7px;font-size:9px;font-weight:700;color:#C8A96E;letter-spacing:.06em;text-transform:uppercase; }
      .cap-mod-play { position:absolute;bottom:8px;right:8px;width:26px;height:26px;border-radius:50%;background:rgba(200,169,110,.92);display:flex;align-items:center;justify-content:center; }
      .cap-mod-play-tri { width:0;height:0;border-top:5px solid transparent;border-bottom:5px solid transparent;border-left:8px solid #3D0E20;margin-left:2px; }
      .cap-mod-body { padding:10px 12px 12px; }
      .cap-mod-title { font-size:13px;font-weight:600;color:#2C1018;line-height:1.2; }
      .cap-mod-meta { font-size:10px;color:#8B6050;margin-top:2px; }
      .cap-mod-prog { height:2px;background:#E8D9C5;border-radius:99px;margin-top:6px;overflow:hidden; }
      .cap-mod-pfill { height:100%;background:#C8A96E;border-radius:99px; }
      .cap-dots { display:none; }
      .cap-aula-cover { width:100%;aspect-ratio:16/9;position:relative;overflow:hidden;background:linear-gradient(135deg,#3D0E20,#6B1A3A);display:flex;align-items:center;justify-content:center; }
      .cap-aula-cover img { width:100%;height:100%;object-fit:cover; }
      .cap-aula-cover-overlay { position:absolute;inset:0;background:linear-gradient(to top,rgba(26,10,18,.85) 0%,transparent 55%); }
      .cap-aula-cover-title { position:absolute;bottom:14px;left:14px;font-size:17px;font-weight:700;color:#fff;font-family:'Playfair Display',serif;letter-spacing:-.3px;max-width:70%; }
      .cap-aula-cover-meta { position:absolute;bottom:17px;right:14px;font-size:10px;color:rgba(200,169,110,.85); }
      .cap-aula-row { display:flex;align-items:center;gap:11px;padding:10px 0;border-bottom:.5px solid #E8D9C5;cursor:pointer;transition:opacity .15s; }
      .cap-aula-row:last-child { border-bottom:none; }
      .cap-aula-row:active { opacity:.65; }
      .cap-aula-thumb { width:72px;height:46px;border-radius:8px;flex-shrink:0;overflow:hidden;position:relative;background:linear-gradient(135deg,#3D0E20,#6B1A3A);display:flex;align-items:center;justify-content:center; }
      .cap-aula-thumb img { width:100%;height:100%;object-fit:cover; }
      .cap-aula-thumb-label { font-size:8px;font-weight:600;color:rgba(200,169,110,.6); }
      .cap-aula-play { position:absolute;bottom:4px;right:4px;width:18px;height:18px;border-radius:50%;background:rgba(200,169,110,.9);display:flex;align-items:center;justify-content:center; }
      .cap-aula-tri { width:0;height:0;border-top:3px solid transparent;border-bottom:3px solid transparent;border-left:5px solid #3D0E20;margin-left:1px; }
      .cap-aula-lock { position:absolute;inset:0;background:rgba(26,10,18,.72);border-radius:8px;display:flex;align-items:center;justify-content:center; }
      .cap-aula-info { flex:1;min-width:0; }
      .cap-aula-badge { display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:600;padding:1px 6px;border-radius:999px;margin-bottom:3px;border:.5px solid transparent; }
      .cap-aula-title { font-size:12px;font-weight:600;color:#2C1018;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
      .cap-aula-meta { font-size:10px;color:#8B6050;margin-top:1px; }
      .cap-aula-prog { height:2px;background:#E8D9C5;border-radius:99px;margin-top:4px;overflow:hidden; }
      .cap-aula-pfill { height:100%;background:#C8A96E;border-radius:99px; }
      .cap-player-wrap { position:fixed;inset:0;z-index:9999;background:#F5EFE6;display:flex;flex-direction:column;overflow-y:auto; }
      .cap-player-header { background:#3D0E20;padding:14px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0; }
      .cap-back { width:30px;height:30px;border-radius:50%;background:rgba(200,169,110,.15);border:.5px solid rgba(200,169,110,.3);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0; }
      .cap-back-tri { width:0;height:0;border-top:4px solid transparent;border-bottom:4px solid transparent;border-right:6px solid #C8A96E;margin-right:2px; }
      .cap-player-modtitle { font-size:12px;font-weight:600;color:#C8A96E;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
      .cap-video-wrap { width:100%;background:#0d0508;flex-shrink:0; }
      .cap-video-inner { position:relative;padding-bottom:56.25%;height:0; }
      .cap-video-inner iframe { position:absolute;top:0;left:0;width:100%;height:100%;border:none; }
      .cap-aula-detail { background:#fff;padding:14px 16px;border-bottom:.5px solid #E8D9C5; }
      .cap-aula-detail-mod { font-size:9px;color:#8B6050;letter-spacing:.08em;text-transform:uppercase;margin-bottom:3px; }
      .cap-aula-detail-title { font-size:15px;font-weight:600;color:#2C1018;line-height:1.3;margin-bottom:10px; }
      .cap-aula-actions { display:flex;gap:14px; }
      .cap-aula-action { display:flex;align-items:center;gap:5px;font-size:11px;color:#6B1A3A;cursor:pointer;background:none;border:none;font-family:inherit;padding:0; }
      .cap-playlist { padding:0 16px;background:#F5EFE6; }
      .cap-playlist-title { font-size:9px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#8B6050;padding:12px 0 8px;border-bottom:.5px solid #E8D9C5; }
      .cap-pl-item { display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:.5px solid #E8D9C5;cursor:pointer; }
      .cap-pl-num { font-size:10px;color:#8B6050;width:16px;text-align:center;flex-shrink:0; }
      .cap-pl-thumb { width:56px;height:36px;border-radius:6px;overflow:hidden;position:relative;flex-shrink:0;background:#D9C5B0;display:flex;align-items:center;justify-content:center; }
      .cap-pl-thumb img { width:100%;height:100%;object-fit:cover; }
      .cap-pl-info { flex:1;min-width:0; }
      .cap-pl-title { font-size:11px;font-weight:600;color:#2C1018;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
      .cap-pl-meta { font-size:10px;color:#8B6050;margin-top:1px; }
      .cap-pl-check { width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
      @keyframes slideDown {
        from { opacity:0;transform:translateY(-8px); }
        to   { opacity:1;transform:translateY(0); }
      }
      @media (min-width: 768px) {
        #cap-scroll-row { gap:16px !important; }
        #cap-scroll-row > div { width:calc(25% - 12px) !important; }
        .cap-dots { display:none; }
        .cap-player-wrap { position:relative;flex-direction:row;align-items:flex-start;min-height:500px; }
        .cap-player-left { flex:1;min-width:0; }
        .cap-player-right { width:280px;flex-shrink:0;border-left:.5px solid #E8D9C5;background:#fff;max-height:600px;overflow-y:auto; }
      }
    `;
    document.head.appendChild(style);
  }

  window._capModulos    = modulos;
  window._capConcluidas = concluidas;

  let html = nivelBannerHTML + bannerNivel;
  html += `<div style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#8B6050;margin-bottom:10px;">Modulos</div>`;
  html += `<div id="cap-scroll-row" style="display:flex;flex-wrap:nowrap;gap:10px;width:100%;box-sizing:border-box;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;padding-bottom:4px;scrollbar-width:none;">`;

  modulos.forEach((mod, mi) => {
    const aulas   = (mod.lessons||[]).sort((a,b)=>a.order-b.order);
    const modConc = aulas.filter(a=>concluidas.has(a.id)).length;
    const pctMod  = aulas.length ? Math.round((modConc/aulas.length)*100) : 0;
    const thumb   = mod.cover_url || '';

    html += `
      <div onclick="_abrirModulo('${mod.id}')" style="background:#fff;border:.5px solid #E8D9C5;border-radius:14px;overflow:hidden;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease;width:calc(72% - 5px);flex-shrink:0;box-sizing:border-box;scroll-snap-align:start;">
        <div class="cap-mod-cover-inner" style="width:100%;position:relative;overflow:hidden;background:linear-gradient(135deg,#3D0E20,#6B1A3A);height:0;padding-bottom:0;" id="cover-${mod.id}">
          ${thumb ? `<img src="${s(thumb)}" alt="${s(mod.title)}" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;"/>` : ''}
          <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(26,10,18,.92) 0%,rgba(26,10,18,.3) 50%,transparent 100%);"></div>
          <div class="cap-mod-badge">Mod ${String(mi+1).padStart(2,'0')}</div>
          <div style="position:absolute;bottom:0;left:0;right:0;padding:10px 10px 10px;">
            <div style="font-size:13px;font-weight:700;color:#fff;line-height:1.2;margin-bottom:3px;">${s(mod.title)}</div>
            <div style="font-size:10px;color:rgba(200,169,110,.8);">${aulas.length} aula${aulas.length!==1?'s':''}</div>
          </div>
          <div class="cap-mod-play" style="bottom:auto;right:10px;top:50%;transform:translateY(-50%);opacity:.85;"><div class="cap-mod-play-tri"></div></div>
        </div>
        <div class="cap-mod-prog" style="margin:0;border-radius:0;"><div class="cap-mod-pfill" style="width:${pctMod}%"></div></div>
      </div>
    `;
  });

  html += `</div>`;
  html += `<div class="cap-dots" id="cap-dots">`;
  modulos.forEach((_,i) => { html += `<div class="cap-dot${i===0?' on':''}"></div>`; });
  html += `</div>`;

  document.getElementById('conteudo-cap').innerHTML = html;

  // Seta altura proporcional baseada na largura real renderizada
  const _setModuleHeights = () => {
    const covers = document.querySelectorAll('.cap-mod-cover-inner');
    covers.forEach(el => {
      el.style.height = '0';
      el.style.paddingBottom = '0';
    });
    covers.forEach(el => {
      const w = el.offsetWidth;
      if (w > 0) el.style.height = Math.round(w * 1.5) + 'px';
    });
  };
  requestAnimationFrame(() => {
    _setModuleHeights();
    // Segunda tentativa para garantir que o layout finalizou
    setTimeout(_setModuleHeights, 100);
  });

  const scrollEl = document.getElementById('cap-scroll-row');
  if (scrollEl) {
    scrollEl.addEventListener('scroll', () => {
      const idx = Math.round(scrollEl.scrollLeft / 232);
      document.querySelectorAll('.cap-dot').forEach((d,i) => d.classList.toggle('on', i===idx));
    }, { passive: true });
  }
}

function _abrirModulo(moduloId) {
  const modulos    = window._capModulos || [];
  const concluidas = window._capConcluidas || new Set();
  const mod        = modulos.find(m => m.id === moduloId);
  if (!mod) return;

  const meuNivel    = _perfil.nivel || 'bronze';
  const ORDEM_NIVEL = { bronze:0, prata:1, ouro:2 };
  function nivelLiberado(n) { return ORDEM_NIVEL[meuNivel] >= ORDEM_NIVEL[n||'bronze']; }
  function nivelLabel(n)    { return {bronze:'Bronze',prata:'Prata',ouro:'Ouro'}[n]||'Bronze'; }
  function nivelCor(n) {
    return {
      bronze:{bg:'#FFF4E6',text:'#7A4A1A',border:'#CD7F32',dot:'#CD7F32'},
      prata: {bg:'#F4F4F4',text:'#444444',border:'#A8A9AD',dot:'#A8A9AD'},
      ouro:  {bg:'#FFFBE6',text:'#6B4C1A',border:'#C8A96E',dot:'#C8A96E'},
    }[n]||{bg:'#FFF4E6',text:'#7A4A1A',border:'#CD7F32',dot:'#CD7F32'};
  }

  const aulas   = (mod.lessons||[]).sort((a,b)=>a.order-b.order);
  const mi      = modulos.indexOf(mod);
  const thumb   = mod.cover_url || '';
  const modConc = aulas.filter(a=>concluidas.has(a.id)).length;
  const pctMod  = aulas.length ? Math.round((modConc/aulas.length)*100) : 0;

  let html = `
    <div class="cap-aula-cover" style="margin:-14px -14px 0;width:calc(100% + 28px);">
      ${thumb ? `<img src="${s(thumb)}" alt="${s(mod.title)}" loading="lazy"/>` : ''}
      <div class="cap-aula-cover-overlay"></div>
      <button onclick="renderCapacitacao()" style="position:absolute;top:12px;left:12px;width:30px;height:30px;border-radius:50%;background:rgba(26,10,18,.5);border:.5px solid rgba(200,169,110,.3);display:flex;align-items:center;justify-content:center;cursor:pointer;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C8A96E" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div class="cap-aula-cover-title">${s(mod.title)}</div>
      <div class="cap-aula-cover-meta">${aulas.length} aula${aulas.length!==1?'s':''} &middot; ${pctMod}%</div>
    </div>
    <div style="margin-top:16px;">
      <div style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#8B6050;margin-bottom:8px;">Aulas</div>
  `;

  aulas.forEach((aula) => {
    const feita     = concluidas.has(aula.id);
    const liberada  = nivelLiberado(aula.nivel);
    const durMin    = aula.duration_seconds ? Math.ceil(aula.duration_seconds/60) : null;
    const nivelAula = aula.nivel||'bronze';
    const cor       = nivelCor(nivelAula);
    const pct       = feita ? 100 : 0;
    const aulaCover = aula.cover_url||mod.cover_url||'';

    html += `
      <div class="cap-aula-row" ${liberada?`onclick="_abrirPlayer('${aula.id}')"`:'style="cursor:default;opacity:.6"'}>
        <div class="cap-aula-thumb">
          ${aulaCover ? `<img src="${s(aulaCover)}" loading="lazy"/>` : `<div class="cap-aula-thumb-label">ires emb.</div>`}
          ${liberada ? `<div class="cap-aula-play"><div class="cap-aula-tri"></div></div>` : `<div class="cap-aula-lock"><svg width="11" height="13" viewBox="0 0 12 14" fill="none"><rect x="1" y="6" width="10" height="8" rx="1.5" fill="none" stroke="#C8A96E" stroke-width="1.2"/><path d="M3 6V4a3 3 0 016 0v2" stroke="#C8A96E" stroke-width="1.2" stroke-linecap="round"/></svg></div>`}
        </div>
        <div class="cap-aula-info">
          <div class="cap-aula-badge" style="background:${cor.bg};color:${cor.text};border-color:${cor.border};">
            <div style="width:5px;height:5px;border-radius:50%;background:${cor.dot};flex-shrink:0;"></div>
            ${nivelLabel(nivelAula)}
          </div>
          <div class="cap-aula-title">${s(aula.title)}</div>
          <div class="cap-aula-meta">${durMin?durMin+' min':''}${!liberada?' &middot; '+nivelLabel(nivelAula):''}</div>
          ${liberada?`<div class="cap-aula-prog"><div class="cap-aula-pfill" style="width:${pct}%"></div></div>`:''}
        </div>
        ${feita?`<div style="width:18px;height:18px;border-radius:50%;background:rgba(200,169,110,.15);border:1px solid #C8A96E;display:flex;align-items:center;justify-content:center;font-size:9px;color:#C8A96E;flex-shrink:0;">&#10003;</div>`:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D9C5B0" stroke-width="2" stroke-linecap="round" style="flex-shrink:0;"><polyline points="9 18 15 12 9 6"/></svg>`}
      </div>
    `;
  });

  html += `</div>`;
  document.getElementById('conteudo-cap').innerHTML = html;

}

function _youtubeEmbedUrl(url) {
  if (!url) return '';
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/);
  if (match) return `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1`;
  return url;
}

function _abrirPlayer(aulaId) {
  const modulos   = window._capModulos || [];
  const concluidas = window._capConcluidas || new Set();

  let aulaAtual = null;
  let modAtual  = null;

  for (const mod of modulos) {
    const found = (mod.lessons || []).find(a => a.id === aulaId);
    if (found) { aulaAtual = found; modAtual = mod; break; }
  }
  if (!aulaAtual) return;

  const aulas     = (modAtual.lessons || []).sort((a, b) => a.order - b.order);
  const durMin    = aulaAtual.duration_seconds ? Math.ceil(aulaAtual.duration_seconds / 60) : null;
  const feita     = concluidas.has(aulaAtual.id);
  const idxAtual  = aulas.findIndex(a => a.id === aulaId);

  function nivelCor2(n) {
    return {
      bronze: { bg:'#FFF4E6', text:'#7A4A1A', border:'#CD7F32', dot:'#CD7F32' },
      prata:  { bg:'#F4F4F4', text:'#444444', border:'#A8A9AD', dot:'#A8A9AD' },
      ouro:   { bg:'#FFFBE6', text:'#6B4C1A', border:'#C8A96E', dot:'#C8A96E' },
    }[n] || { bg:'#FFF4E6', text:'#7A4A1A', border:'#CD7F32', dot:'#CD7F32' };
  }
  function nivelLabel2(n) { return {bronze:'Bronze',prata:'Prata',ouro:'Ouro'}[n]||'Bronze'; }

  const embedUrl = _youtubeEmbedUrl(aulaAtual.video_url);

  const playlistHtml = aulas.map((a, i) => {
    const aCor   = nivelCor2(a.nivel || 'bronze');
    const aFeita = concluidas.has(a.id);
    const isNow  = a.id === aulaId;
    const thumb  = a.cover_url || modAtual.cover_url || '';

    return `
      <div class="cap-pl-item" onclick="_abrirPlayer('${a.id}')">
        <div class="cap-pl-num" style="${isNow ? 'color:#C8A96E;font-weight:700;' : ''}">${isNow ? '▶' : i+1}</div>
        <div class="cap-pl-thumb">
          ${thumb ? `<img src="${s(thumb)}" loading="lazy"/>` : `<div style="width:100%;height:100%;background:linear-gradient(135deg,#3D0E20,#6B1A3A);display:flex;align-items:center;justify-content:center;font-size:7px;color:rgba(200,169,110,.6)">ires</div>`}
        </div>
        <div class="cap-pl-info">
          <div class="cap-pl-title" style="${isNow ? 'color:#C8A96E;' : ''}">${s(a.title)}</div>
          <div class="cap-pl-meta">${a.duration_seconds ? Math.ceil(a.duration_seconds/60)+' min' : ''}</div>
        </div>
        <div class="cap-pl-check" style="${aFeita ? 'background:rgba(200,169,110,.15);border:1px solid #C8A96E;color:#C8A96E;font-size:9px;' : 'border:1px solid #E8D9C5;'}">${aFeita ? '✓' : ''}</div>
      </div>
    `;
  }).join('');

  const proximaAula = idxAtual < aulas.length - 1 ? aulas[idxAtual + 1] : null;

  const playerHtml = `
    <div class="cap-player-wrap" id="cap-player-overlay">
      <div class="cap-player-left" style="flex:1;min-width:0;">
        <div class="cap-player-header">
          <div class="cap-back" onclick="document.getElementById('cap-player-overlay').remove()">
            <div class="cap-back-tri"></div>
          </div>
          <div class="cap-player-modtitle">Módulo ${String(modulos.indexOf(modAtual)+1).padStart(2,'0')} · ${s(modAtual.title)}</div>
        </div>

        <div class="cap-video-wrap">
          <div class="cap-video-inner">
            <iframe src="${embedUrl}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>
          </div>
        </div>
        <div class="cap-video-prog"><div class="cap-video-pfill"></div></div>

        <div class="cap-aula-detail">
          <div class="cap-aula-detail-mod">Módulo ${modulos.indexOf(modAtual)+1} · Aula ${idxAtual+1}</div>
          <div class="cap-aula-detail-title">${s(aulaAtual.title)}</div>
          ${aulaAtual.description ? `<p style="font-size:12px;color:#8B6050;margin-bottom:10px;line-height:1.6">${s(aulaAtual.description)}</p>` : ''}
          <div class="cap-aula-actions">
            ${!feita ? `
              <button class="cap-aula-action" onclick="_marcarConcluida('${aulaAtual.id}')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                Marcar como concluída
              </button>
            ` : `
              <span style="display:flex;align-items:center;gap:4px;font-size:11px;color:#5A8A5A;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                Concluída
              </span>
            `}
            ${proximaAula ? `
              <button class="cap-aula-action" onclick="_abrirPlayer('${proximaAula.id}')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                Próxima aula
              </button>
            ` : ''}
          </div>
        </div>
      </div>

      <div class="cap-player-right">
        <div class="cap-playlist" style="padding:0 14px;">
          <div class="cap-playlist-title">Aulas do módulo</div>
          ${playlistHtml}
        </div>
      </div>
    </div>
  `;

  // Remove player anterior se existir
  const old = document.getElementById('cap-player-overlay');
  if (old) old.remove();

  document.body.insertAdjacentHTML('beforeend', playerHtml);
}

async function _marcarConcluida(lessonId) {
  const { error } = await _supabase
    .from('lesson_progress')
    .upsert({ reseller_id: _perfil.id, lesson_id: lessonId }, { onConflict: 'reseller_id,lesson_id' });

  if (error) { showToast('Erro ao salvar progresso.', 'error'); return; }
  showToast('Aula concluída! 🎉', 'success');

  // Atualiza local sem re-buscar
  if (window._capConcluidas) window._capConcluidas.add(lessonId);

  // Reabre o player na mesma aula com estado atualizado
  _abrirPlayer(lessonId);

  // Re-renderiza a lista em background
  renderCapacitacao();
}

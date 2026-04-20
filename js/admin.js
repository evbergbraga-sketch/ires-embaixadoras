// ============================================
// IRES EMBAIXADORAS — admin.js
// Dashboard, pedidos, produtos, embaixadoras,
// comunicados, criativos e capacitação.
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
  document.querySelectorAll('.nav-tab, .admin-nav-tab').forEach(el => el.classList.remove('active'));
  const nav = document.getElementById('nav-' + pagina);
  if (nav) nav.classList.add('active');

  // Sincroniza bottom nav mobile
  document.querySelectorAll('.admin-bnav-tab').forEach(t => t.classList.remove('active'));
  const bmap = { dashboard:0, pedidos:1, produtos:2, embaixadoras:3, comunicados:4 };
  if (bmap[pagina] !== undefined) {
    const btabs = document.querySelectorAll('.admin-bnav-tab');
    if (btabs[bmap[pagina]]) btabs[bmap[pagina]].classList.add('active');
  }

  const main = document.getElementById('conteudo-principal');
  main.innerHTML = '<div class="loading"><div class="spinner"></div> Carregando...</div>';

  const acoes = {
    dashboard:    renderDashboard,
    pedidos:      renderPedidos,
    produtos:     renderProdutos,
    categorias:   renderCategorias,
    embaixadoras: renderEmbaixadoras,
    comunicados:  renderComunicados,
    depoimentos:  renderDepoimentosAdmin,
    suporte:      renderSuporteAdmin,
    criativos:    renderCriativosAdmin,
    capacitacao:  renderCapacitacaoAdmin,
  };
  (acoes[pagina] || renderDashboard)();
}

// ════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════
async function renderDashboard() {
  const hoje = new Date().toISOString().slice(0,10);
  const [
    { count: totalEmb },
    { data: pedidosHoje },
    { data: pendentes },
    { data: ultimosPedidos },
    { data: suporteAberto },
    { data: pedidos7d },
  ] = await Promise.all([
    _supabase.from('profiles').select('*',{count:'exact',head:true}).eq('status','active').eq('role','reseller'),
    _supabase.from('orders').select('total,status').gte('created_at', hoje),
    _supabase.from('profiles').select('id,full_name,created_at,phone').eq('status','pending').eq('role','reseller').order('created_at',{ascending:false}).limit(5),
    _supabase.from('orders').select('id,total,status,created_at,profiles(full_name)').order('created_at',{ascending:false}).limit(6),
    _supabase.from('support_messages').select('id,subject,created_at,profiles(full_name)').eq('status','open').order('created_at',{ascending:false}).limit(4),
    _supabase.from('orders').select('total,status,created_at').gte('created_at', new Date(Date.now()-6*864e5).toISOString().slice(0,10)),
  ]);

  const statusPagos      = ['paid','processing','shipped','delivered'];
  const pedidosPagos     = (pedidosHoje||[]).filter(o=>statusPagos.includes(o.status));
  const faturamentoHoje  = pedidosPagos.reduce((a,o)=>a+Number(o.total),0);
  const totalPendHoje    = (pedidosHoje||[]).filter(o=>o.status==='pending').length;

  // Barras dos últimos 7 dias
  const dias = Array.from({length:7},(_,i)=>{
    const d = new Date(Date.now()-(6-i)*864e5);
    return d.toISOString().slice(0,10);
  });
  const faturPorDia = dias.map(dia => {
    const dayOrders = (pedidos7d||[]).filter(o=>o.created_at.slice(0,10)===dia&&statusPagos.includes(o.status));
    return dayOrders.reduce((a,o)=>a+Number(o.total),0);
  });
  const maxFatur = Math.max(...faturPorDia, 1);
  const diasAbrev = ['seg','ter','qua','qui','sex','sáb','dom'];
  const barras = faturPorDia.map((val,i) => {
    const pct = Math.max(Math.round((val/maxFatur)*100), 4);
    const isHoje = i===6;
    return `
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
        <span style="font-size:9px;color:var(--gray)">${val>0?'R$'+Math.round(val):''}</span>
        <div style="width:100%;height:${pct}%;border-radius:4px 4px 0 0;min-height:4px;
          background:${isHoje?'var(--pink)':'rgba(240,63,170,.18)'};
          border:${isHoje?'none':'0.5px solid rgba(240,63,170,.3)'}"></div>
        <span style="font-size:9px;color:${isHoje?'var(--pink)':'var(--gray)'}">
          ${diasAbrev[new Date(dias[i]).getDay()||6]}
        </span>
      </div>`;
  }).join('');

  const nPend   = (ultimosPedidos||[]).filter(o=>o.status==='pending').length;
  const nPago   = (ultimosPedidos||[]).filter(o=>statusPagos.includes(o.status)).length;
  const pctPend = ultimosPedidos?.length ? Math.round((nPend/ultimosPedidos.length)*100) : 0;
  const pctPago = ultimosPedidos?.length ? Math.round((nPago/ultimosPedidos.length)*100) : 0;

  document.getElementById('conteudo-principal').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <div>
        <h2 style="font-size:20px;font-weight:800">Dashboard</h2>
        <p style="font-size:13px;color:var(--gray);margin-top:2px">${new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}</p>
      </div>
    </div>

    <!-- Métricas -->
    <div class="metrics-grid" style="margin-bottom:20px">
      <div class="metric-card" style="border-top-color:var(--pink)">
        <div class="metric-icon" style="background:rgba(240,63,170,.1);border:0.5px solid rgba(240,63,170,.25)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--pink)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        </div>
        <div class="metric-value">${pedidosPagos.length}</div>
        <div class="metric-label">Pedidos pagos hoje</div>
      </div>
      <div class="metric-card" style="border-top-color:var(--pink)">
        <div class="metric-icon" style="background:rgba(240,63,170,.1);border:0.5px solid rgba(240,63,170,.25)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--pink)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div class="metric-value">${formatBRL(faturamentoHoje)}</div>
        <div class="metric-label">Faturamento hoje</div>
      </div>
      <div class="metric-card" style="border-top-color:var(--green)">
        <div class="metric-icon" style="background:rgba(63,200,130,.1);border:0.5px solid rgba(63,200,130,.25)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div class="metric-value">${totalEmb||0}</div>
        <div class="metric-label">Embaixadoras ativas</div>
      </div>
      <div class="metric-card" style="border-top-color:var(--amber)">
        <div class="metric-icon" style="background:rgba(220,155,70,.1);border:0.5px solid rgba(220,155,70,.25)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <div class="metric-value">${totalPendHoje}</div>
        <div class="metric-label">Pagamentos pendentes</div>
      </div>
    </div>

    <!-- Bento principal -->
    <div class="dash-bento" style="display:grid;grid-template-columns:1.5fr 1fr;gap:16px">

      <!-- Coluna esquerda: gráfico + pedidos -->
      <div style="display:flex;flex-direction:column;gap:16px">

        <!-- Gráfico 7 dias -->
        <div style="background:#111;border:0.5px solid var(--border);border-radius:var(--radius-lg);padding:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
            <div style="font-size:12px;font-weight:700;color:var(--gray-lighter)">Faturamento — últimos 7 dias</div>
            <div style="font-size:12px;font-weight:700;color:var(--pink)">${formatBRL(faturPorDia.reduce((a,v)=>a+v,0))}</div>
          </div>
          <div style="display:flex;align-items:flex-end;gap:8px;height:80px;padding:0 4px">
            ${barras}
          </div>
        </div>

        <!-- Pedidos recentes -->
        <div style="background:#111;border:0.5px solid var(--border);border-radius:var(--radius-lg);padding:16px;flex:1">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
            <div style="font-size:12px;font-weight:700;color:var(--gray-lighter)">Pedidos recentes</div>
            <button class="btn btn-sm btn-outline" onclick="irPara('pedidos')">Ver todos</button>
          </div>
          <div class="orders-list">
            ${(ultimosPedidos||[]).map(o=>`
              <div class="order-row" onclick="abrirPedido('${o.id}')">
                <div>
                  <div class="order-id">#${o.id.slice(-4).toUpperCase()}</div>
                  <div class="order-date">${new Date(o.created_at).toLocaleDateString('pt-BR')}</div>
                </div>
                <div class="order-items-preview">${o.profiles?.full_name||'Embaixadora'}</div>
                <div class="order-total">${formatBRL(o.total)}</div>
                ${statusLabel(o.status)}
              </div>`).join('')||'<p style="color:var(--gray);font-size:13px">Nenhum pedido ainda.</p>'}
          </div>
          <!-- Barras de status -->
          <div style="margin-top:14px;padding-top:14px;border-top:0.5px solid var(--border2);display:flex;flex-direction:column;gap:8px">
            <div style="display:flex;align-items:center;justify-content:space-between;font-size:11px">
              <span style="color:var(--gray)">Pendentes</span><span style="font-weight:700;color:var(--amber)">${nPend}</span>
            </div>
            <div style="height:3px;background:var(--border2);border-radius:3px;overflow:hidden"><div style="width:${pctPend}%;height:100%;background:var(--amber);border-radius:3px;transition:width .4s"></div></div>
            <div style="display:flex;align-items:center;justify-content:space-between;font-size:11px">
              <span style="color:var(--gray)">Pagos</span><span style="font-weight:700;color:var(--green)">${nPago}</span>
            </div>
            <div style="height:3px;background:var(--border2);border-radius:3px;overflow:hidden"><div style="width:${pctPago}%;height:100%;background:var(--green);border-radius:3px;transition:width .4s"></div></div>
          </div>
        </div>
      </div>

      <!-- Coluna direita: aprovações + suporte -->
      <div style="display:flex;flex-direction:column;gap:16px">

        <!-- Embaixadoras pendentes -->
        <div style="background:#111;border:0.5px solid var(--border);border-radius:var(--radius-lg);padding:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:${pendentes?.length ? '14' : '10'}px">
            <div style="display:flex;align-items:center;gap:8px">
              <div style="font-size:12px;font-weight:700;color:var(--gray-lighter)">Aguardando aprovação</div>
              ${pendentes?.length ? `<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;background:rgba(220,155,70,.12);border:0.5px solid rgba(220,155,70,.3);color:var(--amber)">${pendentes.length}</span>` : ''}
            </div>
            <button class="btn btn-sm btn-outline" onclick="irPara('embaixadoras')">Ver todas</button>
          </div>
          ${pendentes?.length ? pendentes.map(e=>`
            <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:0.5px solid var(--border2)">
              <div class="avatar" style="flex-shrink:0">${initials(e.full_name)}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.full_name||'Sem nome'}</div>
                <div style="font-size:11px;color:var(--gray)">${e.phone||'Sem telefone'}</div>
              </div>
              <button class="btn btn-sm btn-primary" style="width:auto;flex-shrink:0" onclick="aprovarEmb('${e.id}')">Aprovar</button>
            </div>`).join('')
          : `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;color:var(--gray);font-size:13px">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Nenhuma pendente
            </div>`}
        </div>

        <!-- Suporte aberto -->
        <div style="background:#111;border:0.5px solid var(--border);border-radius:var(--radius-lg);padding:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:${suporteAberto?.length ? '14' : '10'}px">
            <div style="display:flex;align-items:center;gap:8px">
              <div style="font-size:12px;font-weight:700;color:var(--gray-lighter)">Suporte aberto</div>
              ${suporteAberto?.length ? `<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;background:rgba(91,143,212,.1);border:0.5px solid rgba(91,143,212,.28);color:#5B8FD4">${suporteAberto.length}</span>` : ''}
            </div>
            <button class="btn btn-sm btn-outline" onclick="irPara('suporte')">Ver tudo</button>
          </div>
          ${suporteAberto?.length ? suporteAberto.map(s=>`
            <div style="padding:10px 0;border-bottom:0.5px solid var(--border2);cursor:pointer" onclick="irPara('suporte')">
              <div style="display:flex;align-items:flex-start;gap:8px">
                <div style="width:7px;height:7px;border-radius:50%;background:#5B8FD4;flex-shrink:0;margin-top:5px"></div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:12px;font-weight:600;color:var(--white);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.subject||'Sem assunto'}</div>
                  <div style="font-size:11px;color:var(--gray);margin-top:2px">${s.profiles?.full_name||'Embaixadora'} · ${new Date(s.created_at).toLocaleDateString('pt-BR')}</div>
                </div>
              </div>
            </div>`).join('')
          : `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;color:var(--gray);font-size:13px">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Nenhum ticket aberto
            </div>`}
        </div>
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
  const filtrados = status ? (window._todosOsPedidos||[]).filter(o => o.status === status) : (window._todosOsPedidos||[]);
  lista.innerHTML = filtrados.map(o => pedidoRow(o)).join('') || '<p style="color:var(--gray);font-size:13px">Nenhum pedido.</p>';
}

async function abrirPedido(id) {
  const { data: o } = await _supabase
    .from('orders')
    .select('*, profiles(full_name, phone), order_items(quantity, unit_price, subtotal, products(name))')
    .eq('id', id).single();
  if (!o) return;
  abrirModal(`
    <button onclick="fecharModal()" style="position:absolute;top:12px;right:12px;background:none;border:none;color:var(--gray);cursor:pointer;font-size:20px">✕</button>
    <h3 style="font-size:16px;font-weight:800;margin-bottom:4px">Pedido #${o.id.slice(-4).toUpperCase()}</h3>
    <p style="font-size:12px;color:var(--gray);margin-bottom:16px">${new Date(o.created_at).toLocaleDateString('pt-BR')} · ${o.profiles?.full_name}</p>
    <div style="margin-bottom:16px">
      ${(o.order_items||[]).map(i => `
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
          `<option value="${s}" ${o.status===s?'selected':''}>${statusLabel(s).replace(/<[^>]+>/g,'')}</option>`
        ).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Observação (opcional)</label>
      <input type="text" id="obs-pedido" value="${o.notes||''}" placeholder="Ex: Código de rastreio"/>
    </div>
    <button class="btn btn-primary" onclick="salvarStatusPedido('${o.id}')">Salvar alterações</button>
  `);
}

async function salvarStatusPedido(id) {
  const status = document.getElementById('select-status-pedido').value;
  const notes  = document.getElementById('obs-pedido').value.trim();
  const { error } = await _supabase.from('orders').update({ status, notes, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) { showToast('Erro ao atualizar pedido.','error'); return; }
  showToast('Pedido atualizado!','success');
  fecharModal(); renderPedidos();
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
      ${(produtos||[]).map(p => `
        <div style="background:#111;border:0.5px solid var(--border);border-radius:var(--radius-lg);padding:14px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
            <div style="width:52px;height:52px;border-radius:var(--radius-md);background:var(--black);border:0.5px solid var(--border);overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center">
              ${p.images?.[0] ? `<img src="${p.images[0]}" style="width:100%;height:100%;object-fit:cover"/>` : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;color:var(--white)">${p.name}</div>
              <div style="font-size:11px;color:var(--gray);margin-top:2px">${p.categories?.name||'Sem categoria'}</div>
            </div>
            <span class="pill ${p.is_active?'pill-green':'pill-gray'}">${p.is_active?'Ativo':'Inativo'}</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font-size:14px;font-weight:800;color:var(--white)">${formatBRL(p.price)}</div>
              <div style="font-size:10px;color:var(--gray)">mín. ${p.min_quantity} un.</div>
            </div>
            <div style="display:flex;gap:6px">
              <button class="btn btn-sm btn-outline" onclick="abrirFormProduto('${p.id}')">Editar</button>
              <button class="btn btn-sm btn-danger" onclick="toggleProduto('${p.id}', ${p.is_active})">${p.is_active?'Desativar':'Ativar'}</button>
            </div>
          </div>
        </div>
      `).join('')||'<p style="color:var(--gray);font-size:13px">Nenhum produto cadastrado.</p>'}
    </div>
  `;
}

function abrirFormProduto(id) {
  const cats = window._categorias || [];
  const carregarEAbrir = async () => {
    let p = {};
    if (id) { const { data } = await _supabase.from('products').select('*').eq('id',id).single(); p = data||{}; }
    window._prodImagens = Array.isArray(p.images) ? [...p.images] : [];
    const fotos = window._prodImagens.map((url,i) => `
      <div id="foto-${i}" style="position:relative;width:72px;height:72px;flex-shrink:0">
        <img src="${url}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:0.5px solid var(--border)"/>
        <button onclick="removerFoto(${i})" style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:var(--red);border:none;color:#fff;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1">✕</button>
      </div>`).join('');
    abrirModal(`
      <button onclick="fecharModal()" style="position:absolute;top:12px;right:12px;background:none;border:none;color:var(--gray);cursor:pointer;font-size:20px">✕</button>
      <h3 style="font-size:16px;font-weight:800;margin-bottom:16px">${id?'Editar produto':'Novo produto'}</h3>
      <div class="form-group"><label>Nome do produto *</label><input type="text" id="prod-nome" value="${p.name||''}" placeholder="Ex: Camiseta IRES"/></div>
      <div class="form-group"><label>Descrição</label><input type="text" id="prod-desc" value="${p.description||''}" placeholder="Ex: 100% algodão · P M G GG"/></div>
      <div class="form-row">
        <div class="form-group"><label>Preço (R$) *</label><input type="number" id="prod-preco" value="${p.price||''}" placeholder="38.90" min="0" step="0.01"/></div>
        <div class="form-group"><label>Qtd mínima *</label><input type="number" id="prod-min" value="${p.min_quantity||1}" min="1"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Estoque (opcional)</label><input type="number" id="prod-estoque" value="${p.stock||''}" placeholder="Deixe vazio = ilimitado"/></div>
        <div class="form-group"><label>Categoria</label>
          <select id="prod-cat">
            <option value="">Sem categoria</option>
            ${cats.map(c=>`<option value="${c.id}" ${p.category_id===c.id?'selected':''}>${c.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Fotos do produto (até 6)</label>
        <div id="fotos-grid" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">
          ${fotos}
          <div id="btn-add-foto" onclick="document.getElementById('prod-img-file').click()"
            style="width:72px;height:72px;border:0.5px dashed var(--border);border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;background:var(--black);flex-shrink:0"
            onmouseover="this.style.borderColor='var(--pink)'" onmouseout="this.style.borderColor='var(--border)'">
            <span style="font-size:24px;color:var(--gray);line-height:1">+</span>
            <span style="font-size:9px;color:var(--gray);margin-top:2px">Adicionar</span>
          </div>
        </div>
        <div id="upload-progress" style="display:none">
          <div style="height:3px;background:var(--border);border-radius:2px;overflow:hidden"><div id="upload-bar" style="height:100%;width:0%;background:var(--pink);transition:width 0.3s"></div></div>
          <span style="font-size:11px;color:var(--gray);margin-top:4px;display:block" id="upload-label">Enviando...</span>
        </div>
        <input type="file" id="prod-img-file" accept="image/*" multiple style="display:none" onchange="uploadMultiplas(this.files)"/>
      </div>
      <div style="display:flex;gap:10px;margin-top:4px">
        <button class="btn btn-outline" style="flex:1" onclick="fecharModal()">Cancelar</button>
        <button class="btn btn-primary" style="flex:1" id="btn-salvar-prod" onclick="salvarProduto(${id?`'${id}'`:'null'})">Salvar produto</button>
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
  if (!nome)        { showToast('Informe o nome do produto.','error'); return; }
  if (isNaN(preco)) { showToast('Informe o preço.','error'); return; }
  if (min < 1)      { showToast('Quantidade mínima deve ser pelo menos 1.','error'); return; }
  const payload = { name:nome, description:desc, price:preco, min_quantity:min, stock:estoque?parseInt(estoque):null, category_id:catId||null, images:window._prodImagens||[] };
  const { error } = id ? await _supabase.from('products').update(payload).eq('id',id) : await _supabase.from('products').insert({...payload,is_active:true});
  if (error) { showToast('Erro ao salvar produto.','error'); return; }
  showToast(id?'Produto atualizado!':'Produto criado!','success');
  fecharModal(); renderProdutos();
}

async function toggleProduto(id, ativo) {
  const { error } = await _supabase.from('products').update({ is_active:!ativo }).eq('id',id);
  if (error) { showToast('Erro.','error'); return; }
  showToast(ativo?'Produto desativado.':'Produto ativado!','success');
  renderProdutos();
}

// ════════════════════════════════════════════
// EMBAIXADORAS
// ════════════════════════════════════════════
async function renderEmbaixadoras() {
  const { data } = await _supabase.from('profiles').select('*').eq('role','reseller').order('created_at',{ascending:false});
  const statusCores = { pending:'pill-amber', active:'pill-green', suspended:'pill-red' };
  const statusNomes = { pending:'Pendente', active:'Ativa', suspended:'Suspensa' };
  document.getElementById('conteudo-principal').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <h2 style="font-size:20px;font-weight:800">Embaixadoras</h2>
      <span class="pill pill-gray">${data?.length||0} cadastradas</span>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      ${['','pending','active','suspended'].map(s=>`<div class="filter-pill ${!s?'active':''}" onclick="filtrarEmbs(this,'${s}')">${!s?'Todas':statusNomes[s]}</div>`).join('')}
    </div>
    <div style="display:flex;flex-direction:column;gap:8px" id="lista-embs">
      ${(data||[]).map(e=>embRow(e,statusCores,statusNomes)).join('')||'<p style="color:var(--gray);font-size:13px">Nenhuma embaixadora cadastrada.</p>'}
    </div>
  `;
  window._todasEmbs = data||[];
}

function embRow(e, statusCores, statusNomes) {
  return `
    <div style="background:#111;border:0.5px solid var(--border);border-radius:var(--radius-lg);padding:14px;" data-status="${e.status}">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;cursor:pointer" onclick="abrirDetalhesEmb('${e.id}')">
        <div class="avatar">${initials(e.full_name)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.full_name||'Sem nome'}</div>
          <div style="font-size:11px;color:var(--gray);margin-top:1px">${e.phone||''} · ${new Date(e.created_at).toLocaleDateString('pt-BR')}</div>
        </div>
        <span class="pill ${statusCores[e.status]||'pill-gray'}">${statusNomes[e.status]||e.status}</span>
      </div>
      <div style="display:flex;gap:6px;justify-content:flex-end">
        ${e.status==='pending'   ?`<button class="btn btn-sm btn-primary" style="width:auto" onclick="aprovarEmb('${e.id}')">Aprovar</button>`:''}
        ${e.status==='active'    ?`<button class="btn btn-sm btn-danger" onclick="suspenderEmb('${e.id}')">Suspender</button>`:''}
        ${e.status==='suspended' ?`<button class="btn btn-sm btn-outline" onclick="aprovarEmb('${e.id}')">Reativar</button>`:''}
        ${e.status==='pending'   ?`<button class="btn btn-sm btn-outline" onclick="reprovarEmb('${e.id}')">Reprovar</button>`:''}
      </div>
    </div>`;
}

async function abrirDetalhesEmb(id) {
  const [{ data: e }, { data: pedidos }] = await Promise.all([
    _supabase.from('profiles').select('*').eq('id',id).single(),
    _supabase.from('orders').select('id,total,status,created_at').eq('reseller_id',id).order('created_at',{ascending:false}).limit(5),
  ]);
  if (!e) return;
  const totalGasto = (pedidos||[]).reduce((a,o)=>a+Number(o.total),0);
  const statusCores = { pending:'pill-amber', active:'pill-green', suspended:'pill-red' };
  const statusNomes = { pending:'Pendente', active:'Ativa', suspended:'Suspensa' };
  abrirModal(`
    <button onclick="fecharModal()" style="position:absolute;top:12px;right:12px;background:none;border:none;color:var(--gray);cursor:pointer;font-size:20px">✕</button>
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
      <div class="avatar" style="width:52px;height:52px;font-size:18px">${initials(e.full_name)}</div>
      <div>
        <div style="font-size:16px;font-weight:800">${e.full_name||'Sem nome'}</div>
        <span class="pill ${statusCores[e.status]||'pill-gray'}">${statusNomes[e.status]||e.status}</span>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
      <div style="background:var(--black);border:0.5px solid var(--border);border-radius:var(--radius-md);padding:12px"><div style="font-size:11px;color:var(--gray);margin-bottom:4px">WhatsApp</div><div style="font-size:13px;font-weight:600">${e.phone||'—'}</div></div>
      <div style="background:var(--black);border:0.5px solid var(--border);border-radius:var(--radius-md);padding:12px"><div style="font-size:11px;color:var(--gray);margin-bottom:4px">CPF</div><div style="font-size:13px;font-weight:600">${e.cpf||'—'}</div></div>
      <div style="background:var(--black);border:0.5px solid var(--border);border-radius:var(--radius-md);padding:12px"><div style="font-size:11px;color:var(--gray);margin-bottom:4px">Como nos encontrou</div><div style="font-size:13px;font-weight:600">${e.how_found||'—'}</div></div>
      <div style="background:var(--black);border:0.5px solid var(--border);border-radius:var(--radius-md);padding:12px"><div style="font-size:11px;color:var(--gray);margin-bottom:4px">Cadastro</div><div style="font-size:13px;font-weight:600">${new Date(e.created_at).toLocaleDateString('pt-BR')}</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
      <div style="background:var(--black);border:0.5px solid var(--border);border-top:2px solid var(--pink);border-radius:var(--radius-md);padding:12px"><div style="font-size:20px;font-weight:900">${(pedidos||[]).length}</div><div style="font-size:11px;color:var(--gray)">Pedidos feitos</div></div>
      <div style="background:var(--black);border:0.5px solid var(--border);border-top:2px solid var(--pink);border-radius:var(--radius-md);padding:12px"><div style="font-size:20px;font-weight:900">${formatBRL(totalGasto)}</div><div style="font-size:11px;color:var(--gray)">Total comprado</div></div>
    </div>
    <div style="display:flex;gap:8px">
      ${e.status==='pending'   ?`<button class="btn btn-primary btn-sm" style="flex:1" onclick="aprovarEmb('${e.id}');fecharModal()">Aprovar</button>`:''}
      ${e.status==='active'    ?`<button class="btn btn-danger btn-sm" style="flex:1" onclick="suspenderEmb('${e.id}');fecharModal()">Suspender</button>`:''}
      ${e.status==='suspended' ?`<button class="btn btn-outline btn-sm" style="flex:1" onclick="aprovarEmb('${e.id}');fecharModal()">Reativar</button>`:''}
      <button class="btn btn-primary btn-sm" style="flex:1" onclick="abrirEditarEmb('${e.id}')">Editar perfil</button>
      <button class="btn btn-outline btn-sm" style="flex:1" onclick="fecharModal()">Fechar</button>
    </div>
  `);
}

function filtrarEmbs(el, status) {
  document.querySelectorAll('.filter-pill').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  const statusCores = { pending:'pill-amber', active:'pill-green', suspended:'pill-red' };
  const statusNomes = { pending:'Pendente', active:'Ativa', suspended:'Suspensa' };
  const filtradas = status ? (window._todasEmbs||[]).filter(e=>e.status===status) : (window._todasEmbs||[]);
  document.getElementById('lista-embs').innerHTML = filtradas.map(e=>embRow(e,statusCores,statusNomes)).join('')||'<p style="color:var(--gray);font-size:13px">Nenhuma embaixadora.</p>';
}

async function aprovarEmb(id) {
  const { error } = await _supabase.from('profiles').update({ status:'active' }).eq('id',id);
  if (error) { showToast('Erro ao aprovar.','error'); return; }
  showToast('Embaixadora aprovada!','success');
  if (paginaAtiva==='dashboard') renderDashboard(); else renderEmbaixadoras();
}

async function reprovarEmb(id) {
  const { error } = await _supabase.from('profiles').update({ status:'suspended' }).eq('id',id);
  if (error) { showToast('Erro.','error'); return; }
  showToast('Embaixadora reprovada.','success');
  if (paginaAtiva==='dashboard') renderDashboard(); else renderEmbaixadoras();
}

async function suspenderEmb(id) {
  const { error } = await _supabase.from('profiles').update({ status:'suspended' }).eq('id',id);
  if (error) { showToast('Erro.','error'); return; }
  showToast('Embaixadora suspensa.','success');
  renderEmbaixadoras();
}

// ════════════════════════════════════════════
// COMUNICADOS
// ════════════════════════════════════════════
async function renderComunicados() {
  const { data } = await _supabase.from('messages').select('*, profiles(full_name)').eq('is_broadcast',true).order('created_at',{ascending:false});
  document.getElementById('conteudo-principal').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <h2 style="font-size:20px;font-weight:800">Comunicados</h2>
      <button class="btn btn-primary btn-sm" style="width:auto" onclick="abrirFormComunicado()">+ Novo comunicado</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${(data||[]).map(m=>`
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <div style="font-size:14px;font-weight:700">${m.subject||'Sem título'}</div>
            <div style="font-size:11px;color:var(--gray)">${new Date(m.created_at).toLocaleDateString('pt-BR')}</div>
          </div>
          <p style="font-size:13px;color:var(--gray-lighter);line-height:1.6">${m.body}</p>
          <div style="margin-top:10px"><span class="pill pill-pink">Broadcast</span></div>
        </div>`).join('')||'<p style="color:var(--gray);font-size:13px">Nenhum comunicado enviado.</p>'}
    </div>
  `;
}

function abrirFormComunicado() {
  abrirModal(`
    <button onclick="fecharModal()" style="position:absolute;top:12px;right:12px;background:none;border:none;color:var(--gray);cursor:pointer;font-size:20px">✕</button>
    <h3 style="font-size:16px;font-weight:800;margin-bottom:16px">Novo comunicado</h3>
    <div class="form-group"><label>Título</label><input type="text" id="com-titulo" placeholder="Ex: Novidade na coleção!"/></div>
    <div class="form-group"><label>Mensagem *</label><textarea id="com-corpo" rows="5" placeholder="Escreva o comunicado..." style="resize:vertical"></textarea></div>
    <div class="info-box"><div class="info-box-dot"></div><p>Este comunicado será enviado para <strong>todas as embaixadoras ativas</strong>.</p></div>
    <div style="display:flex;gap:10px">
      <button class="btn btn-outline" style="flex:1" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-primary" style="flex:1" onclick="enviarComunicado()">Enviar</button>
    </div>
  `);
}

async function enviarComunicado() {
  const subject = document.getElementById('com-titulo').value.trim();
  const body    = document.getElementById('com-corpo').value.trim();
  if (!body) { showToast('Escreva a mensagem.','error'); return; }
  const { data: { session } } = await _supabase.auth.getSession();
  const { error } = await _supabase.from('messages').insert({ sender_id:session.user.id, recipient_id:null, subject, body, is_broadcast:true });
  if (error) { showToast('Erro ao enviar.','error'); return; }
  showToast('Comunicado enviado!','success');
  fecharModal(); renderComunicados();
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
// UPLOAD MÚLTIPLO COM CROPPER
// ════════════════════════════════════════════
let _cropperInstance = null;
let _arquivosPendentes = [];

async function uploadMultiplas(files) {
  if (!files || !files.length) return;
  const imgs = window._prodImagens || [];
  if (imgs.length >= 6) { showToast('Máximo de 6 fotos atingido.','error'); return; }
  _arquivosPendentes = Array.from(files).filter(f=>f.type.startsWith('image/')).slice(0,6-imgs.length);
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
          <div><div style="font-size:15px;font-weight:700;color:#fff">Recortar imagem</div><div style="font-size:11px;color:#666;margin-top:2px">Tamanho ideal: <strong style="color:#f03faa">800 × 800px</strong></div></div>
          <button onclick="fecharCropper()" style="background:none;border:none;color:#666;cursor:pointer;font-size:20px">✕</button>
        </div>
        <div style="max-height:360px;overflow:hidden;border-radius:8px;background:#0d0d0d;margin-bottom:14px">
          <img id="cropper-img" src="${e.target.result}" style="max-width:100%;display:block"/>
        </div>
        <div style="display:flex;gap:8px">
          <button onclick="pularCrop()" style="flex:1;padding:10px;background:transparent;border:0.5px solid #2a2a2a;border-radius:8px;color:#999;font-size:13px;cursor:pointer">Usar original</button>
          <button onclick="confirmarCrop()" style="flex:1;padding:10px;background:#f03faa;border:none;border-radius:8px;color:#fff;font-size:13px;font-weight:700;cursor:pointer">Recortar e usar ✓</button>
        </div>
      </div>`;
    mc.style.display = 'flex';
    if (_cropperInstance) { _cropperInstance.destroy(); _cropperInstance = null; }
    const imgEl = document.getElementById('cropper-img');
    _cropperInstance = new Cropper(imgEl, { aspectRatio:1, viewMode:1, dragMode:'move', autoCropArea:0.9, background:false, guides:true });
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
  const canvas = _cropperInstance.getCroppedCanvas({ width:800, height:800 });
  canvas.toBlob(async (blob) => {
    const file = new File([blob], `crop_${Date.now()}.jpg`, { type:'image/jpeg' });
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
  const ext = file.name.split('.').pop();
  const fileName = `produto_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await _supabase.storage.from('produtos').upload(fileName, file, { cacheControl:'3600', upsert:false });
  if (error) { showToast('Erro no upload: '+error.message,'error'); document.getElementById('upload-progress').style.display='none'; document.getElementById('btn-salvar-prod').disabled=false; return; }
  document.getElementById('upload-bar').style.width = '100%';
  const { data: { publicUrl } } = _supabase.storage.from('produtos').getPublicUrl(fileName);
  window._prodImagens = window._prodImagens || [];
  window._prodImagens.push(publicUrl);
  const idx  = window._prodImagens.length - 1;
  const grid = document.getElementById('fotos-grid');
  const btn  = document.getElementById('btn-add-foto');
  const div  = document.createElement('div');
  div.id = `foto-${idx}`;
  div.style.cssText = 'position:relative;width:72px;height:72px;flex-shrink:0';
  div.innerHTML = `<img src="${publicUrl}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:0.5px solid var(--border)"/><button onclick="removerFoto(${idx})" style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:var(--red);border:none;color:#fff;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>`;
  grid.insertBefore(div, btn);
  setTimeout(() => { document.getElementById('upload-progress').style.display='none'; document.getElementById('btn-salvar-prod').disabled=false; }, 500);
}

function removerFoto(idx) {
  window._prodImagens = (window._prodImagens||[]).filter((_,i)=>i!==idx);
  const grid = document.getElementById('fotos-grid');
  const btn  = document.getElementById('btn-add-foto');
  Array.from(grid.children).forEach(el=>{ if (el.id!=='btn-add-foto') el.remove(); });
  window._prodImagens.forEach((url,i) => {
    const div = document.createElement('div');
    div.id = `foto-${i}`;
    div.style.cssText = 'position:relative;width:72px;height:72px;flex-shrink:0';
    div.innerHTML = `<img src="${url}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:0.5px solid var(--border)"/><button onclick="removerFoto(${i})" style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:var(--red);border:none;color:#fff;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>`;
    grid.insertBefore(div, btn);
  });
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
      ${(data||[]).map(c=>`
        <div style="background:#111;border:0.5px solid var(--border);border-radius:var(--radius-lg);padding:12px 16px;display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:13px;font-weight:600">${c.name}</span>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm btn-outline" onclick="abrirFormCategoria('${c.id}','${c.name}')">Editar</button>
            <button class="btn btn-sm btn-danger" onclick="deletarCategoria('${c.id}')">Excluir</button>
          </div>
        </div>`).join('')||'<p style="color:var(--gray);font-size:13px">Nenhuma categoria ainda.</p>'}
    </div>
  `;
}

function abrirFormCategoria(id, nome) {
  abrirModal(`
    <button onclick="fecharModal()" style="position:absolute;top:12px;right:12px;background:none;border:none;color:var(--gray);cursor:pointer;font-size:20px">✕</button>
    <h3 style="font-size:16px;font-weight:800;margin-bottom:16px">${id?'Editar categoria':'Nova categoria'}</h3>
    <div class="form-group"><label>Nome *</label><input type="text" id="cat-nome" value="${nome||''}" placeholder="Ex: Roupas"/></div>
    <div style="display:flex;gap:10px;margin-top:4px">
      <button class="btn btn-outline" style="flex:1" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-primary" style="flex:1" onclick="salvarCategoria(${id?`'${id}'`:'null'})">Salvar</button>
    </div>
  `);
}

async function salvarCategoria(id) {
  const nome = document.getElementById('cat-nome').value.trim();
  if (!nome) { showToast('Informe o nome.','error'); return; }
  const slug = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
  const { error } = id ? await _supabase.from('categories').update({name:nome,slug}).eq('id',id) : await _supabase.from('categories').insert({name:nome,slug});
  if (error) { showToast('Erro: '+error.message,'error'); return; }
  showToast(id?'Categoria atualizada!':'Categoria criada!','success');
  fecharModal(); renderCategorias();
  const { data } = await _supabase.from('categories').select('id,name').order('name');
  window._categorias = data||[];
}

async function deletarCategoria(id) {
  if (!confirm('Excluir esta categoria?')) return;
  const { error } = await _supabase.from('categories').delete().eq('id',id);
  if (error) { showToast('Erro ao excluir.','error'); return; }
  showToast('Categoria excluída.','success'); renderCategorias();
}

// ════════════════════════════════════════════
// DEPOIMENTOS — Admin
// ════════════════════════════════════════════
async function renderDepoimentosAdmin() {
  const { data } = await _supabase.from('testimonials').select('*, profiles(full_name)').order('created_at',{ascending:false});
  const pendentes  = (data||[]).filter(t=>t.status==='pending');
  const aprovados  = (data||[]).filter(t=>t.status==='approved');
  document.getElementById('conteudo-principal').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <h2 style="font-size:20px;font-weight:800">Depoimentos</h2>
      <div style="display:flex;gap:8px"><span class="pill pill-amber">${pendentes.length} pendentes</span><span class="pill pill-green">${aprovados.length} aprovados</span></div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <div class="filter-pill active" onclick="filtrarDeps(this,'all')">Todos</div>
      <div class="filter-pill" onclick="filtrarDeps(this,'pending')">Pendentes</div>
      <div class="filter-pill" onclick="filtrarDeps(this,'approved')">Aprovados</div>
      <div class="filter-pill" onclick="filtrarDeps(this,'rejected')">Rejeitados</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px" id="lista-deps">
      ${(data||[]).map(t=>depAdminCard(t)).join('')||'<p style="color:var(--gray);font-size:13px">Nenhum depoimento ainda.</p>'}
    </div>
  `;
  window._todosDepos = data||[];
}

function depAdminCard(t) {
  const nome = t.profiles?.full_name||'Embaixadora';
  const ini  = nome.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  const stMap = { pending:{label:'Pendente',cls:'pill-amber'}, approved:{label:'Aprovado',cls:'pill-green'}, rejected:{label:'Rejeitado',cls:'pill-red'} };
  const st = stMap[t.status]||stMap.pending;
  return `
    <div class="card" data-status="${t.status}">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <div class="avatar">${ini}</div>
        <div style="flex:1"><div style="font-size:13px;font-weight:600">${nome}</div><div style="font-size:11px;color:var(--gray)">${new Date(t.created_at).toLocaleDateString('pt-BR')}</div></div>
        <span class="pill ${st.cls}">${st.label}</span>
      </div>
      ${t.image_url?`<div onclick="abrirLightboxAdmin('${t.image_url}')" style="border-radius:var(--radius-md);overflow:hidden;margin-bottom:10px;height:160px;cursor:zoom-in;position:relative;background:var(--black)"><img src="${t.image_url}" style="width:100%;height:100%;object-fit:cover;display:block"/><div style="position:absolute;bottom:6px;right:6px;background:rgba(0,0,0,0.6);border-radius:6px;padding:3px 8px;font-size:10px;color:#fff">Ampliar</div></div>`:''}
      <p style="font-size:13px;color:var(--gray-lighter);line-height:1.7;margin-bottom:12px">${t.body}</p>
      ${t.status==='pending'?`<div style="display:flex;gap:8px"><button class="btn btn-primary btn-sm" style="flex:1" onclick="aprovarDep('${t.id}')">Aprovar</button><button class="btn btn-danger btn-sm" style="flex:1" onclick="rejeitarDep('${t.id}')">Rejeitar</button></div>`
        :t.status==='approved'?`<button class="btn btn-outline btn-sm" onclick="rejeitarDep('${t.id}')">Remover aprovação</button>`
        :`<button class="btn btn-outline btn-sm" onclick="aprovarDep('${t.id}')">Aprovar</button>`}
    </div>`;
}

function filtrarDeps(el, status) {
  document.querySelectorAll('.filter-pill').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  const lista = status==='all' ? window._todosDepos : (window._todosDepos||[]).filter(t=>t.status===status);
  document.getElementById('lista-deps').innerHTML = lista.map(t=>depAdminCard(t)).join('')||'<p style="color:var(--gray);font-size:13px">Nenhum depoimento.</p>';
}

async function aprovarDep(id) {
  const { error } = await _supabase.from('testimonials').update({status:'approved'}).eq('id',id);
  if (error) { showToast('Erro.','error'); return; }
  showToast('Depoimento aprovado!','success'); renderDepoimentosAdmin();
}

async function rejeitarDep(id) {
  const { error } = await _supabase.from('testimonials').update({status:'rejected'}).eq('id',id);
  if (error) { showToast('Erro.','error'); return; }
  showToast('Depoimento rejeitado.','success'); renderDepoimentosAdmin();
}

// ════════════════════════════════════════════
// SUPORTE — Admin
// ════════════════════════════════════════════
async function renderSuporteAdmin() {
  const { data } = await _supabase.from('support_messages').select('*, profiles(full_name)').order('created_at',{ascending:false});
  const abertos = (data||[]).filter(m=>m.status==='open');
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
      ${(data||[]).map(m=>supAdminCard(m)).join('')||'<p style="color:var(--gray);font-size:13px">Nenhuma mensagem de suporte.</p>'}
    </div>
  `;
  window._todosSup = data||[];
}

function supAdminCard(m) {
  const nome = m.profiles?.full_name||'Embaixadora';
  const stMap = { open:{label:'Em aberto',cls:'pill-amber'}, answered:{label:'Respondido',cls:'pill-green'}, closed:{label:'Encerrado',cls:'pill-gray'} };
  const st = stMap[m.status]||stMap.open;
  return `
    <div class="card" data-status="${m.status}">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px">
        <div><div style="font-size:13px;font-weight:700">${m.subject}</div><div style="font-size:11px;color:var(--gray);margin-top:2px">${nome} · ${new Date(m.created_at).toLocaleDateString('pt-BR')}</div></div>
        <span class="pill ${st.cls}" style="flex-shrink:0">${st.label}</span>
      </div>
      <p style="font-size:13px;color:var(--gray-lighter);line-height:1.7;margin-bottom:12px">${m.body}</p>
      ${m.reply?`<div style="background:var(--black);border:0.5px solid var(--pink-deep);border-radius:var(--radius-md);padding:12px;margin-bottom:12px"><div style="font-size:10px;font-weight:700;color:var(--pink);text-transform:uppercase;letter-spacing:1px;margin-bottom:5px">Sua resposta</div><p style="font-size:12px;color:var(--gray-lighter);line-height:1.6">${m.reply}</p></div>`:''}
      <div style="display:flex;gap:8px">
        ${m.status!=='closed'?`<button class="btn btn-primary btn-sm" style="flex:1" onclick="abrirRespostaSuporteAdmin('${m.id}')">${m.status==='answered'?'Editar resposta':'Responder'}</button>`:''}
        ${m.status!=='closed'?`<button class="btn btn-outline btn-sm" onclick="encerrarSuporteAdmin('${m.id}')">Encerrar</button>`:''}
      </div>
    </div>`;
}

function filtrarSup(el, status) {
  document.querySelectorAll('.filter-pill').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  const lista = status==='all' ? window._todosSup : (window._todosSup||[]).filter(m=>m.status===status);
  document.getElementById('lista-sup').innerHTML = lista.map(m=>supAdminCard(m)).join('')||'<p style="color:var(--gray);font-size:13px">Nenhuma mensagem.</p>';
}

function abrirRespostaSuporteAdmin(id) {
  const m = (window._todosSup||[]).find(x=>x.id===id);
  if (!m) return;
  abrirModal(`
    <button onclick="fecharModal()" style="position:absolute;top:12px;right:12px;background:none;border:none;color:var(--gray);cursor:pointer;font-size:20px">✕</button>
    <h3 style="font-size:16px;font-weight:800;margin-bottom:6px">Responder suporte</h3>
    <div style="background:var(--black);border:0.5px solid var(--border);border-radius:var(--radius-md);padding:12px;margin-bottom:16px">
      <div style="font-size:11px;color:var(--gray);margin-bottom:4px">${m.profiles?.full_name} perguntou:</div>
      <p style="font-size:13px;color:var(--gray-lighter);line-height:1.6">${m.body}</p>
    </div>
    <div class="form-group"><label>Sua resposta *</label><textarea id="sup-reply" rows="5" style="resize:vertical" placeholder="Escreva a resposta...">${m.reply||''}</textarea></div>
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
  btn.disabled=true; btn.innerHTML='<div class="spinner" style="margin:0 auto"></div>';
  const { error } = await _supabase.from('support_messages').update({ reply, status:'answered', replied_at:new Date().toISOString() }).eq('id',id);
  if (error) { showToast('Erro ao responder.','error'); btn.disabled=false; btn.textContent='Enviar resposta'; return; }
  showToast('Resposta enviada!','success');
  fecharModal(); renderSuporteAdmin();
}

async function encerrarSuporteAdmin(id) {
  const { error } = await _supabase.from('support_messages').update({status:'closed'}).eq('id',id);
  if (error) { showToast('Erro.','error'); return; }
  showToast('Conversa encerrada.','success'); renderSuporteAdmin();
}

function abrirLightboxAdmin(url) {
  let lb = document.getElementById('lightbox-admin');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'lightbox-admin';
    lb.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;cursor:zoom-out';
    document.body.appendChild(lb);
  }
  lb.innerHTML = `<div style="position:relative;max-width:90vw;max-height:90vh"><img src="${url}" style="max-width:100%;max-height:90vh;border-radius:12px;display:block;object-fit:contain"/><button onclick="document.getElementById('lightbox-admin').remove();document.body.style.overflow=''" style="position:absolute;top:-14px;right:-14px;width:30px;height:30px;border-radius:50%;background:#f03faa;border:none;color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:700">✕</button></div>`;
  lb.style.display='flex'; document.body.style.overflow='hidden';
  lb.onclick=(e)=>{ if(e.target===lb){lb.remove();document.body.style.overflow='';} };
}

// ════════════════════════════════════════════
// EDITAR PERFIL DA EMBAIXADORA
// ════════════════════════════════════════════
async function abrirEditarEmb(id) {
  const { data: e } = await _supabase.from('profiles').select('*').eq('id',id).single();
  if (!e) return;
  const addr = e.address||{};
  abrirModal(`
    <button onclick="fecharModal()" style="position:absolute;top:12px;right:12px;background:none;border:none;color:var(--gray);cursor:pointer;font-size:20px">✕</button>
    <h3 style="font-size:16px;font-weight:800;margin-bottom:16px">Editar — ${e.full_name||'Embaixadora'}</h3>
    <div class="form-group"><label>Nome completo *</label><input type="text" id="adm-nome" value="${e.full_name||''}"/></div>
    <div class="form-row">
      <div class="form-group"><label>WhatsApp</label><input type="tel" id="adm-phone" value="${e.phone||''}"/></div>
      <div class="form-group"><label>E-mail</label><input type="email" id="adm-email" value="${e.email||''}"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>CPF</label><input type="text" id="adm-cpf" value="${e.cpf||''}" placeholder="000.000.000-00" maxlength="14" oninput="mascaraCPFAdmin(this)"/></div>
      <div class="form-group"><label>Status</label>
        <select id="adm-status">
          <option value="pending" ${e.status==='pending'?'selected':''}>Pendente</option>
          <option value="active" ${e.status==='active'?'selected':''}>Ativa</option>
          <option value="suspended" ${e.status==='suspended'?'selected':''}>Suspensa</option>
        </select>
      </div>
    </div>
    <div style="font-size:11px;font-weight:700;color:var(--gray);text-transform:uppercase;letter-spacing:1.5px;margin:12px 0 10px">Endereço</div>
    <div class="form-row">
      <div class="form-group"><label>CEP</label><input type="text" id="adm-cep" value="${addr.cep||''}" placeholder="00000-000" maxlength="9" onblur="buscarCEPAdmin(this.value)"/></div>
      <div class="form-group"><label>Estado</label><input type="text" id="adm-estado" value="${addr.estado||''}" maxlength="2"/></div>
    </div>
    <div class="form-group"><label>Rua</label><input type="text" id="adm-rua" value="${addr.rua||''}"/></div>
    <div class="form-row">
      <div class="form-group"><label>Número</label><input type="text" id="adm-numero" value="${addr.numero||''}"/></div>
      <div class="form-group"><label>Complemento</label><input type="text" id="adm-complemento" value="${addr.complemento||''}"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Bairro</label><input type="text" id="adm-bairro" value="${addr.bairro||''}"/></div>
      <div class="form-group"><label>Cidade</label><input type="text" id="adm-cidade" value="${addr.cidade||''}"/></div>
    </div>
    <div class="form-group"><label>Observações internas</label><textarea id="adm-notes" rows="3" placeholder="Anotações sobre esta embaixadora...">${e.admin_notes||''}</textarea></div>
    <div style="display:flex;gap:10px;margin-top:4px">
      <button class="btn btn-outline" style="flex:1" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-primary" style="flex:1" id="btn-salvar-emb" onclick="salvarEmbAdmin('${id}')">Salvar</button>
    </div>
  `);
}

function validarCPF(cpf) {
  const digits = cpf.replace(/\D/g,'');
  if (digits.length!==11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  let sum=0;
  for (let i=0;i<9;i++) sum+=parseInt(digits[i])*(10-i);
  let r=(sum*10)%11; if(r===10||r===11) r=0;
  if (r!==parseInt(digits[9])) return false;
  sum=0;
  for (let i=0;i<10;i++) sum+=parseInt(digits[i])*(11-i);
  r=(sum*10)%11; if(r===10||r===11) r=0;
  return r===parseInt(digits[10]);
}

function mascaraCPFAdmin(input) {
  let v=input.value.replace(/\D/g,'').slice(0,11);
  if(v.length>9) v=`${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6,9)}-${v.slice(9)}`;
  else if(v.length>6) v=`${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6)}`;
  else if(v.length>3) v=`${v.slice(0,3)}.${v.slice(3)}`;
  input.value=v;
  const digits=input.value.replace(/\D/g,'');
  if(digits.length===11) input.style.borderColor=validarCPF(digits)?'var(--green)':'var(--red)';
  else input.style.borderColor='';
}

async function buscarCEPAdmin(cep) {
  const digits=cep.replace(/\D/g,'');
  if(digits.length!==8) return;
  try {
    const resp=await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    const data=await resp.json();
    if(data.erro) return;
    document.getElementById('adm-rua').value=data.logradouro||'';
    document.getElementById('adm-bairro').value=data.bairro||'';
    document.getElementById('adm-cidade').value=data.localidade||'';
    document.getElementById('adm-estado').value=data.uf||'';
    showToast('Endereço preenchido!','success');
  } catch {}
}

async function salvarEmbAdmin(id) {
  const cpf=document.getElementById('adm-cpf').value.trim();
  if(cpf && !validarCPF(cpf)) { showToast('CPF inválido.','error'); document.getElementById('adm-cpf').style.borderColor='var(--red)'; return; }
  document.getElementById('adm-cpf').style.borderColor='';
  const btn=document.getElementById('btn-salvar-emb');
  btn.disabled=true; btn.innerHTML='<div class="spinner" style="margin:0 auto"></div>';
  const address={ cep:document.getElementById('adm-cep').value.trim(), rua:document.getElementById('adm-rua').value.trim(), numero:document.getElementById('adm-numero').value.trim(), complemento:document.getElementById('adm-complemento').value.trim(), bairro:document.getElementById('adm-bairro').value.trim(), cidade:document.getElementById('adm-cidade').value.trim(), estado:document.getElementById('adm-estado').value.trim() };
  const { error } = await _supabase.from('profiles').update({ full_name:document.getElementById('adm-nome').value.trim(), phone:document.getElementById('adm-phone').value.trim(), email:document.getElementById('adm-email').value.trim(), cpf, status:document.getElementById('adm-status').value, admin_notes:document.getElementById('adm-notes').value.trim(), address }).eq('id',id);
  if(error){ showToast('Erro: '+error.message,'error'); btn.disabled=false; btn.textContent='Salvar'; return; }
  showToast('Perfil atualizado!','success');
  fecharModal(); renderEmbaixadoras();
}

// ════════════════════════════════════════════
// CRIATIVOS — Admin
// ════════════════════════════════════════════
async function renderCriativosAdmin() {
  const { data } = await _supabase.from('creatives').select('*').order('created_at',{ascending:false});
  const fmtColor = {
    story:{bg:'rgba(196,50,90,.12)',border:'rgba(196,50,90,.3)',text:'#C4325A'},
    feed: {bg:'rgba(76,175,122,.1)', border:'rgba(76,175,122,.25)',text:'#4CAF7A'},
    reels:{bg:'rgba(201,168,76,.1)', border:'rgba(201,168,76,.28)',text:'#C9A84C'},
    outro:{bg:'rgba(91,143,212,.1)', border:'rgba(91,143,212,.28)',text:'#5B8FD4'},
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
      ${(data||[]).length?(data||[]).map(c=>_criativoAdmCard(c,fmtColor)).join(''):'<p style="color:var(--gray);font-size:13px;grid-column:1/-1">Nenhum criativo cadastrado.</p>'}
    </div>
  `;
  window._todosCriativosAdm = data||[];
}

function _criativoAdmCard(c,fmtColor) {
  const fmt=fmtColor[c.format]||fmtColor.outro;
  const thumb=c.thumbnail_url||c.file_url;
  return `
    <div style="background:#111;border:0.5px solid var(--border);border-radius:14px;overflow:hidden">
      <div style="position:relative;height:160px;background:var(--black);overflow:hidden">
        ${thumb&&c.file_type!=='video'?`<img src="${thumb}" style="width:100%;height:100%;object-fit:cover"/>`:`<div style="display:flex;align-items:center;justify-content:center;height:100%"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`}
        <div style="position:absolute;top:8px;left:8px;background:${fmt.bg};border:0.5px solid ${fmt.border};color:${fmt.text};font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px">${c.format.toUpperCase()}</div>
        <div style="position:absolute;top:8px;right:8px"><span class="pill ${c.is_active?'pill-green':'pill-gray'}">${c.is_active?'Ativo':'Inativo'}</span></div>
      </div>
      <div style="padding:12px">
        <div style="font-size:13px;font-weight:600;color:var(--white);margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.title}</div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm btn-outline" style="flex:1" onclick="abrirFormCriativo('${c.id}')">Editar</button>
          <button class="btn btn-sm btn-danger" onclick="toggleCriativo('${c.id}',${c.is_active})">${c.is_active?'Desativar':'Ativar'}</button>
        </div>
      </div>
    </div>`;
}

function filtrarCriativosAdm(el,formato) {
  document.querySelectorAll('.filter-pill').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  const fmtColor={story:{bg:'rgba(196,50,90,.12)',border:'rgba(196,50,90,.3)',text:'#C4325A'},feed:{bg:'rgba(76,175,122,.1)',border:'rgba(76,175,122,.25)',text:'#4CAF7A'},reels:{bg:'rgba(201,168,76,.1)',border:'rgba(201,168,76,.28)',text:'#C9A84C'},outro:{bg:'rgba(91,143,212,.1)',border:'rgba(91,143,212,.28)',text:'#5B8FD4'}};
  const lista=formato?(window._todosCriativosAdm||[]).filter(c=>c.format===formato):(window._todosCriativosAdm||[]);
  document.getElementById('grid-criativos-adm').innerHTML=lista.length?lista.map(c=>_criativoAdmCard(c,fmtColor)).join(''):'<p style="color:var(--gray);font-size:13px;grid-column:1/-1">Nenhum criativo.</p>';
}

function abrirFormCriativo(id) {
  (async()=>{
    let c={};
    if(id){const{data}=await _supabase.from('creatives').select('*').eq('id',id).single();c=data||{};}
    window._criativoFileUrl=c.file_url||'';
    window._criativoThumbUrl=c.thumbnail_url||'';
    abrirModal(`
      <button onclick="fecharModal()" style="position:absolute;top:12px;right:12px;background:none;border:none;color:var(--gray);cursor:pointer;font-size:20px">✕</button>
      <h3 style="font-size:16px;font-weight:800;margin-bottom:16px">${id?'Editar criativo':'Novo criativo'}</h3>
      <div class="form-group"><label>Título *</label><input type="text" id="cri-titulo" value="${c.title||''}" placeholder="Ex: Story lançamento Tiara"/></div>
      <div class="form-row">
        <div class="form-group"><label>Formato *</label><select id="cri-formato"><option value="story" ${c.format==='story'?'selected':''}>Story</option><option value="feed" ${c.format==='feed'?'selected':''}>Feed</option><option value="reels" ${c.format==='reels'?'selected':''}>Reels</option><option value="outro" ${c.format==='outro'?'selected':''}>Outro</option></select></div>
        <div class="form-group"><label>Tipo *</label><select id="cri-tipo"><option value="image" ${!c.file_type||c.file_type==='image'?'selected':''}>Imagem</option><option value="video" ${c.file_type==='video'?'selected':''}>Vídeo</option></select></div>
      </div>
      <div class="form-group"><label>Descrição</label><input type="text" id="cri-desc" value="${c.description||''}"/></div>
      <div class="form-group">
        <label>Arquivo principal *</label>
        <div onclick="document.getElementById('cri-file-input').click()" style="border:0.5px dashed var(--border);border-radius:var(--radius-md);padding:16px;text-align:center;cursor:pointer;background:var(--black)" onmouseover="this.style.borderColor='var(--pink)'" onmouseout="this.style.borderColor='var(--border)'">
          <div id="cri-file-preview">${c.file_url?`<div style="font-size:12px;color:var(--green)">✓ Arquivo: <a href="${c.file_url}" target="_blank" style="color:var(--pink)">ver</a></div>`:'<div style="font-size:12px;color:var(--gray)">Clique para fazer upload</div>'}</div>
          <div id="cri-upload-prog" style="display:none;margin-top:8px"><div style="height:3px;background:var(--border);border-radius:2px;overflow:hidden"><div id="cri-upload-bar" style="height:100%;width:0%;background:var(--pink);transition:width .3s"></div></div></div>
        </div>
        <input type="file" id="cri-file-input" accept="image/*,video/*" style="display:none" onchange="uploadCriativoArquivo(this.files[0])"/>
      </div>
      <div style="display:flex;gap:10px;margin-top:4px">
        <button class="btn btn-outline" style="flex:1" onclick="fecharModal()">Cancelar</button>
        <button class="btn btn-primary" style="flex:1" id="btn-salvar-cri" onclick="salvarCriativo(${id?`'${id}'`:'null'})">Salvar</button>
      </div>
    `);
  })();
}

async function uploadCriativoArquivo(file) {
  if(!file) return;
  document.getElementById('cri-upload-prog').style.display='block';
  document.getElementById('cri-upload-bar').style.width='30%';
  document.getElementById('btn-salvar-cri').disabled=true;
  const ext=file.name.split('.').pop();
  const name=`criativo_${Date.now()}.${ext}`;
  const{error}=await _supabase.storage.from('criativos').upload(name,file,{cacheControl:'3600',upsert:false});
  if(error){showToast('Erro no upload: '+error.message,'error');return;}
  document.getElementById('cri-upload-bar').style.width='100%';
  const{data:{publicUrl}}=_supabase.storage.from('criativos').getPublicUrl(name);
  window._criativoFileUrl=publicUrl;
  const isVid=file.type.startsWith('video/');
  document.getElementById('cri-file-preview').innerHTML=isVid?`<video src="${publicUrl}" style="height:80px;border-radius:6px;" muted></video>`:`<img src="${publicUrl}" style="height:80px;border-radius:6px;object-fit:cover"/>`;
  setTimeout(()=>{document.getElementById('cri-upload-prog').style.display='none';document.getElementById('btn-salvar-cri').disabled=false;},500);
}

async function salvarCriativo(id) {
  const titulo=document.getElementById('cri-titulo').value.trim();
  const formato=document.getElementById('cri-formato').value;
  const tipo=document.getElementById('cri-tipo').value;
  const desc=document.getElementById('cri-desc').value.trim();
  if(!titulo){showToast('Informe o título.','error');return;}
  if(!window._criativoFileUrl){showToast('Faça upload do arquivo.','error');return;}
  const btn=document.getElementById('btn-salvar-cri');
  btn.disabled=true;btn.innerHTML='<div class="spinner" style="margin:0 auto"></div>';
  const payload={title:titulo,format:formato,file_type:tipo,description:desc||null,file_url:window._criativoFileUrl,thumbnail_url:window._criativoThumbUrl||null};
  const{error}=id?await _supabase.from('creatives').update(payload).eq('id',id):await _supabase.from('creatives').insert({...payload,is_active:true});
  if(error){showToast('Erro: '+error.message,'error');btn.disabled=false;btn.textContent='Salvar';return;}
  showToast(id?'Criativo atualizado!':'Criativo criado!','success');
  fecharModal();renderCriativosAdmin();
}

async function toggleCriativo(id,ativo) {
  const{error}=await _supabase.from('creatives').update({is_active:!ativo}).eq('id',id);
  if(error){showToast('Erro.','error');return;}
  showToast(ativo?'Criativo desativado.':'Criativo ativado!','success');
  renderCriativosAdmin();
}

// ════════════════════════════════════════════
// CAPACITAÇÃO — Admin
// ════════════════════════════════════════════
async function renderCapacitacaoAdmin() {
  const{data:modulos}=await _supabase.from('modules').select('*, lessons(id,title,duration_seconds,"order",is_active)').order('"order"',{ascending:true});
  document.getElementById('conteudo-principal').innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <h2 style="font-size:20px;font-weight:800">Capacitação</h2>
      <button class="btn btn-primary btn-sm" style="width:auto" onclick="abrirFormModulo()">+ Novo módulo</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:16px" id="lista-modulos">
      ${(modulos||[]).length?(modulos||[]).map(m=>_moduloAdmCard(m)).join(''):'<p style="color:var(--gray);font-size:13px">Nenhum módulo cadastrado.</p>'}
    </div>
  `;
  window._modulosAdm=modulos||[];
}

function _moduloAdmCard(m) {
  const aulas=(m.lessons||[]).sort((a,b)=>a.order-b.order);
  return `
    <div style="background:#111;border:0.5px solid var(--border);border-radius:14px;overflow:hidden">
      <div style="padding:16px;display:flex;align-items:center;justify-content:space-between;border-bottom:0.5px solid var(--border2)">
        <div>
          <div style="font-size:14px;font-weight:700;color:var(--white)">${m.title}</div>
          ${m.description?`<div style="font-size:12px;color:var(--gray);margin-top:2px">${m.description}</div>`:''}
          <div style="font-size:11px;color:var(--gray);margin-top:4px">${aulas.length} aula${aulas.length!==1?'s':''}</div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button class="btn btn-sm btn-outline" onclick="abrirFormAula(null,'${m.id}')">+ Aula</button>
          <button class="btn btn-sm btn-outline" onclick="abrirFormModulo('${m.id}')">Editar</button>
          <button class="btn btn-sm btn-danger" onclick="deletarModulo('${m.id}')">Excluir</button>
        </div>
      </div>
      ${aulas.length?`<div>${aulas.map((a,ai)=>{const durMin=a.duration_seconds?Math.ceil(a.duration_seconds/60):null;return`<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:0.5px solid var(--border2)${ai===aulas.length-1?';border-bottom:none':''}"><div style="width:28px;height:28px;border-radius:50%;background:var(--pink-faint);border:0.5px solid var(--pink-deep);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--pink);flex-shrink:0">${ai+1}</div><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;color:var(--white)">${a.title}</div>${durMin?`<div style="font-size:11px;color:var(--gray)">${durMin} min</div>`:''}</div><span class="pill ${a.is_active?'pill-green':'pill-gray'}" style="font-size:10px">${a.is_active?'Ativa':'Inativa'}</span><div style="display:flex;gap:6px"><button class="btn btn-sm btn-outline" onclick="abrirFormAula('${a.id}','${m.id}')">Editar</button><button class="btn btn-sm btn-danger" onclick="deletarAula('${a.id}')">✕</button></div></div>`;}).join('')}</div>`:`<div style="padding:16px;text-align:center;font-size:13px;color:var(--gray)">Nenhuma aula. <button class="btn btn-sm btn-outline" style="margin-left:8px" onclick="abrirFormAula(null,'${m.id}')">+ Adicionar</button></div>`}
    </div>`;
}

function abrirFormModulo(id) {
  const mod=id?(window._modulosAdm||[]).find(m=>m.id===id):null;
  abrirModal(`
    <button onclick="fecharModal()" style="position:absolute;top:12px;right:12px;background:none;border:none;color:var(--gray);cursor:pointer;font-size:20px">✕</button>
    <h3 style="font-size:16px;font-weight:800;margin-bottom:16px">${id?'Editar módulo':'Novo módulo'}</h3>
    <div class="form-group"><label>Título *</label><input type="text" id="mod-titulo" value="${mod?.title||''}" placeholder="Ex: Técnicas de vendas"/></div>
    <div class="form-group"><label>Descrição</label><input type="text" id="mod-desc" value="${mod?.description||''}"/></div>
    <div class="form-group"><label>Ordem</label><input type="number" id="mod-order" value="${mod?.order||0}" min="0"/></div>
    <div style="display:flex;gap:10px;margin-top:4px">
      <button class="btn btn-outline" style="flex:1" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-primary" style="flex:1" id="btn-mod" onclick="salvarModulo(${id?`'${id}'`:'null'})">Salvar</button>
    </div>
  `);
}

async function salvarModulo(id) {
  const titulo=document.getElementById('mod-titulo').value.trim();
  const desc=document.getElementById('mod-desc').value.trim();
  const order=parseInt(document.getElementById('mod-order').value)||0;
  if(!titulo){showToast('Informe o título.','error');return;}
  const btn=document.getElementById('btn-mod');
  btn.disabled=true;btn.innerHTML='<div class="spinner" style="margin:0 auto"></div>';
  const{error}=id?await _supabase.from('modules').update({title:titulo,description:desc||null,order}).eq('id',id):await _supabase.from('modules').insert({title:titulo,description:desc||null,order,is_active:true});
  if(error){showToast('Erro: '+error.message,'error');btn.disabled=false;btn.textContent='Salvar';return;}
  showToast(id?'Módulo atualizado!':'Módulo criado!','success');
  fecharModal();renderCapacitacaoAdmin();
}

async function deletarModulo(id) {
  if(!confirm('Excluir este módulo e todas as aulas?'))return;
  const{error}=await _supabase.from('modules').delete().eq('id',id);
  if(error){showToast('Erro.','error');return;}
  showToast('Módulo excluído.','success');renderCapacitacaoAdmin();
}

function abrirFormAula(aulaId,moduloId) {
  (async()=>{
    let a={};
    if(aulaId){const{data}=await _supabase.from('lessons').select('*').eq('id',aulaId).single();a=data||{};}
    abrirModal(`
      <button onclick="fecharModal()" style="position:absolute;top:12px;right:12px;background:none;border:none;color:var(--gray);cursor:pointer;font-size:20px">✕</button>
      <h3 style="font-size:16px;font-weight:800;margin-bottom:16px">${aulaId?'Editar aula':'Nova aula'}</h3>
      <div class="form-group"><label>Título *</label><input type="text" id="aula-titulo" value="${a.title||''}" placeholder="Ex: Como abordar clientes"/></div>
      <div class="form-group"><label>Descrição</label><input type="text" id="aula-desc" value="${a.description||''}"/></div>
      <div class="form-group">
        <label>URL do YouTube (não listado) *</label>
        <input type="url" id="aula-url" value="${a.video_url||''}" placeholder="https://youtu.be/XXXXXXXXXXX"/>
        <div style="font-size:11px;color:var(--gray);margin-top:4px">Cole o link do YouTube. Ex: https://youtu.be/dQw4w9WgXcQ</div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Duração (min)</label><input type="number" id="aula-dur" value="${a.duration_seconds?Math.ceil(a.duration_seconds/60):''}" min="1" placeholder="Ex: 12"/></div>
        <div class="form-group"><label>Ordem</label><input type="number" id="aula-order" value="${a.order||0}" min="0"/></div>
      </div>
      <div class="form-group">
        <button type="button" onclick="_previewYoutubeAdmin()" style="width:100%;padding:8px;background:transparent;border:0.5px solid var(--border);border-radius:var(--radius-md);color:var(--pink);font-size:13px;cursor:pointer">▶ Pré-visualizar</button>
        <div id="aula-preview" style="margin-top:10px;display:none;border-radius:10px;overflow:hidden"><div style="position:relative;padding-bottom:56.25%;height:0;background:#000"><iframe id="aula-iframe" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none" allowfullscreen></iframe></div></div>
      </div>
      <div style="display:flex;gap:10px;margin-top:4px">
        <button class="btn btn-outline" style="flex:1" onclick="fecharModal()">Cancelar</button>
        <button class="btn btn-primary" style="flex:1" id="btn-aula" onclick="salvarAula(${aulaId?`'${aulaId}'`:'null'},'${moduloId}')">Salvar aula</button>
      </div>
    `);
  })();
}

function _previewYoutubeAdmin() {
  const url=document.getElementById('aula-url').value.trim();
  const match=url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/);
  if(!match){showToast('URL inválida.','error');return;}
  document.getElementById('aula-iframe').src=`https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1`;
  document.getElementById('aula-preview').style.display='block';
}

async function salvarAula(aulaId,moduloId) {
  const titulo=document.getElementById('aula-titulo').value.trim();
  const url=document.getElementById('aula-url').value.trim();
  const durMin=parseInt(document.getElementById('aula-dur').value)||0;
  const order=parseInt(document.getElementById('aula-order').value)||0;
  const desc=document.getElementById('aula-desc').value.trim();
  if(!titulo){showToast('Informe o título.','error');return;}
  if(!url){showToast('Informe a URL.','error');return;}
  const match=url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/);
  if(!match){showToast('URL do YouTube inválida.','error');return;}
  const btn=document.getElementById('btn-aula');
  btn.disabled=true;btn.innerHTML='<div class="spinner" style="margin:0 auto"></div>';
  const payload={title:titulo,description:desc||null,video_url:url,duration_seconds:durMin*60,order,module_id:moduloId};
  const{error}=aulaId?await _supabase.from('lessons').update(payload).eq('id',aulaId):await _supabase.from('lessons').insert({...payload,is_active:true});
  if(error){showToast('Erro: '+error.message,'error');btn.disabled=false;btn.textContent='Salvar aula';return;}
  showToast(aulaId?'Aula atualizada!':'Aula criada!','success');
  fecharModal();renderCapacitacaoAdmin();
}

async function deletarAula(id) {
  if(!confirm('Excluir esta aula?'))return;
  const{error}=await _supabase.from('lessons').delete().eq('id',id);
  if(error){showToast('Erro.','error');return;}
  showToast('Aula excluída.','success');renderCapacitacaoAdmin();
}

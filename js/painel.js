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

  // aba via hash
  const hash = window.location.hash.replace('#','');
  irAba(hash || 'painel');
})();

// ── Navegação entre abas ──
function irAba(aba) {
  _abaAtiva = aba;
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const tab = document.getElementById(`tab-${aba}`);
  if (tab) tab.classList.add('active');
  window.location.hash = aba;

  const acoes = { painel: renderInicio, pedidos: renderPedidos, avisos: renderAvisos };
  (acoes[aba] || renderInicio)();
}

// ════════════════════════════════════════════
// INÍCIO
// ════════════════════════════════════════════
async function renderInicio() {
  const nome = _perfil.full_name?.split(' ')[0] || 'Embaixadora';

  const [{ data: pedidos }, { data: avisos }] = await Promise.all([
    _supabase.from('orders').select('id,total,status,created_at').eq('reseller_id', _perfil.id).order('created_at', { ascending: false }).limit(3),
    _supabase.from('messages').select('id,subject,body,created_at').eq('is_broadcast', true).order('created_at', { ascending: false }).limit(2),
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

    <!-- Últimos pedidos -->
    <div style="margin-bottom:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div class="section-title">Últimos pedidos</div>
        <button class="btn btn-sm btn-outline" onclick="irAba('pedidos')">Ver todos</button>
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
    .select('quantity, products(*)')
    .eq('order_id', orderId);

  if (!data?.length) { showToast('Erro ao carregar pedido.', 'error'); return; }

  data.forEach(item => {
    if (item.products) addToCart(item.products, item.quantity);
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

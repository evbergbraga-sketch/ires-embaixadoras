// ============================================
// IRES EMBAIXADORAS — carrinho.js
// Exibe itens do carrinho, valida quantidade
// mínima e finaliza o pedido no Supabase.
// ============================================

let _perfil = null;

// ── Inicialização ──
(async () => {
  const ctx = await requireActive();
  if (!ctx) return;
  _perfil = ctx.profile;
  await renderTopbar();
  renderCarrinho();
})();

// ── Renderiza o carrinho ──
function renderCarrinho() {
  const cart   = getCart();
  const lista  = document.getElementById('lista-carrinho');
  const vazio  = document.getElementById('carrinho-vazio');
  const resumo = document.getElementById('resumo-pedido');
  const badge  = document.getElementById('badge-itens');

  if (!cart.length) {
    lista.innerHTML  = '';
    vazio.style.display  = 'block';
    resumo.style.display = 'none';
    badge.textContent    = '0 itens';
    return;
  }

  vazio.style.display  = 'none';
  resumo.style.display = 'block';

  const total = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
  badge.textContent = `${cart.reduce((a,i) => a + i.quantity, 0)} itens`;

  document.getElementById('val-subtotal').textContent = formatBRL(total);
  document.getElementById('val-total').textContent    = formatBRL(total);

  lista.innerHTML = cart.map((item, idx) => {
    const img      = item.images?.[0] || '';
    const subtotal = formatBRL(item.price * item.quantity);
    const abaixo   = item.quantity < item.min_quantity;

    return `
      <div class="cart-item" id="item-${idx}">
        <div class="cart-thumb">
          ${img
            ? `<img src="${img}" alt="${item.name}"/>`
            : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--pink)" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`
          }
        </div>
        <div class="cart-info">
          <div class="cart-name">${item.name}</div>
          <div class="cart-variant">Mínimo: ${item.min_quantity} unidades</div>
          <div class="cart-qty">
            <button class="qty-btn" onclick="alterarQty(${idx}, -1)">−</button>
            <span class="qty-value" id="qty-${idx}">${item.quantity}</span>
            <button class="qty-btn" onclick="alterarQty(${idx}, 1)">+</button>
            <span style="font-size:11px;color:var(--gray);margin-left:4px">un.</span>
          </div>
          <div class="cart-min-warn ${abaixo ? 'visible' : ''}" id="warn-${idx}">
            Mínimo de ${item.min_quantity} unidades
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
          <span class="cart-price" id="sub-${idx}">${subtotal}</span>
          <button onclick="removerItem(${idx})" style="background:none;border:none;color:var(--gray);cursor:pointer;font-size:11px;text-decoration:underline">
            Remover
          </button>
        </div>
      </div>
    `;
  }).join('');

  verificarMinimos();
}

// ── Altera quantidade ──
function alterarQty(idx, delta) {
  const cart = getCart();
  const item = cart[idx];
  if (!item) return;

  let novaQty = item.quantity + delta;
  if (novaQty < 1) novaQty = 1;

  updateCartQty(item.id, novaQty);

  // atualiza visual sem re-renderizar tudo
  const cart2 = getCart();
  const item2 = cart2[idx];
  if (!item2) return;

  document.getElementById(`qty-${idx}`).textContent = item2.quantity;
  document.getElementById(`sub-${idx}`).textContent = formatBRL(item2.price * item2.quantity);

  const warn = document.getElementById(`warn-${idx}`);
  if (warn) {
    warn.classList.toggle('visible', item2.quantity < item2.min_quantity);
  }

  // atualiza totais
  const total = cart2.reduce((acc, i) => acc + i.price * i.quantity, 0);
  document.getElementById('val-subtotal').textContent = formatBRL(total);
  document.getElementById('val-total').textContent    = formatBRL(total);
  document.getElementById('badge-itens').textContent  = `${cart2.reduce((a,i) => a + i.quantity, 0)} itens`;

  verificarMinimos();
}

// ── Remove item ──
function removerItem(idx) {
  const cart = getCart();
  const item = cart[idx];
  if (!item) return;
  removeFromCart(item.id);
  renderCarrinho();
}

// ── Verifica mínimos e bloqueia botão ──
function verificarMinimos() {
  const cart     = getCart();
  const invalidos = cart.filter(i => i.quantity < i.min_quantity);
  const aviso    = document.getElementById('aviso-minimo');
  const btn      = document.getElementById('btn-finalizar');

  if (invalidos.length) {
    const nomes = invalidos.map(i => `${i.name} (mín. ${i.min_quantity})`).join(', ');
    document.getElementById('texto-aviso').textContent =
      `Quantidade abaixo do mínimo: ${nomes}. Ajuste antes de finalizar.`;
    aviso.style.display = 'flex';
    aviso.style.borderColor = 'var(--red)';
    btn.disabled = true;
    btn.style.opacity = '0.5';
  } else {
    aviso.style.display = 'none';
    btn.disabled = false;
    btn.style.opacity = '1';
  }
}

// ── Finaliza o pedido ──
async function finalizarPedido() {
  const cart = getCart();
  if (!cart.length) return;

  const invalidos = cart.filter(i => i.quantity < i.min_quantity);
  if (invalidos.length) {
    showToast('Ajuste as quantidades mínimas antes de finalizar.', 'error');
    return;
  }

  const btn = document.getElementById('btn-finalizar');
  btn.disabled  = true;
  btn.innerHTML = '<div class="spinner" style="margin:0 auto"></div>';

  const total = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const obs   = document.getElementById('obs-pedido').value.trim();
  const forma = document.getElementById('forma-pagamento')?.value || 'PIX';

  try {
    // 1. Cria o pedido no Supabase
    const { data: pedido, error: errPedido } = await _supabase
      .from('orders')
      .insert({
        reseller_id: _perfil.id,
        status:      'pending',
        total,
        notes:       obs || null,
      })
      .select()
      .single();

    if (errPedido) throw errPedido;

    // 2. Insere os itens
    const itens = cart.map(i => ({
      order_id:   pedido.id,
      product_id: i.id,
      quantity:   i.quantity,
      unit_price: i.price,
      subtotal:   i.price * i.quantity,
    }));

    const { error: errItens } = await _supabase
      .from('order_items')
      .insert(itens);

    if (errItens) throw errItens;

    // 3. Chama o n8n para gerar a cobrança no Asaas
    btn.innerHTML = '<div class="spinner" style="margin:0 auto"></div>';

    const resp = await fetch('https://webhook.ruahsystems.com.br/webhook/asaas-cobranca', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome:             _perfil.full_name,
        email:            (await _supabase.auth.getUser()).data.user.email,
        cpf:              _perfil.cpf || '00000000000',
        telefone:         _perfil.phone || '',
        total:            total,
        pedido_id:        pedido.id,
        forma_pagamento:  forma,
      }),
    });

    const asaas = await resp.json();

    // salva payment_url direto no pedido via REST (bypassa RLS)
    if (asaas.ok && asaas.link) {
      await fetch(`https://cqhcbbrpxytpybgnpxys.supabase.co/rest/v1/orders?id=eq.${pedido.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': IRES_CONFIG.supabaseAnonKey,
          'Authorization': `Bearer ${(await _supabase.auth.getSession()).data.session.access_token}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ payment_url: asaas.link, payment_ref: asaas.id }),
      });
    }

    // 4. Limpa o carrinho
    clearCart();

    // 5. Monta o modal de pagamento
    document.getElementById('num-pedido').textContent = '#' + pedido.id.slice(-6).toUpperCase();
    document.getElementById('link-asaas-externo').href = asaas.link || '#';

    const conteudo = document.getElementById('pagamento-conteudo');

    if (!asaas.ok || !asaas.forma) {
      conteudo.innerHTML = `
        <div style="text-align:center;padding:16px">
          <div style="font-size:13px;color:#666;line-height:1.7">Pedido salvo com sucesso!<br/>Entre em contato com a IRES para combinar o pagamento.</div>
        </div>`;
    } else if (asaas.forma === 'PIX') {
      conteudo.innerHTML = `
        <div style="text-align:center">
          <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:4px">Pague com PIX</div>
          <div style="font-size:12px;color:#666;margin-bottom:16px">Válido até ${new Date(asaas.vencimento).toLocaleDateString('pt-BR')}</div>
          ${asaas.pixQrCode ? `
            <div style="background:#fff;border-radius:12px;padding:12px;display:inline-block;margin-bottom:16px">
              <img src="data:image/png;base64,${asaas.pixQrCode}" style="width:180px;height:180px;display:block"/>
            </div>
          ` : ''}
          ${asaas.pixCopiaECola ? `
            <div style="font-size:11px;color:#666;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">PIX Copia e Cola</div>
            <div style="background:#0d0d0d;border:0.5px solid #2a2a2a;border-radius:10px;padding:10px 14px;font-size:11px;color:#aaa;word-break:break-all;margin-bottom:12px;text-align:left;line-height:1.5">
              ${asaas.pixCopiaECola.slice(0,60)}...
            </div>
            <button onclick="copiarPix()" style="width:100%;padding:11px;background:#f03faa;border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:700;cursor:pointer" id="btn-copiar">
              Copiar código PIX
            </button>
          ` : ''}
          <div style="font-size:22px;font-weight:900;color:#fff;margin-top:16px">${formatBRL(asaas.valor)}</div>
        </div>`;
      window._pixCode = asaas.pixCopiaECola;
    } else if (asaas.forma === 'BOLETO') {
      conteudo.innerHTML = `
        <div style="text-align:center;padding:8px 0">
          <div style="width:56px;height:56px;border-radius:50%;background:#1A1500;border:0.5px solid #3A2A00;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="1.5"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          </div>
          <div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:6px">Boleto bancário gerado</div>
          <div style="font-size:12px;color:#666;margin-bottom:6px">Vencimento: ${new Date(asaas.vencimento).toLocaleDateString('pt-BR')}</div>
          <div style="font-size:22px;font-weight:900;color:#fff;margin-bottom:20px">${formatBRL(asaas.valor)}</div>
          <div style="font-size:12px;color:#666;background:#0d0d0d;border:0.5px solid #2a2a2a;border-radius:10px;padding:12px;line-height:1.6">
            O boleto pode levar até 3 dias úteis para compensar. Não pague após o vencimento sem antes verificar a disponibilidade.
          </div>
        </div>`;
    } else {
      conteudo.innerHTML = `
        <div style="text-align:center;padding:8px 0">
          <div style="width:56px;height:56px;border-radius:50%;background:#0A1020;border:0.5px solid #1A3050;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" stroke-width="1.5"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          </div>
          <div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:6px">Pagamento com cartão</div>
          <div style="font-size:12px;color:#666;margin-bottom:20px">Clique no botão abaixo para pagar com segurança</div>
          <div style="font-size:22px;font-weight:900;color:#fff">${formatBRL(asaas.valor)}</div>
        </div>`;
    }

    document.getElementById('modal-sucesso').style.display = 'flex';
    document.body.style.overflow = 'hidden';

  } catch (err) {
    showToast('Erro ao finalizar: ' + err.message, 'error');
    btn.disabled    = false;
    btn.textContent = 'Finalizar pedido →';
  }
}

function fecharModalPagamento() {
  document.getElementById('modal-sucesso').style.display = 'none';
  document.body.style.overflow = '';
  window.location.href = 'pedidos.html';
}

function pagarDepois() {
  // salva o link de pagamento para mostrar nos pedidos
  const link = document.getElementById('link-asaas-externo')?.href;
  if (link && link !== '#') {
    sessionStorage.setItem('link_pagamento_pendente', link);
  }
  fecharModalPagamento();
}

function copiarPix() {
  if (!window._pixCode) return;
  navigator.clipboard.writeText(window._pixCode).then(() => {
    const btn = document.getElementById('btn-copiar');
    if (btn) { btn.textContent = 'Copiado! ✓'; btn.style.background = '#4CAF50'; }
    showToast('Código PIX copiado!', 'success');
    setTimeout(() => {
      if (btn) { btn.textContent = 'Copiar código PIX'; btn.style.background = '#f03faa'; }
    }, 3000);
  });
}

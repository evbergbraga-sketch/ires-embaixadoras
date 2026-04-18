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

  // valida mínimos
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

  try {
    // cria o pedido
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

    // insere os itens
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

    // limpa o carrinho
    clearCart();

    // mostra modal de sucesso
    document.getElementById('num-pedido').textContent =
      '#' + pedido.id.slice(-6).toUpperCase();
    document.getElementById('modal-sucesso').style.display = 'flex';

  } catch (err) {
    showToast('Erro ao finalizar: ' + err.message, 'error');
    btn.disabled  = false;
    btn.textContent = 'Finalizar pedido →';
  }
}

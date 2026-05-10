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
          <div class="cart-variant">${[item.size, item.color].filter(Boolean).join(' / ') || `Mínimo: ${item.min_quantity} unidades`}</div>
          ${(item.size || item.color) ? `<div style="font-size:10px;color:var(--gray)">Mínimo: ${item.min_quantity} unidades</div>` : ''}
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

  // Valida formulário de cartão se necessário
  if (forma === 'CREDIT_CARD') {
    const num = document.getElementById('cartao-numero')?.value.replace(/\s/g,'') || '';
    const nome = document.getElementById('cartao-nome')?.value.trim() || '';
    const val = document.getElementById('cartao-validade')?.value || '';
    const cvv = document.getElementById('cartao-cvv')?.value || '';
    const cpf = document.getElementById('cartao-cpf')?.value.replace(/\D/g,'') || '';
    const cep = document.getElementById('cartao-cep')?.value.replace(/\D/g,'') || '';
    if (num.length < 13) { showToast('Número do cartão inválido.', 'error'); return; }
    if (nome.length < 3) { showToast('Informe o nome no cartão.', 'error'); return; }
    if (!val.match(/^\d{2}\/\d{2}$/)) { showToast('Validade inválida (MM/AA).', 'error'); return; }
    if (cvv.length < 3) { showToast('CVV inválido.', 'error'); return; }
    if (cpf.length !== 11) { showToast('CPF do titular inválido.', 'error'); return; }
    if (cep.length !== 8) { showToast('CEP de cobrança inválido.', 'error'); return; }
  }

  try {
    // 1. Cria o pedido no Supabase
    const cepFrete = document.getElementById('cep-frete')?.value.replace(/\D/g, '') || null;
    const { data: pedido, error: errPedido } = await _supabase
      .from('orders')
      .insert({
        reseller_id: _perfil.id,
        status:      'pending',
        total:       _freteSelecionado ? total + _freteSelecionado.price : total,
        notes:       obs || null,
        shipping_service: _freteSelecionado?.serviceId || null,
        shipping_price:   _freteSelecionado?.price || 0,
        recipient_cep:    cepFrete,
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
      size:       i.size  || null,
      color:      i.color || null,
    }));

    const { error: errItens } = await _supabase
      .from('order_items')
      .insert(itens);

    if (errItens) throw errItens;

    // 3. Abre modal com loading e chama o Asaas
    _abrirModalPagamento(pedido.id);
    document.getElementById('mp-title').textContent = 'Processando pagamento…';
    document.getElementById('mp-close-btn').style.display = 'none';
    document.getElementById('pagamento-conteudo').innerHTML = `
      <div style="text-align:center;padding:24px 0 16px;animation:mp-fade-up .3s ease both">
        <div style="width:64px;height:64px;border-radius:20px;background:#FDF6EE;border:1px solid #EDE5DC;display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C8A96E" stroke-width="2" stroke-linecap="round" style="animation:mp-spin .8s linear infinite"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>
        </div>
        <p style="font-size:13px;font-weight:600;color:#3D0E20;margin-bottom:4px">Processando seu pagamento</p>
        <p style="font-size:12px;color:#9a7a8a">Aguarde, isso pode levar alguns segundos…</p>
      </div>`;
    document.getElementById('mp-footer').innerHTML = '';
    btn.innerHTML = '<div class="spinner" style="margin:0 auto"></div>';

    const resp = await fetch('https://webhook.ruahsystems.com.br/webhook/asaas-cobranca', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome:             _perfil.full_name,
        email:            (await _supabase.auth.getUser()).data.user.email,
        cpf:              _perfil.cpf || '00000000000',
        telefone:         _perfil.phone || '',
        total:            _freteSelecionado ? total + _freteSelecionado.price : total,
        pedido_id:        pedido.id,
        forma_pagamento:  forma,
        // Dados do cartão (só preenchidos quando CREDIT_CARD)
        ...(forma === 'CREDIT_CARD' ? {
          parcelas:           parseInt(document.getElementById('cartao-parcelas')?.value || '1'),
          cartao_numero:      document.getElementById('cartao-numero')?.value.replace(/\s/g,'') || '',
          cartao_nome:        document.getElementById('cartao-nome')?.value || '',
          cartao_validade:    document.getElementById('cartao-validade')?.value || '',
          cartao_cvv:         document.getElementById('cartao-cvv')?.value || '',
          cartao_cpf:         document.getElementById('cartao-cpf')?.value || _perfil.cpf || '',
          cartao_email:       (await _supabase.auth.getUser()).data.user.email,
          cartao_telefone:    _perfil.phone || '',
          cartao_cep:         document.getElementById('cartao-cep')?.value || '',
          cartao_numero_end:  document.getElementById('cartao-numero-end')?.value || 'S/N',
          cartao_complemento: '',
        } : {}),
      }),
    });

    const asaas = await resp.json();

    // Atualiza pedido com dados do pagamento usando _supabase client
    if (asaas.ok) {
      const updateData = {
        payment_url: asaas.link || null,
        payment_ref: asaas.id  || null,
      };

      // Cartão aprovado na hora → marca como pago imediatamente
      if (asaas.forma === 'CREDIT_CARD' && asaas.status === 'CONFIRMED') {
        updateData.status = 'paid';
      }

      const { error: errUpdate } = await _supabase
        .from('orders')
        .update(updateData)
        .eq('id', pedido.id);

      if (errUpdate) console.error('[Pagamento] Erro ao atualizar pedido:', errUpdate);
    }

    // 4. Limpa o carrinho
    clearCart();

    // 5. Exibe modal e renderiza estado do pagamento
    window._pedidoAtualId = pedido.id;
    _abrirModalPagamento(pedido.id);
    _renderModalPagamento(asaas);

  } catch (err) {
    showToast('Erro ao finalizar: ' + err.message, 'error');
    btn.disabled    = false;
    btn.textContent = 'Finalizar pedido →';
  }
}

// ── Modal de Pagamento ──────────────────────────────────────

function _abrirModalPagamento(pedidoId) {
  const modal = document.getElementById('modal-pagamento');
  const sheet = document.getElementById('mp-sheet');
  document.getElementById('num-pedido').textContent = '#' + pedidoId.slice(-6).toUpperCase();
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => { sheet.style.transform = 'translateY(0)'; });
}

// ── Polling confirmação PIX ────────────────────────────
let _pixPollingTimer = null;

function _iniciarPollingPIX() {
  _pararPollingPIX();
  if (!window._pixPaymentId) return;
  _pixPollingTimer = setInterval(async () => {
    try {
      const res = await fetch('https://webhook.ruahsystems.com.br/webhook/ires-painel-pix-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: window._pixPaymentId })
      });
      const data = await res.json();
      if (data.pago) {
        _pararPollingPIX();
        // Atualiza status do pedido no Supabase
        if (window._pixPedidoId) {
          await _supabase.from('orders').update({ status: 'paid' }).eq('id', window._pixPedidoId);
        }
        _renderPixConfirmado(data);
      }
    } catch(e) { /* silencioso */ }
  }, 5000);
}

function _pararPollingPIX() {
  if (_pixPollingTimer) { clearInterval(_pixPollingTimer); _pixPollingTimer = null; }
}

function _renderPixConfirmado(data) {
  document.getElementById('mp-title').textContent = 'Pagamento confirmado!';
  document.getElementById('mp-close-btn').style.display = 'flex';
  document.getElementById('pagamento-conteudo').innerHTML = `
    <div style="animation:mp-fade-up .35s ease both;text-align:center;padding:16px 0">
      <div style="width:72px;height:72px;border-radius:22px;background:#F0FAF4;border:1px solid #C6E8D4;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;animation:mp-pop .6s ease both">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <p style="font-size:22px;font-weight:800;color:#3D0E20;font-family:'Playfair Display',serif;margin-bottom:8px">PIX confirmado! 🎉</p>
      <p style="font-size:16px;font-weight:700;color:#22C55E;margin-bottom:16px">R$ ${Number(data.valor||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</p>
      <div style="background:#F0FAF4;border:1px solid #C6E8D4;border-radius:14px;padding:14px 16px;text-align:left">
        <p style="font-size:13px;color:#555;line-height:1.7;margin:0">
          ✅ Pagamento recebido com sucesso<br>
          📦 Seu pedido está sendo processado<br>
          📱 Você receberá atualizações em breve
        </p>
      </div>
    </div>`;
  document.getElementById('mp-footer').innerHTML = `
    <button class="mp-btn-p" onclick="fecharModalPagamento()">Ver meus pedidos →</button>`;
}

function fecharModalPagamento() {
  _pararPollingPIX();
  const modal = document.getElementById('modal-pagamento');
  const sheet = document.getElementById('mp-sheet');
  sheet.style.transform = 'translateY(100%)';
  setTimeout(() => {
    modal.style.display = 'none';
    document.body.style.overflow = '';
    window.location.href = 'pedidos.html';
  }, 380);
}

function pagarDepois() {
  const link = document.getElementById('link-asaas-externo')?.href;
  if (link && link !== '#') sessionStorage.setItem('link_pagamento_pendente', link);
  fecharModalPagamento();
}

function _renderModalPagamento(asaas) {
  const conteudo = document.getElementById('pagamento-conteudo');
  const footer   = document.getElementById('mp-footer');
  const title    = document.getElementById('mp-title');
  const closeBtn = document.getElementById('mp-close-btn');

  closeBtn.style.display = 'flex';

  // ── Sem resposta do Asaas ──
  if (!asaas || !asaas.ok || !asaas.forma) {
    title.textContent = 'Pedido salvo!';
    conteudo.innerHTML = `
      <div style="animation:mp-fade-up .35s ease both;text-align:center;padding:8px 0 16px">
        <div style="width:64px;height:64px;border-radius:20px;background:#FDF6EE;border:1px solid #EDE5DC;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;animation:mp-pop .5s ease both">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C8A96E" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <p style="font-size:14px;font-weight:600;color:#3D0E20;margin-bottom:6px">Pedido registrado com sucesso</p>
        <p style="font-size:12px;color:#9a7a8a;line-height:1.6">Entre em contato com a IRES para combinar a forma de pagamento.</p>
      </div>`;
    footer.innerHTML = `<button class="mp-btn-p" onclick="fecharModalPagamento()">Ver meus pedidos</button>`;
    return;
  }

  // ── PIX ──
  if (asaas.forma === 'PIX') {
    window._pixCode = asaas.pixCopiaECola;
    window._pixPaymentId = asaas.id || null;
    window._pixPedidoId  = window._pedidoAtualId || null;
    _iniciarPollingPIX();
    title.textContent = 'Pague com PIX';
    conteudo.innerHTML = `
      <div style="animation:mp-fade-up .35s ease both">
        ${asaas.pixQrCode ? `
          <div style="text-align:center;margin-bottom:16px">
            <div style="background:#fff;border-radius:16px;padding:14px;display:inline-flex;border:0.5px solid #EDE5DC;box-shadow:0 2px 12px rgba(61,14,32,.06)">
              <img src="data:image/png;base64,${asaas.pixQrCode}" style="width:172px;height:172px;display:block;border-radius:6px"/>
            </div>
          </div>` : ''}
        <div class="mp-info-row">
          <span class="mp-info-lbl">Valor</span>
          <span class="mp-info-val" style="font-size:18px;font-family:'Playfair Display',serif">${formatBRL(asaas.valor)}</span>
        </div>
        <div class="mp-info-row">
          <span class="mp-info-lbl">Válido até</span>
          <span class="mp-info-val">${new Date(asaas.vencimento).toLocaleDateString('pt-BR')}</span>
        </div>
        ${asaas.pixCopiaECola ? `
          <div style="margin-top:14px">
            <div style="font-size:10px;font-weight:700;color:#9a7a8a;text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px">Pix Copia e Cola</div>
            <div class="mp-pix-code">${asaas.pixCopiaECola.slice(0,72)}…</div>
          </div>` : ''}
      </div>`;
    footer.innerHTML = `
      ${asaas.pixCopiaECola ? `<button class="mp-btn-p" id="btn-copiar" onclick="copiarPix()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="margin-right:6px;vertical-align:middle"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copiar código PIX
      </button>` : ''}
      <button class="mp-btn-s" onclick="pagarDepois()">Pagar depois</button>`;
    return;
  }

  // ── CARTÃO — APROVADO ──
  if (asaas.forma === 'CREDIT_CARD' && asaas.ok) {
    title.textContent = 'Pagamento aprovado!';
    conteudo.innerHTML = `
      <div style="animation:mp-fade-up .35s ease both;text-align:center;padding:8px 0">
        <div style="width:72px;height:72px;border-radius:22px;background:#F0FAF4;border:1px solid #C6E8D4;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;animation:mp-pop .5s ease both">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <p style="font-size:13px;color:#9a7a8a;margin-bottom:4px">Valor cobrado</p>
        <p style="font-size:30px;font-weight:800;color:#3D0E20;font-family:'Playfair Display',serif;letter-spacing:-.5px;margin-bottom:6px">${formatBRL(asaas.total)}</p>
        <p style="font-size:13px;color:#C8A96E;font-weight:600">${asaas.parcelas > 1 ? `${asaas.parcelas}x de ${formatBRL(asaas.valorParcela)}` : 'À vista'}</p>
      </div>`;
    footer.innerHTML = `<button class="mp-btn-p" onclick="fecharModalPagamento()">Ver meus pedidos →</button>`;
    return;
  }

  // ── CARTÃO — RECUSADO ──
  if (asaas.forma === 'CREDIT_CARD' && !asaas.ok) {
    title.textContent = 'Pagamento recusado';
    conteudo.innerHTML = `
      <div style="animation:mp-fade-up .35s ease both;text-align:center;padding:8px 0">
        <div style="width:72px;height:72px;border-radius:22px;background:#FEF2F2;border:1px solid #FECACA;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;animation:mp-pop .5s ease both">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </div>
        <p style="font-size:14px;font-weight:700;color:#3D0E20;margin-bottom:8px">Cartão não autorizado</p>
        <p style="font-size:12px;color:#9a7a8a;line-height:1.6;max-width:280px;margin:0 auto">${asaas.erro || 'Verifique os dados do cartão e tente novamente, ou escolha outra forma de pagamento.'}</p>
      </div>`;
    footer.innerHTML = `
      <button class="mp-btn-p" onclick="_tentarNovamenteCartao()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="margin-right:6px;vertical-align:middle"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.13"/></svg>
        Tentar novamente
      </button>
      <button class="mp-btn-s" onclick="pagarDepois()">Pagar depois</button>`;
    return;
  }
}

function _tentarNovamenteCartao() {
  const modal = document.getElementById('modal-pagamento');
  const sheet = document.getElementById('mp-sheet');
  sheet.style.transform = 'translateY(100%)';
  setTimeout(() => {
    modal.style.display = 'none';
    document.body.style.overflow = '';
    // Scroll de volta ao formulário de cartão
    document.getElementById('cartao-numero')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById('cartao-numero')?.focus();
    const btn = document.getElementById('btn-finalizar');
    if (btn) { btn.disabled = false; btn.textContent = 'Finalizar pedido →'; }
  }, 380);
}

function copiarPix() {
  if (!window._pixCode) return;
  navigator.clipboard.writeText(window._pixCode).then(() => {
    const btn = document.getElementById('btn-copiar');
    if (btn) {
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="margin-right:6px;vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> Copiado!';
      btn.style.background = '#22C55E';
      btn.style.borderColor = '#22C55E';
    }
    showToast('Código PIX copiado!', 'success');
    setTimeout(() => {
      if (btn) {
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="margin-right:6px;vertical-align:middle"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copiar código PIX';
        btn.style.background = '#3D0E20';
        btn.style.borderColor = 'transparent';
      }
    }, 3000);
  }).catch(() => showToast('Erro ao copiar. Tente manualmente.', 'error'));
}

// ════════════════════════════════════════════
// FRETE — Melhor Envio via Edge Function
// ════════════════════════════════════════════

const SUPABASE_FUNC = 'https://cqhcbbrpxytpybgnpxys.supabase.co/functions/v1';
let _freteSelecionado = null;

function mascaraCEPFrete(input) {
  let v = input.value.replace(/\D/g, '');
  if (v.length > 5) v = v.slice(0,5) + '-' + v.slice(5,8);
  input.value = v;
}

async function cotarFrete() {
  const cep = document.getElementById('cep-frete').value.replace(/\D/g, '');
  if (cep.length !== 8) { showToast('Informe um CEP válido.', 'error'); return; }

  const cart = getCart();
  if (!cart.length) return;

  const loading = document.getElementById('frete-loading');
  const opcoes  = document.getElementById('frete-opcoes');
  const erro    = document.getElementById('frete-erro');
  const btn     = document.getElementById('btn-cotar');

  loading.style.display = 'block';
  opcoes.style.display  = 'none';
  erro.style.display    = 'none';
  btn.disabled = true;
  btn.textContent = '…';

  try {
    // Buscar peso dos produtos do banco
    const ids = [...new Set(cart.map(i => i.id))];
    const { data: produtos } = await _supabase
      .from('products')
      .select('id, weight_grams')
      .in('id', ids);

    const pesoMap = {};
    (produtos || []).forEach(p => pesoMap[p.id] = p.weight_grams || 100);

    const payload = {
      cep_destino: cep,
      produtos: cart.map(item => ({
        id: item.id,
        price: item.price,
        quantity: item.quantity,
        weight_grams: pesoMap[item.id] || 100,
      })),
    };

    const resp = await fetch(`${SUPABASE_FUNC}/melhorenvio-cotacao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();

    if (!resp.ok || !data.opcoes?.length) {
      erro.textContent = data.error || 'Nenhuma opção de frete disponível para este CEP.';
      erro.style.display = 'block';
      return;
    }

    // Renderiza opções
    opcoes.innerHTML = data.opcoes.map((op, i) => `
      <label class="frete-opcao ${i === 0 ? 'selected' : ''}" data-price="${op.price}" data-id="${op.id}" data-name="${op.company} ${op.name}" onclick="selecionarFrete(this)">
        <input type="radio" name="frete" ${i === 0 ? 'checked' : ''} style="display:none"/>
        <div style="display:flex;align-items:center;gap:10px;flex:1">
          ${op.company_picture ? `<img src="${op.company_picture}" style="width:28px;height:28px;border-radius:6px;object-fit:contain"/>` : ''}
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--nb-text-hi)">${op.company} — ${op.name}</div>
            <div style="font-size:11px;color:var(--gray)">Até ${op.delivery_time} dias úteis</div>
          </div>
        </div>
        <div style="font-size:14px;font-weight:700;color:var(--nb-text-hi);white-space:nowrap">${formatBRL(op.price)}</div>
      </label>
    `).join('');

    opcoes.style.display = 'block';

    // Auto-seleciona o primeiro
    selecionarFrete(opcoes.querySelector('.frete-opcao'));

  } catch (e) {
    erro.textContent = 'Erro ao calcular frete: ' + e.message;
    erro.style.display = 'block';
  } finally {
    loading.style.display = 'none';
    btn.disabled = false;
    btn.textContent = 'Calcular';
  }
}

function selecionarFrete(el) {
  document.querySelectorAll('.frete-opcao').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  el.querySelector('input').checked = true;

  const price = parseFloat(el.dataset.price);
  const name  = el.dataset.name;
  const id    = el.dataset.id;

  _freteSelecionado = { price, name, serviceId: id };

  // Atualiza resumo
  document.getElementById('row-frete').style.display = 'flex';
  document.getElementById('val-frete').textContent = formatBRL(price);
  document.getElementById('lbl-frete-nome').textContent = `(${name})`;

  // Atualiza total
  const subtotal = getCart().reduce((acc, i) => acc + i.price * i.quantity, 0);
  document.getElementById('val-total').textContent = formatBRL(subtotal + price);
}

// Inject frete styles
(function() {
  const s = document.createElement('style');
  s.textContent = `
    .frete-opcao {
      display:flex;align-items:center;justify-content:space-between;
      padding:12px 14px;border:0.5px solid var(--nb-border-s);border-radius:12px;
      cursor:pointer;margin-bottom:6px;background:var(--nb-card);
      transition:border-color .2s, background .2s;
    }
    .frete-opcao:hover { border-color:var(--nb-border); }
    .frete-opcao.selected {
      border-color:var(--nb-burg);
      background:rgba(61,14,32,.04);
    }
  `;
  document.head.appendChild(s);
})();

// ════════════════════════════════════════════
// PAGAMENTO — Tabs + Formulário de Cartão
// ════════════════════════════════════════════

// Injeta estilos das tabs e form cartão
(function(){
  const s = document.createElement('style');
  s.textContent = `
    .pag-tabs { display:flex; gap:8px; margin-top:6px; }
    .pag-tab {
      flex:1; display:flex; align-items:center; justify-content:center; gap:6px;
      padding:10px 6px; border-radius:10px; border:0.5px solid var(--nb-border-s);
      background:var(--nb-card); color:var(--nb-text-low); font-size:12px;
      font-weight:600; cursor:pointer; font-family:var(--font);
      transition:all .2s;
    }
    .pag-tab.active {
      border-color:var(--nb-burg); background:rgba(61,14,32,.06);
      color:var(--nb-burg);
    }
    .pag-tab:active { opacity:.8; }
  `;
  document.head.appendChild(s);
})();

function selecionarFormaPag(btn) {
  document.querySelectorAll('.pag-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  const forma = btn.dataset.forma;
  document.getElementById('forma-pagamento').value = forma;
  const formCartao = document.getElementById('form-cartao');
  formCartao.style.display = forma === 'CREDIT_CARD' ? 'block' : 'none';
  if (forma === 'CREDIT_CARD') atualizarParcelaInfo();
}

function mascaraCartao(input) {
  let v = input.value.replace(/\D/g,'').slice(0,16);
  v = v.match(/.{1,4}/g)?.join(' ') || v;
  input.value = v;
  atualizarParcelaInfo();
}

function mascaraValidade(input) {
  let v = input.value.replace(/\D/g,'').slice(0,4);
  if (v.length >= 2) v = v.slice(0,2) + '/' + v.slice(2);
  input.value = v;
}

function mascaraCPFCartao(input) {
  let v = input.value.replace(/\D/g,'').slice(0,11);
  if (v.length > 9) v = v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6,9)+'-'+v.slice(9);
  else if (v.length > 6) v = v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6);
  else if (v.length > 3) v = v.slice(0,3)+'.'+v.slice(3);
  input.value = v;
}

function atualizarParcelaInfo() {
  const sel = document.getElementById('cartao-parcelas');
  const info = document.getElementById('cartao-parcela-info');
  if (!sel || !info) return;
  const cart = getCart();
  const subtotal = cart.reduce((a,i) => a + i.price * i.quantity, 0);
  const frete = _freteSelecionado?.price || 0;
  const total = subtotal + frete;
  const parcelas = parseInt(sel.value);
  const vlr = (total / parcelas).toFixed(2).replace('.',',');
  info.textContent = parcelas > 1
    ? `${parcelas}x de R$ ${vlr} = R$ ${formatBRL(total).replace('R$ ','')}`
    : `Total: ${formatBRL(total)}`;
}

// Atualiza info ao mudar parcelas
document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('cartao-parcelas');
  if (sel) sel.addEventListener('change', atualizarParcelaInfo);
});

// ============================================
// IRES EMBAIXADORAS — auth.js
// Controle de sessão, login, logout e
// proteção de rotas por role e status.
// ============================================

// ── Páginas que não precisam de login ──
const PUBLIC_PAGES = ['index.html', 'cadastro.html', ''];

// ── Redireciona para login se não autenticado ──
async function requireAuth() {
  const { data: { session } } = await _supabase.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return null;
  }
  return session;
}

// ── Redireciona para login se não for admin ──
async function requireAdmin() {
  const session = await requireAuth();
  if (!session) return null;

  const { data: profile } = await _supabase
    .from('profiles')
    .select('role, status')
    .eq('id', session.user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    window.location.href = 'painel.html';
    return null;
  }
  return { session, profile };
}

// ── Redireciona se embaixadora não estiver ativa ──
async function requireActive() {
  const session = await requireAuth();
  if (!session) return null;

  const { data: profile } = await _supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (!profile) {
    window.location.href = 'index.html';
    return null;
  }

  if (profile.role === 'admin') return { session, profile };

  if (profile.status === 'pending') {
    window.location.href = 'aguardando.html';
    return null;
  }
  if (profile.status === 'suspended') {
    await _supabase.auth.signOut();
    window.location.href = 'index.html';
    return null;
  }

  return { session, profile };
}

// ── Login com e-mail e senha ──
async function signIn(email, password) {
  const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  // busca perfil para saber para onde redirecionar
  const { data: profile } = await _supabase
    .from('profiles')
    .select('role, status, full_name')
    .eq('id', data.user.id)
    .single();

  if (!profile) throw new Error('Perfil não encontrado.');

  if (profile.role === 'admin') {
    window.location.href = 'admin.html';
    return;
  }
  if (profile.status === 'pending') {
    window.location.href = 'aguardando.html';
    return;
  }
  if (profile.status === 'suspended') {
    await _supabase.auth.signOut();
    throw new Error('Sua conta está suspensa. Entre em contato com a IRES.');
  }

  window.location.href = 'painel.html';
}

// ── Cadastro de nova embaixadora ──
async function signUp({ email, password, full_name, phone, cpf, how_found }) {
  const { data, error } = await _supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, phone }
    }
  });
  if (error) throw error;

  // complementa o perfil com CPF e origem
  if (data.user) {
    await _supabase
      .from('profiles')
      .update({ cpf, how_found })
      .eq('id', data.user.id);
  }

  return data;
}

// ── Logout ──
async function signOut() {
  await _supabase.auth.signOut();
  window.location.href = 'index.html';
}

// ── Recuperação de senha ──
async function resetPassword(email) {
  const { error } = await _supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${IRES_CONFIG.appUrl}/nova-senha.html`,
  });
  if (error) throw error;
}

// ── Pega o perfil do usuário logado ──
async function getMyProfile() {
  const { data: { session } } = await _supabase.auth.getSession();
  if (!session) return null;

  const { data } = await _supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  return data;
}

// ── Renderiza o topbar com avatar e nome ──
async function renderTopbar(opts = {}) {
  const profile = await getMyProfile();
  if (!profile) return;

  const topbarRight = document.getElementById('topbar-right');
  if (!topbarRight) return;

  const cartCount = getCartCount();

  topbarRight.innerHTML = `
    ${opts.showCart !== false ? `
      <a href="carrinho.html" id="cart-link" class="pill pill-pink" style="gap:6px;padding:5px 12px;text-decoration:none">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        Carrinho
        <span id="cart-badge" style="background:#c0307e;color:#fff;font-size:9px;font-weight:700;border-radius:999px;padding:1px 6px;min-width:16px;text-align:center;display:${cartCount > 0 ? 'inline' : 'none'}">${cartCount}</span>
      </a>
    ` : ''}
    <div class="notif-wrap" onclick="toggleNotif(event)" style="position:relative">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gray)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    </div>
    <div class="avatar" title="${profile.full_name || ''}">${initials(profile.full_name)}</div>
    <button class="btn btn-sm btn-outline" style="width:auto" onclick="signOut()">Sair</button>
  `;
}

function _atualizarBadgeCarrinho() {
  const count = getCartCount();
  const badge = document.getElementById('cart-badge');
  if (badge) {
    badge.textContent   = count;
    badge.style.display = count > 0 ? 'inline' : 'none';
  }
}

// ── Helpers do carrinho (localStorage) ──
function getCart() {
  return JSON.parse(localStorage.getItem('ires_cart') || '[]');
}
function saveCart(cart) {
  localStorage.setItem('ires_cart', JSON.stringify(cart));
}
function getCartCount() {
  return getCart().reduce((acc, i) => acc + i.quantity, 0);
}
function clearCart() {
  localStorage.removeItem('ires_cart');
}

function addToCart(product, quantity = null) {
  const cart = getCart();
  const qty = quantity || product.min_quantity;
  const existing = cart.find(i => i.id === product.id);

  if (existing) {
    existing.quantity += qty;
  } else {
    cart.push({
      id:           product.id,
      name:         product.name,
      price:        product.price,
      min_quantity: product.min_quantity,
      images:       product.images,
      quantity:     qty,
    });
  }
  saveCart(cart);
  showToast(`${product.name} adicionado ao carrinho!`, 'success');

  // atualiza badge imediatamente
  _atualizarBadgeCarrinho();
}

function _atualizarBadgeCarrinho() {
  const count = getCartCount();
  // badge no link do carrinho na topbar
  const badge = document.querySelector('#topbar-right .pill-pink span');
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline' : 'none';
  }
  // recria o link inteiro se o badge não existir
  const cartLink = document.querySelector('#topbar-right a[href="carrinho.html"]');
  if (cartLink && !badge) {
    const span = cartLink.querySelector('span');
    if (span) span.textContent = count;
  }
}

function removeFromCart(productId) {
  const cart = getCart().filter(i => i.id !== productId);
  saveCart(cart);
}

function updateCartQty(productId, quantity) {
  const cart = getCart();
  const item = cart.find(i => i.id === productId);
  if (item) {
    item.quantity = quantity;
    saveCart(cart);
  }
}

// ── Dropdown de notificações ──
async function toggleNotif(e) {
  e.stopPropagation();

  // remove dropdown existente
  const existing = document.getElementById('notif-dropdown');
  if (existing) { existing.remove(); return; }

  // busca avisos recentes
  const { data } = await _supabase
    .from('messages')
    .select('id,subject,body,created_at')
    .eq('is_broadcast', true)
    .order('created_at', { ascending: false })
    .limit(4);

  const dropdown = document.createElement('div');
  dropdown.id = 'notif-dropdown';
  dropdown.style.cssText = `
    position:fixed;top:52px;right:8px;width:300px;max-width:calc(100vw - 16px);
    background:#161616;border:0.5px solid #2a2a2a;border-radius:14px;
    z-index:999;overflow:hidden;
    box-shadow:0 8px 32px rgba(0,0,0,0.5);
  `;

  dropdown.innerHTML = `
    <div style="padding:12px 16px;border-bottom:0.5px solid #222;display:flex;align-items:center;justify-content:space-between">
      <span style="font-size:13px;font-weight:700;color:#fff">Avisos</span>
      <a href="painel.html#avisos" style="font-size:11px;color:#f03faa;text-decoration:none">Ver todos</a>
    </div>
    ${(data||[]).length ? (data||[]).map(a => `
      <div style="padding:12px 16px;border-bottom:0.5px solid #1a1a1a">
        <div style="font-size:12px;font-weight:600;color:#fff;margin-bottom:3px">${a.subject || 'Aviso'}</div>
        <div style="font-size:11px;color:#666;line-height:1.5">${a.body.slice(0,80)}${a.body.length>80?'...':''}</div>
        <div style="font-size:10px;color:#444;margin-top:4px">${new Date(a.created_at).toLocaleDateString('pt-BR')}</div>
      </div>
    `).join('') : `
      <div style="padding:20px 16px;text-align:center;font-size:12px;color:#555">Nenhum aviso no momento</div>
    `}
  `;

  document.body.appendChild(dropdown);

  // fecha ao clicar fora
  setTimeout(() => {
    document.addEventListener('click', function handler() {
      dropdown.remove();
      document.removeEventListener('click', handler);
    });
  }, 100);
}

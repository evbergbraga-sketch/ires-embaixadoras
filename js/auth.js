// ============================================
// IRES EMBAIXADORAS — auth.js
// Controle de sessão, login, logout e
// proteção de rotas por role e status.
// ============================================

const PUBLIC_PAGES = ['index.html', 'cadastro.html', ''];

async function requireAuth() {
  const { data: { session } } = await _supabase.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return null; }
  return session;
}

async function requireAdmin() {
  const session = await requireAuth();
  if (!session) return null;
  const { data: profile } = await _supabase.from('profiles').select('role, status').eq('id', session.user.id).single();
  if (!profile || profile.role !== 'admin') { window.location.href = 'painel.html'; return null; }
  return { session, profile };
}

async function requireActive() {
  const session = await requireAuth();
  if (!session) return null;
  const { data: profile } = await _supabase.from('profiles').select('*').eq('id', session.user.id).single();
  if (!profile) { window.location.href = 'index.html'; return null; }
  if (profile.role === 'admin') return { session, profile };
  if (profile.status === 'pending') { window.location.href = 'aguardando.html'; return null; }
  if (profile.status === 'suspended') { await _supabase.auth.signOut(); window.location.href = 'index.html'; return null; }
  return { session, profile };
}

async function signIn(email, password) {
  const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const { data: profile } = await _supabase.from('profiles').select('role, status, full_name').eq('id', data.user.id).single();
  if (!profile) throw new Error('Perfil não encontrado.');
  if (profile.role === 'admin') { window.location.href = 'admin.html'; return; }
  if (profile.status === 'pending') { window.location.href = 'aguardando.html'; return; }
  if (profile.status === 'suspended') { await _supabase.auth.signOut(); throw new Error('Sua conta está suspensa. Entre em contato com a IRES.'); }
  window.location.href = 'painel.html';
}

async function signUp({ email, password, full_name, phone, cpf, how_found }) {
  const { data, error } = await _supabase.auth.signUp({ email, password, options: { data: { full_name, phone } } });
  if (error) throw error;
  if (data.user) { await _supabase.from('profiles').update({ cpf, how_found }).eq('id', data.user.id); }
  return data;
}

async function signOut() {
  await _supabase.auth.signOut();
  window.location.href = 'index.html';
}

async function resetPassword(email) {
  const { error } = await _supabase.auth.resetPasswordForEmail(email, { redirectTo: `${IRES_CONFIG.appUrl}/nova-senha.html` });
  if (error) throw error;
}

async function getMyProfile() {
  const { data: { session } } = await _supabase.auth.getSession();
  if (!session) return null;
  const { data } = await _supabase.from('profiles').select('*').eq('id', session.user.id).single();
  return data;
}

// ── Renderiza o topbar com avatar e nome — PALETA IRES ──
async function renderTopbar(opts = {}) {
  const profile = await getMyProfile();
  if (!profile) return;

  const topbarRight = document.getElementById('topbar-right');
  if (!topbarRight) return;

  const cartCount = getCartCount();

  topbarRight.innerHTML = `
    ${opts.showCart !== false ? `
      <a href="carrinho.html" id="cart-link" style="
        display:inline-flex;align-items:center;gap:6px;
        padding:5px 13px;
        background:rgba(255,255,255,.07);
        border:0.5px solid rgba(240,220,192,.35);
        border-radius:8px;
        color:rgba(240,220,192,.9);
        font-size:12px;font-weight:600;
        text-decoration:none;
        transition:background .15s,border-color .15s;
      "
      onmouseover="this.style.background='rgba(255,255,255,.13)';this.style.borderColor='rgba(240,220,192,.6)'"
      onmouseout="this.style.background='rgba(255,255,255,.07)';this.style.borderColor='rgba(240,220,192,.35)'">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        Carrinho
        <span id="cart-badge" style="
          background:var(--ouro);color:var(--bord-esc);
          font-size:9px;font-weight:800;
          border-radius:999px;padding:1px 6px;
          min-width:16px;text-align:center;
          display:${cartCount > 0 ? 'inline' : 'none'}
        ">${cartCount}</span>
      </a>
    ` : ''}

    <div class="notif-wrap" onclick="toggleNotif(event)" style="position:relative;cursor:pointer;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:8px;transition:background .15s"
      onmouseover="this.style.background='rgba(255,255,255,.08)'"
      onmouseout="this.style.background='transparent'">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(240,220,192,.8)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    </div>

    <div style="
      width:32px;height:32px;border-radius:50%;
      background:rgba(196,154,122,.2);
      border:1.5px solid rgba(212,168,118,.5);
      overflow:hidden;display:flex;align-items:center;justify-content:center;
      cursor:pointer;flex-shrink:0;
    " onclick="window.location.href='painel.html#perfil'" title="${profile.full_name || ''}">
      ${profile.avatar_url
        ? `<img src="${profile.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`
        : `<span style="font-size:12px;font-weight:700;color:rgba(240,220,192,.9)">${initials(profile.full_name)}</span>`
      }
    </div>

    <button onclick="signOut()" style="
      padding:5px 14px;
      background:transparent;
      border:0.5px solid rgba(240,220,192,.35);
      border-radius:8px;
      color:rgba(240,220,192,.85);
      font-size:12px;font-weight:600;
      cursor:pointer;font-family:inherit;
      transition:background .15s,border-color .15s;
    "
    onmouseover="this.style.background='rgba(255,255,255,.08)';this.style.borderColor='rgba(240,220,192,.6)'"
    onmouseout="this.style.background='transparent';this.style.borderColor='rgba(240,220,192,.35)'">
      Sair
    </button>
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

function getCart()         { return JSON.parse(localStorage.getItem('ires_cart') || '[]'); }
function saveCart(cart)    { localStorage.setItem('ires_cart', JSON.stringify(cart)); }
function getCartCount()    { return getCart().reduce((acc, i) => acc + i.quantity, 0); }
function clearCart()       { localStorage.removeItem('ires_cart'); }

function addToCart(product, quantity = null) {
  const cart = getCart();
  const min  = parseInt(product.min_quantity) || 1;
  const qty  = quantity ? parseInt(quantity) : min;
  const existing = cart.find(i => i.id === product.id);
  if (existing) { existing.quantity += qty; }
  else { cart.push({ id:product.id, name:product.name, price:parseFloat(product.price)||0, min_quantity:min, images:product.images, quantity:qty }); }
  saveCart(cart);
  showToast(`${product.name} adicionado ao carrinho!`, 'success');
  _atualizarBadgeCarrinho();
}

function removeFromCart(productId)         { saveCart(getCart().filter(i => i.id !== productId)); }
function updateCartQty(productId, quantity) { const cart = getCart(); const item = cart.find(i => i.id === productId); if (item) { item.quantity = quantity; saveCart(cart); } }

// ── Dropdown de notificações — PALETA IRES ──
async function toggleNotif(e) {
  e.stopPropagation();
  const existing = document.getElementById('notif-dropdown');
  if (existing) { existing.remove(); return; }

  const { data } = await _supabase
    .from('messages')
    .select('id,subject,body,created_at,type')
    .eq('is_broadcast', true)
    .order('created_at', { ascending: false })
    .limit(4);

  const dropdown = document.createElement('div');
  dropdown.id = 'notif-dropdown';
  dropdown.style.cssText = `
    position:fixed;top:64px;right:12px;width:300px;max-width:calc(100vw - 24px);
    background:#fdf8f3;border:0.5px solid #d6c8bc;border-radius:14px;
    z-index:9999;overflow:hidden;
    box-shadow:0 8px 32px rgba(58,14,29,.18);
  `;

  const isAdmin = window.location.pathname.includes('admin');
  const verTodosAction = isAdmin
    ? `document.getElementById('notif-dropdown').remove(); irPara('comunicados')`
    : `document.getElementById('notif-dropdown').remove(); if(typeof irAba==='function'){irAba('avisos')}else{window.location.href='painel.html#avisos'}`;

  const tipoIcone = (tipo) => {
    if (tipo === 'video')   return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8c5e38" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`;
    if (tipo === 'produto') return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2d6645" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`;
    return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5c1a2e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;
  };

  dropdown.innerHTML = `
    <div style="padding:12px 16px;border-bottom:0.5px solid #e8ddd5;display:flex;align-items:center;justify-content:space-between;background:#f7efe4;">
      <span style="font-size:13px;font-weight:700;color:#3a0e1d">Avisos</span>
      <a href="#" style="font-size:11px;color:#5c1a2e;font-weight:700;text-decoration:none"
         onclick="${verTodosAction}; return false">Ver todos →</a>
    </div>
    ${(data||[]).length ? (data||[]).map(a => `
      <div style="padding:11px 16px;border-bottom:0.5px solid #f0e5dc;cursor:pointer"
           onmouseover="this.style.background='#f7efe4'" onmouseout="this.style.background='transparent'">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
          ${tipoIcone(a.type)}
          <span style="font-size:12px;font-weight:700;color:#1e0a12">${a.subject || 'Aviso'}</span>
        </div>
        <div style="font-size:11px;color:#7a6860;line-height:1.5;font-weight:500">${(a.body||'').slice(0,90)}${(a.body||'').length>90?'…':''}</div>
        <div style="font-size:10px;color:#a89088;margin-top:4px">${new Date(a.created_at).toLocaleDateString('pt-BR')}</div>
      </div>
    `).join('') : `
      <div style="padding:24px 16px;text-align:center;font-size:12px;color:#a89088;font-weight:500">Nenhum aviso no momento</div>
    `}
  `;

  document.body.appendChild(dropdown);
  setTimeout(() => {
    document.addEventListener('click', function handler() { dropdown.remove(); document.removeEventListener('click', handler); });
  }, 100);
}

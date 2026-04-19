// ============================================
// IRES EMBAIXADORAS — vitrine.js
// Carrega produtos, categorias, filtros e
// busca. Adiciona itens ao carrinho.
// ============================================

let todosProdutos = [];
let categoriaAtiva = '';
let filtroAtivo    = 'all';

// ── Inicialização ──
(async () => {
  const ctx = await requireActive();
  if (!ctx) return;

  // preenche nome no hero
  const nome = ctx.profile.full_name?.split(' ')[0] || 'Embaixadora';
  document.getElementById('nome-emb').textContent = nome;

  // renderiza topbar
  await renderTopbar();

  // carrega categorias e produtos em paralelo
  await Promise.all([carregarCategorias(), carregarProdutos()]);
})();

// ── Carrega categorias na nav ──
async function carregarCategorias() {
  const { data } = await _supabase
    .from('categories')
    .select('id, name')
    .order('name');

  if (!data?.length) return;

  const nav = document.getElementById('nav-categorias');
  data.forEach(cat => {
    const a = document.createElement('a');
    a.className = 'nav-tab';
    a.dataset.cat = cat.id;
    a.textContent = cat.name;
    a.href = '#';
    a.onclick = (e) => {
      e.preventDefault();
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      a.classList.add('active');
      categoriaAtiva = cat.id;
      filtrarProdutos();
    };
    nav.appendChild(a);
  });

  // clique em "Todos"
  nav.querySelector('[data-cat=""]').onclick = (e) => {
    e.preventDefault();
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    nav.querySelector('[data-cat=""]').classList.add('active');
    categoriaAtiva = '';
    filtrarProdutos();
  };
}

// ── Carrega produtos do Supabase ──
async function carregarProdutos() {
  const { data, error } = await _supabase
    .from('products')
    .select('*, categories(name)')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  document.getElementById('loading').style.display = 'none';

  if (error || !data) {
    showToast('Erro ao carregar produtos.', 'error');
    return;
  }

  todosProdutos = data;
  document.getElementById('total-produtos').textContent = data.length;
  filtrarProdutos();
}

// ── Filtro ativo ──
function setFiltro(el, filtro) {
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  filtroAtivo = filtro;
  filtrarProdutos();
}

// ── Filtra e renderiza ──
function filtrarProdutos() {
  const busca = document.getElementById('busca').value.toLowerCase().trim();

  let lista = todosProdutos.filter(p => {
    const matchCat    = !categoriaAtiva || p.category_id === categoriaAtiva;
    const matchBusca  = !busca || p.name.toLowerCase().includes(busca) || (p.description||'').toLowerCase().includes(busca);
    return matchCat && matchBusca;
  });

  // filtros especiais (tags no description ou campo futuro)
  // por ora mostra todos nos filtros especiais
  renderProdutos(lista);
}

// ── Renderiza o grid ──
function renderProdutos(lista) {
  const grid  = document.getElementById('grid-produtos');
  const empty = document.getElementById('empty-state');

  if (!lista.length) {
    grid.style.display  = 'none';
    empty.style.display = 'block';
    return;
  }

  grid.style.display  = 'grid';
  empty.style.display = 'none';

  grid.innerHTML = lista.map(p => {
    const img    = p.images?.[0] || '';
    const preco  = formatBRL(p.price);
    const catNome = p.categories?.name || '';

    return `
      <div class="product-card" onclick="abrirProduto('${p.id}')">
        <div class="product-img">
          ${img
            ? `<img src="${img}" alt="${p.name}" loading="lazy"/>`
            : `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`
          }
          ${catNome ? `<div class="product-tag"><span class="pill pill-pink">${catNome}</span></div>` : ''}
        </div>
        <div class="product-info">
          <div class="product-name">${p.name}</div>
          <div class="product-desc">${p.description || 'Sem descrição'}</div>
          <div class="product-bottom">
            <div>
              <div class="product-price">${preco}</div>
              <div class="product-min">mín. ${p.min_quantity} unidade${p.min_quantity > 1 ? 's' : ''}</div>
            </div>
            <button class="btn-add" title="Adicionar ao carrinho" onclick="event.stopPropagation(); adicionarAoCarrinho('${p.id}')">+</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ── Abre modal do produto ──
function abrirProduto(id) {
  const p = todosProdutos.find(x => x.id === id);
  if (!p) return;

  const modal  = document.getElementById('modal-produto') || criarModal();
  const imgs   = Array.isArray(p.images) && p.images.length ? p.images : [];
  const temFotos = imgs.length > 0;

  modal.innerHTML = `
    <div class="card" style="max-width:420px;width:100%;position:relative">
      <button onclick="fecharModal()" style="position:absolute;top:12px;right:12px;z-index:10;background:rgba(0,0,0,0.5);border:none;color:#fff;cursor:pointer;font-size:18px;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center">✕</button>

      <!-- Carrossel -->
      <div style="position:relative;height:240px;background:var(--black);border-radius:var(--radius-md);margin-bottom:16px;overflow:hidden">
        ${temFotos ? `
          <div id="carousel-track" style="display:flex;height:100%;transition:transform 0.3s ease">
            ${imgs.map(url => `
              <div style="min-width:100%;height:100%;flex-shrink:0">
                <img src="${url}" style="width:100%;height:100%;object-fit:cover"/>
              </div>
            `).join('')}
          </div>

          ${imgs.length > 1 ? `
            <button onclick="moverCarrossel(-1)" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.6);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center">‹</button>
            <button onclick="moverCarrossel(1)"  style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.6);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center">›</button>
            <div style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);display:flex;gap:5px">
              ${imgs.map((_, i) => `<div id="dot-${i}" style="width:6px;height:6px;border-radius:50%;background:${i===0?'#fff':'rgba(255,255,255,0.4)'};transition:background 0.2s"></div>`).join('')}
            </div>
          ` : ''}

          ${imgs.length > 1 ? `
            <div style="position:absolute;bottom:28px;right:10px;background:rgba(0,0,0,0.5);color:#fff;font-size:10px;padding:2px 7px;border-radius:10px" id="carousel-count">1/${imgs.length}</div>
          ` : ''}
        ` : `
          <div style="display:flex;align-items:center;justify-content:center;height:100%">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
          </div>
        `}
      </div>

      <!-- Miniaturas -->
      ${imgs.length > 1 ? `
        <div style="display:flex;gap:6px;margin-bottom:14px;overflow-x:auto;padding-bottom:4px">
          ${imgs.map((url, i) => `
            <img src="${url}" onclick="irParaSlide(${i})"
              id="thumb-${i}"
              style="width:52px;height:52px;object-fit:cover;border-radius:6px;cursor:pointer;border:2px solid ${i===0?'var(--pink)':'transparent'};flex-shrink:0;transition:border-color 0.2s"/>
          `).join('')}
        </div>
      ` : ''}

      <h3 style="font-size:16px;font-weight:800;margin-bottom:6px">${p.name}</h3>
      <p style="font-size:13px;color:var(--gray);margin-bottom:16px;line-height:1.6">${p.description || ''}</p>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div>
          <div style="font-size:22px;font-weight:900">${formatBRL(p.price)}</div>
          <div style="font-size:11px;color:var(--gray)">por unidade</div>
        </div>
        <div class="info-box" style="margin:0;padding:8px 12px">
          <div class="info-box-dot"></div>
          <p style="font-size:11px">Mínimo <strong>${p.min_quantity} un.</strong></p>
        </div>
      </div>

      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
        <label style="font-size:11px;color:var(--gray);text-transform:uppercase;letter-spacing:1px">Quantidade</label>
        <div style="display:flex;align-items:center;gap:8px">
          <button class="qty-btn" onclick="ajustarQty(-1, ${p.min_quantity})">−</button>
          <span class="qty-value" id="modal-qty">${p.min_quantity}</span>
          <button class="qty-btn" onclick="ajustarQty(1, ${p.min_quantity})">+</button>
        </div>
        <span style="font-size:12px;color:var(--pink);font-weight:700" id="modal-subtotal">${formatBRL(p.price * p.min_quantity)}</span>
      </div>

      <button class="btn btn-primary" onclick="adicionarDoModal('${p.id}')">Adicionar ao carrinho</button>
    </div>
  `;

  window._carouselIdx   = 0;
  window._carouselTotal = imgs.length;
  modal.style.display   = 'flex';
  document.body.style.overflow = 'hidden';
}

function moverCarrossel(dir) {
  const total = window._carouselTotal || 1;
  window._carouselIdx = ((window._carouselIdx || 0) + dir + total) % total;
  irParaSlide(window._carouselIdx);
}

function irParaSlide(idx) {
  const track = document.getElementById('carousel-track');
  if (!track) return;
  track.style.transform = `translateX(-${idx * 100}%)`;
  window._carouselIdx   = idx;

  // atualiza dots
  for (let i = 0; i < (window._carouselTotal || 1); i++) {
    const dot = document.getElementById(`dot-${i}`);
    if (dot) dot.style.background = i === idx ? '#fff' : 'rgba(255,255,255,0.4)';
    const thumb = document.getElementById(`thumb-${i}`);
    if (thumb) thumb.style.borderColor = i === idx ? 'var(--pink)' : 'transparent';
  }

  const count = document.getElementById('carousel-count');
  if (count) count.textContent = `${idx + 1}/${window._carouselTotal}`;
}

let _prodAtual = null;
function ajustarQty(delta, min) {
  const el  = document.getElementById('modal-qty');
  const sub = document.getElementById('modal-subtotal');
  let qty = parseInt(el.textContent) + delta;
  if (qty < min) qty = min;
  el.textContent = qty;

  // atualiza subtotal
  const id = document.querySelector('[onclick^="adicionarDoModal"]')
    ?.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
  if (id) {
    const p = todosProdutos.find(x => x.id === id);
    if (p) sub.textContent = formatBRL(p.price * qty);
  }
}

function adicionarDoModal(id) {
  const p   = todosProdutos.find(x => x.id === id);
  const qty = parseInt(document.getElementById('modal-qty').textContent);
  if (!p) return;
  addToCart(p, qty);
  fecharModal();
  atualizarBadgeCarrinho();
}

function criarModal() {
  const m = document.createElement('div');
  m.id = 'modal-produto';
  m.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:999;align-items:center;justify-content:center;padding:16px';
  m.onclick = (e) => { if (e.target === m) fecharModal(); };
  document.body.appendChild(m);
  return m;
}

function fecharModal() {
  const m = document.getElementById('modal-produto');
  if (m) m.style.display = 'none';
  document.body.style.overflow = '';
}

function adicionarAoCarrinho(id) {
  const p = todosProdutos.find(x => x.id === id);
  if (!p) return;
  addToCart(p);
  atualizarBadgeCarrinho();
}

function atualizarBadgeCarrinho() {
  const badge = document.querySelector('#topbar-right .pill-pink span');
  if (badge) badge.textContent = getCartCount();
}

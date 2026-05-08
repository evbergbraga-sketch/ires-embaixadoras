// ============================================================
// IRES Embaixadoras — Aba "Minha Jornada" (v2)
// Design system: creme/bordô/ouro — integrado ao painel
// ============================================================

const _NIVEIS = [
  { key:'iniciante', label:'Iniciante', icon:'⭐', cor:'#8B8B8B', corBg:'rgba(139,139,139,.10)', corBdr:'rgba(139,139,139,.25)', min:0,
    beneficios:['Acesso ao painel de revendedoras','Catálogo completo de produtos IRES','Suporte via WhatsApp','Módulos de capacitação básicos'] },
  { key:'bronze', label:'Bronze', icon:'🥉', cor:'#A0723C', corBg:'rgba(160,114,60,.10)', corBdr:'rgba(160,114,60,.25)', min:1,
    beneficios:['Desconto especial em pedidos','Acesso a módulos intermediários','Relatório de vendas mensal','Badge Bronze no perfil'] },
  { key:'prata', label:'Prata', icon:'🥈', cor:'#7A7D82', corBg:'rgba(122,125,130,.10)', corBdr:'rgba(122,125,130,.25)', min:5,
    beneficios:['Desconto exclusivo Prata','Acesso a módulos avançados','Prioridade no suporte','Kit de brindes trimestral'] },
  { key:'ouro', label:'Ouro', icon:'🥇', cor:'#8c5e38', corBg:'rgba(140,94,56,.10)', corBdr:'rgba(140,94,56,.25)', min:15,
    beneficios:['Comissão ampliada por indicação','Acesso total à capacitação','Gerente de conta dedicado','Produtos em lançamento antecipado'] },
  { key:'diamante', label:'Diamante', icon:'💎', cor:'#2a5080', corBg:'rgba(42,80,128,.10)', corBdr:'rgba(42,80,128,.25)', min:30,
    beneficios:['Maior desconto da plataforma','Convite para eventos exclusivos','Co-criação de coleções','Reconhecimento oficial IRES'] },
];

const _FRASES = {
  iniciante: 'Sua jornada começa aqui. Cada pedido te aproxima do próximo nível!',
  bronze:    'Parabéns pelo primeiro marco! Continue crescendo rumo à Prata.',
  prata:     'Você está brilhando! A meta Ouro está cada vez mais perto.',
  ouro:      'Embaixadora de Ouro! Diamante é questão de tempo.',
  diamante:  'Você chegou ao topo! Parabéns, Embaixadora Diamante!',
};

// ── Render principal (chamada por irAba) ──────────────────
async function renderJornada() {
  const el = document.getElementById('conteudo');
  el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;min-height:50vh;color:var(--nb-text-low);font-size:13px;gap:10px"><div class="spinner"></div> Carregando jornada…</div>`;

  try {
    const [profileRes, ordersRes, progressRes] = await Promise.all([
      _supabase.from('profiles').select('*').eq('id', _perfil.id).single(),
      _supabase.from('orders').select('id,total').eq('reseller_id', _perfil.id).in('status',['paid','processing','shipped','delivered']),
      _supabase.from('lesson_progress').select('id').eq('reseller_id', _perfil.id),
    ]);

    const profile = profileRes.data || _perfil;
    const pedidos = ordersRes.data || [];
    const progressos = progressRes.data || [];
    const totalPedidos = pedidos.length;
    const totalVolume = pedidos.reduce((s,o) => s + (o.total||0), 0);
    const totalAulas = progressos.length;
    const nivelAtual = profile.nivel || 'iniciante';
    const nivelIdx = _NIVEIS.findIndex(n => n.key === nivelAtual);
    const nivelObj = _NIVEIS[nivelIdx];
    const proximo = _NIVEIS[nivelIdx+1] || null;

    const baseMin = nivelObj.min;
    const prxMin = proximo ? proximo.min : baseMin;
    const faltam = proximo ? Math.max(0, prxMin - totalPedidos) : 0;
    const range = prxMin - baseMin;
    const pct = proximo ? (range > 0 ? Math.min(100, Math.round(((totalPedidos - baseMin) / range) * 100)) : 100) : 100;

    el.innerHTML = _jornadaHTML({ profile, nivelAtual, nivelIdx, nivelObj, proximo, totalPedidos, totalVolume, totalAulas, faltam, pct, prxMin });

    // Anima barra de progresso
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.querySelectorAll('.j2-prog-fill').forEach(b => b.style.width = b.dataset.pct + '%');
      });
    });

    // Animação de entrada staggered
    el.querySelectorAll('.j2-animate').forEach((card, i) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(12px)';
      setTimeout(() => {
        card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, 80 + i * 60);
    });

    // Accordion
    el.querySelectorAll('.j2-benef-hdr').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.j2-benef-card');
        card.classList.toggle('open');
      });
    });

  } catch (err) {
    el.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--nb-text-low)"><p style="margin-bottom:12px">⚠️ Não foi possível carregar sua jornada</p><button onclick="renderJornada()" class="btn-link" style="color:var(--nb-burg);font-weight:600;border:none;background:none;cursor:pointer;text-decoration:underline">Tentar novamente</button></div>`;
    console.error('[Jornada]', err);
  }
}

function _jornadaHTML({ profile, nivelAtual, nivelIdx, nivelObj, proximo, totalPedidos, totalVolume, totalAulas, faltam, pct, prxMin }) {
  const nome = profile.full_name?.split(' ')[0] || 'Embaixadora';

  // ── TIMELINE ──
  const tlHTML = _NIVEIS.map((n, i) => {
    const estado = i < nivelIdx ? 'done' : i === nivelIdx ? 'current' : 'locked';
    const isLast = i === _NIVEIS.length - 1;
    return `
      <div class="j2-tl-item j2-tl-${estado} j2-animate" ${estado !== 'locked' ? `style="--nc:${n.cor};--nc-bg:${n.corBg};--nc-bdr:${n.corBdr}"` : ''}>
        <div class="j2-tl-rail">
          <div class="j2-tl-dot">${estado === 'done' ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : `<span>${n.icon}</span>`}</div>
          ${!isLast ? '<div class="j2-tl-line"></div>' : ''}
        </div>
        <div class="j2-tl-body">
          <div class="j2-tl-top">
            <span class="j2-tl-nome">${n.label}</span>
            <span class="j2-tl-req">${n.min === 0 ? 'Início' : n.min + ' pedido' + (n.min > 1 ? 's' : '')}</span>
          </div>
          ${estado === 'current' ? `
            <div class="j2-tl-prog">
              <div class="j2-prog-track"><div class="j2-prog-fill" data-pct="${pct}" style="background:var(--nc)"></div></div>
              <span class="j2-prog-lbl">${totalPedidos} de ${proximo ? prxMin : totalPedidos} pedidos</span>
            </div>
          ` : ''}
          ${estado === 'locked' ? `<span class="j2-tl-lock">Bloqueado</span>` : ''}
          ${estado === 'done' ? `<span class="j2-tl-done-tag">Conquistado ✓</span>` : ''}
        </div>
      </div>`;
  }).join('');

  // ── BENEFÍCIOS ──
  const benefHTML = _NIVEIS.slice(0, nivelIdx + 1).reverse().map((n, i) => `
    <div class="j2-benef-card ${i === 0 ? 'open' : ''} j2-animate" style="--nc:${n.cor};--nc-bg:${n.corBg};--nc-bdr:${n.corBdr}">
      <button class="j2-benef-hdr">
        <span class="j2-benef-hdr-left"><span class="j2-benef-icon">${n.icon}</span> ${n.label}</span>
        <svg class="j2-benef-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="j2-benef-body">
        ${n.beneficios.map(b => `
          <div class="j2-benef-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${n.cor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <span>${b}</span>
          </div>`).join('')}
      </div>
    </div>`).join('');

  return `
    <div class="j2-page">

      <!-- Hero -->
      <div class="j2-hero j2-animate">
        <div class="j2-hero-top">
          <div class="j2-hero-badge" style="background:${nivelObj.corBg};border-color:${nivelObj.corBdr}">
            <span style="font-size:28px;line-height:1">${nivelObj.icon}</span>
          </div>
          <div class="j2-hero-info">
            <div class="j2-hero-greeting">Olá, ${nome}!</div>
            <div class="j2-hero-nivel">
              <span class="j2-nivel-tag" style="background:${nivelObj.corBg};border-color:${nivelObj.corBdr};color:${nivelObj.cor}">${nivelObj.icon} ${nivelObj.label}</span>
            </div>
          </div>
        </div>
        <p class="j2-hero-frase">${_FRASES[nivelAtual]}</p>
        ${proximo ? `
          <div class="j2-hero-prog">
            <div class="j2-hero-prog-top">
              <span>Progresso para ${proximo.icon} ${proximo.label}</span>
              <span style="font-weight:700">${pct}%</span>
            </div>
            <div class="j2-prog-track j2-prog-track-hero"><div class="j2-prog-fill" data-pct="${pct}" style="background:${proximo.cor}"></div></div>
          </div>
        ` : `<div class="j2-hero-prog"><span style="color:var(--nb-gold);font-weight:600">💎 Nível máximo alcançado!</span></div>`}
      </div>

      <!-- Stats -->
      <div class="j2-stats">
        <div class="j2-stat j2-animate">
          <div class="j2-stat-icon" style="background:var(--nb-burg-dim);border-color:var(--nb-burg-bdr)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--nb-burg)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
          </div>
          <div class="j2-stat-val">${totalPedidos}</div>
          <div class="j2-stat-lbl">Pedidos</div>
        </div>
        <div class="j2-stat j2-animate">
          <div class="j2-stat-icon" style="background:var(--nb-gold-dim);border-color:var(--nb-gold-bdr)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--nb-gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          </div>
          <div class="j2-stat-val">${totalAulas}</div>
          <div class="j2-stat-lbl">Aulas</div>
        </div>
        <div class="j2-stat j2-animate">
          <div class="j2-stat-icon" style="background:var(--nb-green-dim);border-color:var(--nb-green-bdr)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--nb-green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
          </div>
          <div class="j2-stat-val">R$ ${totalVolume.toLocaleString('pt-BR',{minimumFractionDigits:0})}</div>
          <div class="j2-stat-lbl">Volume</div>
        </div>
      </div>

      <!-- Próximo passo -->
      ${proximo ? `
      <div class="j2-section j2-animate">
        <div class="j2-prox-card" style="--nc:${proximo.cor};--nc-bg:${proximo.corBg};--nc-bdr:${proximo.corBdr}">
          <div class="j2-prox-left">
            <span style="font-size:30px;line-height:1">${proximo.icon}</span>
          </div>
          <div class="j2-prox-body">
            <div class="j2-prox-title">Próximo: ${proximo.label}</div>
            <div class="j2-prox-desc">Faltam <strong style="color:var(--nc)">${faltam} pedido${faltam !== 1 ? 's' : ''}</strong> para o nível ${proximo.label}</div>
          </div>
        </div>
        <div class="j2-prox-acoes">
          <button class="j2-btn j2-btn-p" onclick="irAba('vitrine')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            Ver Vitrine
          </button>
          <button class="j2-btn j2-btn-s" onclick="irAba('capacitacao')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
            Capacitação
          </button>
        </div>
      </div>` : ''}

      <!-- Timeline -->
      <div class="j2-section">
        <div class="j2-section-hdr j2-animate">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--nb-burg)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0012 0V2z"/></svg>
          <span>Linha do Tempo</span>
        </div>
        <div class="j2-timeline">${tlHTML}</div>
      </div>

      <!-- Benefícios -->
      <div class="j2-section">
        <div class="j2-section-hdr j2-animate">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--nb-burg)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <span>Benefícios Desbloqueados</span>
        </div>
        ${benefHTML}
      </div>

    </div>`;
}

// ── Estilos v2 — Design system IRES ──────────────────────
(function(){
  if(document.getElementById('j2-css')) return;
  const s=document.createElement('style');
  s.id='j2-css';
  s.textContent=`
.j2-page{padding:0 0 100px}

/* Hero */
.j2-hero{background:var(--nb-card);border:0.5px solid var(--nb-border-s);border-radius:16px;padding:20px;margin-bottom:14px}
.j2-hero-top{display:flex;align-items:center;gap:14px;margin-bottom:14px}
.j2-hero-badge{width:56px;height:56px;border-radius:16px;display:flex;align-items:center;justify-content:center;border:1px solid;flex-shrink:0}
.j2-hero-greeting{font-size:18px;font-weight:800;color:var(--nb-text-hi);line-height:1.2;letter-spacing:-.3px}
.j2-hero-nivel{margin-top:6px}
.j2-nivel-tag{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;border:0.5px solid;letter-spacing:.3px}
.j2-hero-frase{font-size:13px;color:var(--nb-text-low);line-height:1.5;margin-bottom:16px}
.j2-hero-prog{padding-top:14px;border-top:0.5px solid var(--nb-border)}
.j2-hero-prog-top{display:flex;justify-content:space-between;font-size:11px;color:var(--nb-text-low);margin-bottom:8px}

/* Progress bar */
.j2-prog-track{background:var(--nb-border);border-radius:99px;height:6px;overflow:hidden}
.j2-prog-track-hero{height:8px}
.j2-prog-fill{height:100%;border-radius:99px;transition:width 1s cubic-bezier(.4,0,.2,1);width:0}
.j2-prog-lbl{font-size:11px;color:var(--nb-text-low);margin-top:5px;display:block}

/* Stats */
.j2-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px}
.j2-stat{background:var(--nb-card);border:0.5px solid var(--nb-border-s);border-radius:14px;padding:16px 12px;text-align:center}
.j2-stat-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;border:0.5px solid}
.j2-stat-val{font-size:22px;font-weight:800;color:var(--nb-text-hi);letter-spacing:-.5px;line-height:1}
.j2-stat-lbl{font-size:10px;font-weight:600;color:var(--nb-text-low);text-transform:uppercase;letter-spacing:.5px;margin-top:6px}

/* Sections */
.j2-section{margin-bottom:18px}
.j2-section-hdr{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;color:var(--nb-burg);text-transform:uppercase;letter-spacing:.5px;margin-bottom:14px}

/* Timeline */
.j2-timeline{position:relative}
.j2-tl-item{display:flex;gap:0;margin-bottom:0}
.j2-tl-rail{display:flex;flex-direction:column;align-items:center;width:40px;flex-shrink:0}
.j2-tl-dot{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;border:2px solid var(--nb-border);background:var(--nb-card);color:var(--nb-text-low);position:relative;z-index:1}
.j2-tl-line{flex:1;width:2px;background:var(--nb-border);min-height:12px}

.j2-tl-done .j2-tl-dot{background:var(--nc);border-color:var(--nc);color:#fff}
.j2-tl-done .j2-tl-line{background:var(--nc)}
.j2-tl-current .j2-tl-dot{background:var(--nc-bg);border-color:var(--nc);color:var(--nc);box-shadow:0 0 0 4px var(--nc-bg);animation:j2pulse 2.5s ease-in-out infinite}
@keyframes j2pulse{0%,100%{box-shadow:0 0 0 4px var(--nc-bg)}50%{box-shadow:0 0 0 8px var(--nc-bg)}}
.j2-tl-locked .j2-tl-dot{background:var(--nb-inset);border-color:var(--nb-border);color:var(--nb-text-low);opacity:.5}
.j2-tl-locked .j2-tl-line{background:var(--nb-border);opacity:.4}

.j2-tl-body{flex:1;padding:6px 0 20px 10px;min-width:0}
.j2-tl-top{display:flex;justify-content:space-between;align-items:center}
.j2-tl-nome{font-size:14px;font-weight:700;color:var(--nb-text-hi)}
.j2-tl-current .j2-tl-nome{color:var(--nc)}
.j2-tl-locked .j2-tl-nome{color:var(--nb-text-low);opacity:.5}
.j2-tl-req{font-size:11px;color:var(--nb-text-low);font-weight:500}
.j2-tl-lock{font-size:10px;color:var(--nb-text-low);opacity:.5;margin-top:3px;display:block}
.j2-tl-done-tag{font-size:10px;font-weight:700;color:var(--nc);margin-top:3px;display:block}
.j2-tl-prog{margin-top:8px;background:var(--nb-inset);border:0.5px solid var(--nb-border);border-radius:10px;padding:10px 12px}

/* Benefícios */
.j2-benef-card{background:var(--nb-card);border:0.5px solid var(--nb-border-s);border-radius:14px;margin-bottom:8px;overflow:hidden}
.j2-benef-hdr{width:100%;background:none;border:none;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-size:14px;font-weight:700;font-family:var(--font);color:var(--nb-text-hi)}
.j2-benef-hdr-left{display:flex;align-items:center;gap:8px}
.j2-benef-icon{font-size:16px}
.j2-benef-chevron{transition:transform .25s;color:var(--nb-text-low)}
.j2-benef-card.open .j2-benef-chevron{transform:rotate(180deg)}
.j2-benef-body{max-height:0;overflow:hidden;transition:max-height .35s ease;padding:0 16px}
.j2-benef-card.open .j2-benef-body{max-height:280px;padding-bottom:14px}
.j2-benef-item{display:flex;align-items:flex-start;gap:8px;padding:6px 0;font-size:13px;color:var(--nb-text-mid)}
.j2-benef-item svg{flex-shrink:0;margin-top:1px}

/* Próximo passo */
.j2-prox-card{background:var(--nb-card);border:0.5px solid var(--nc-bdr);border-left:3px solid var(--nc);border-radius:14px;padding:16px;display:flex;gap:14px;align-items:center;margin-bottom:12px}
.j2-prox-left{width:50px;height:50px;border-radius:14px;background:var(--nc-bg);border:0.5px solid var(--nc-bdr);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.j2-prox-title{font-size:14px;font-weight:700;color:var(--nb-text-hi);margin-bottom:3px}
.j2-prox-desc{font-size:12px;color:var(--nb-text-low);line-height:1.5}
.j2-prox-acoes{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.j2-btn{display:flex;align-items:center;justify-content:center;gap:6px;padding:12px;border-radius:12px;border:none;font-size:12px;font-weight:700;cursor:pointer;font-family:var(--font);transition:opacity .15s}
.j2-btn:active{opacity:.75}
.j2-btn-p{background:var(--nb-burg);color:var(--ouro-cl)}
.j2-btn-s{background:var(--nb-burg-dim);color:var(--nb-burg);border:0.5px solid var(--nb-burg-bdr)}

@media(min-width:768px){
  .j2-page{max-width:620px;margin:0 auto;padding-top:10px}
  .j2-hero{padding:28px;border-radius:18px}
  .j2-stat{padding:20px 16px}
  .j2-stat-val{font-size:26px}
}
`;
  document.head.appendChild(s);
})();

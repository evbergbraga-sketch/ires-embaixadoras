// ============================================================
// IRES Embaixadoras — Aba "Minha Jornada"
// Integrado ao sistema irAba() do painel.js
// ============================================================

const _NIVEIS = [
  { key: 'iniciante', label: 'Iniciante', icon: '⭐', cor: '#8B8B8B', minPedidos: 0,
    beneficios: ['Acesso ao painel de revendedoras','Catálogo completo de produtos IRES','Suporte via WhatsApp','Módulos de capacitação básicos'] },
  { key: 'bronze',    label: 'Bronze',    icon: '🥉', cor: '#CD7F32', minPedidos: 1,
    beneficios: ['Desconto especial em pedidos','Acesso a módulos intermediários','Relatório de vendas mensal','Badge Bronze no perfil'] },
  { key: 'prata',     label: 'Prata',     icon: '🥈', cor: '#A8A9AD', minPedidos: 5,
    beneficios: ['Desconto exclusivo Prata','Acesso a módulos avançados','Prioridade no suporte','Kit de brindes trimestral'] },
  { key: 'ouro',      label: 'Ouro',      icon: '🥇', cor: '#C8A96E', minPedidos: 15,
    beneficios: ['Comissão ampliada por indicação','Acesso total à capacitação','Gerente de conta dedicado','Produtos em lançamento antecipado'] },
  { key: 'diamante',  label: 'Diamante',  icon: '💎', cor: '#B9F2FF', minPedidos: 30,
    beneficios: ['Maior desconto da plataforma','Convite para eventos exclusivos','Co-criação de coleções','Reconhecimento oficial IRES'] },
];

const _FRASES = {
  iniciante: 'Sua jornada começa aqui. Cada pedido é um passo rumo ao sucesso! 🚀',
  bronze:    'Você já deu o primeiro passo! Continue crescendo e conquiste a Prata. ✨',
  prata:     'Incrível! Você está brilhando. A meta Ouro está ao seu alcance! 🌟',
  ouro:      'Você é ouro puro! Diamante é questão de tempo. Não pare! 💪',
  diamante:  'Você chegou ao topo! Parabéns por ser uma Embaixadora Diamante IRES! 💎',
};

// ── Injeção de estilos ──────────────────────────────────────
(function injectJornadaStyles() {
  if (document.getElementById('jornada-styles')) return;
  const s = document.createElement('style');
  s.id = 'jornada-styles';
  s.textContent = `
    .jornada-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;gap:14px;color:#F5EFE6;font-family:'DM Sans',sans-serif}
    .jornada-page{padding:0 0 100px;font-family:'DM Sans',sans-serif;min-height:100vh}

    /* Hero */
    .j-hero{background:linear-gradient(135deg,#3D0E20 55%,#5a1530);padding:24px 20px 28px;border-radius:0 0 24px 24px;margin-bottom:20px}
    .j-badge{display:flex;align-items:center;gap:14px;margin-bottom:12px}
    .j-badge-icon{font-size:42px;line-height:1}
    .j-badge-nivel{font-family:'Playfair Display',serif;font-size:19px;font-weight:700;letter-spacing:.5px}
    .j-badge-nome{color:#F5EFE6cc;font-size:13px;margin-top:3px}
    .j-frase{color:#F5EFE6cc;font-size:13px;line-height:1.55;margin:0;font-style:italic}

    /* Stats */
    .j-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:0 16px;margin-bottom:24px}
    .j-stat{background:#1a0d14;border:0.5px solid #3E2A3C;border-radius:14px;padding:14px 10px;text-align:center}
    .j-stat-val{font-size:19px;font-weight:700;color:#C8A96E;font-family:'Playfair Display',serif}
    .j-stat-lbl{font-size:10px;color:#9a7a8a;margin-top:4px;line-height:1.3}

    /* Sections */
    .j-section{padding:0 16px;margin-bottom:28px}
    .j-title{font-family:'Playfair Display',serif;font-size:17px;color:#F5EFE6;margin:0 0 16px;padding-bottom:8px;border-bottom:1px solid #C8A96E33}

    /* Timeline */
    .j-timeline{position:relative;padding-left:0}
    .j-timeline::before{content:'';position:absolute;left:17px;top:4px;bottom:4px;width:2px;background:#3E2A3C}
    .j-tl-item{display:flex;gap:14px;margin-bottom:22px;position:relative}
    .j-tl-marker{width:36px;height:36px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:15px;border:2.5px solid #0e0810;z-index:1;position:relative;transition:box-shadow .3s}
    .j-tl-item.concluido .j-tl-marker{background:var(--nc);box-shadow:0 0 0 2px var(--nc),0 0 12px var(--nc)44;color:#fff;font-size:13px;font-weight:700}
    .j-tl-item.atual .j-tl-marker{background:var(--nc);box-shadow:0 0 0 2px var(--nc),0 0 16px var(--nc)66;animation:j-pulse 2s ease-in-out infinite}
    .j-tl-item.bloqueado .j-tl-marker{background:#1a0d14;border-color:#3E2A3C;color:#705868;filter:grayscale(.8)}
    @keyframes j-pulse{0%,100%{box-shadow:0 0 0 2px var(--nc),0 0 8px var(--nc)44}50%{box-shadow:0 0 0 3px var(--nc),0 0 20px var(--nc)66}}
    .j-tl-content{flex:1;padding-top:5px}
    .j-tl-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:2px}
    .j-tl-nome{font-weight:600;font-size:14px}
    .j-tl-req{font-size:11px;color:#705868}
    .j-tl-lock{font-size:11px;color:#705868;margin-top:3px}
    .j-tl-item.bloqueado .j-tl-nome{color:#705868!important}

    /* Progresso */
    .j-prog-wrap{margin-top:8px}
    .j-prog-track{background:#1a0d14;border:0.5px solid #3E2A3C;border-radius:99px;height:8px;overflow:hidden}
    .j-prog-fill{height:100%;border-radius:99px;transition:width .9s cubic-bezier(.4,0,.2,1);width:0%}
    .j-prog-lbl{font-size:11px;color:#9a7a8a;margin-top:5px;display:block}

    /* Benefícios accordion */
    .j-benef-card{background:#1a0d14;border:0.5px solid #3E2A3C;border-radius:14px;margin-bottom:10px;overflow:hidden}
    .j-benef-header{width:100%;background:none;border:none;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-size:14px;font-weight:600;font-family:'DM Sans',sans-serif;color:#F5EFE6}
    .j-benef-chevron{transition:transform .25s;color:#C8A96E;font-size:16px}
    .j-benef-card.open .j-benef-chevron{transform:rotate(180deg)}
    .j-benef-body{max-height:0;overflow:hidden;transition:max-height .35s ease}
    .j-benef-card.open .j-benef-body{max-height:300px}
    .j-benef-body ul{margin:0;padding:0 16px 16px;list-style:none}
    .j-benef-body li{font-size:13px;color:#C0A8B8;padding:5px 0;border-bottom:0.5px solid #3E2A3C22}
    .j-benef-body li:last-child{border:none}

    /* Próximo passo */
    .j-prox-card{background:#1a0d14;border:0.5px solid #3E2A3C;border-left:3px solid var(--pc,#C8A96E);border-radius:14px;padding:16px;display:flex;gap:14px;align-items:center;margin-bottom:14px}
    .j-prox-icon{font-size:34px;line-height:1}
    .j-prox-titulo{font-weight:700;color:#F5EFE6;font-size:15px;margin-bottom:4px}
    .j-prox-desc{font-size:13px;color:#9a7a8a;line-height:1.45}
    .j-prox-desc strong{color:#C8A96E}
    .j-prox-acoes{display:flex;gap:10px;margin-top:2px}
    .j-btn{flex:1;padding:13px;border-radius:12px;border:none;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:opacity .2s}
    .j-btn:active{opacity:.8}
    .j-btn-p{background:#3D0E20;color:#C8A96E;border:0.5px solid #C8A96E44}
    .j-btn-s{background:#C8A96E18;color:#C8A96E;border:0.5px solid #C8A96E33}
    .j-diamante-card{background:linear-gradient(135deg,#1a0d14,#0d1a1a);border-color:#B9F2FF44;border-left-color:#B9F2FF}
  `;
  document.head.appendChild(s);
})();

// ── Render principal ────────────────────────────────────────
async function renderJornada() {
  const el = document.getElementById('conteudo');
  el.innerHTML = `<div class="jornada-loading"><div class="spinner" style="border-top-color:#C8A96E"></div><p style="color:#9a7a8a;font-size:13px">Carregando sua jornada...</p></div>`;

  try {
    const [profileRes, ordersRes, progressRes] = await Promise.all([
      _supabase.from('profiles').select('*').eq('id', _perfil.id).single(),
      _supabase.from('orders').select('id,total').eq('reseller_id', _perfil.id).in('status', ['paid','processing','shipped','delivered']),
      _supabase.from('lesson_progress').select('id').eq('reseller_id', _perfil.id),
    ]);

    const profile      = profileRes.data  || _perfil;
    const pedidos      = ordersRes.data   || [];
    const progressos   = progressRes.data || [];
    const totalPedidos = pedidos.length;
    const totalVolume  = pedidos.reduce((s, o) => s + (o.total || 0), 0);
    const totalAulas   = progressos.length;
    const nivelAtual   = profile.nivel || 'iniciante';
    const nivelIdx     = _NIVEIS.findIndex(n => n.key === nivelAtual);
    const nivelObj     = _NIVEIS[nivelIdx];
    const proximo      = _NIVEIS[nivelIdx + 1] || null;

    el.innerHTML = _buildJornadaHTML({ profile, nivelAtual, nivelIdx, nivelObj, proximo, totalPedidos, totalVolume, totalAulas });

    // Anima barra
    setTimeout(() => {
      el.querySelectorAll('.j-prog-fill').forEach(b => { b.style.width = b.dataset.pct + '%'; });
    }, 120);

    // Accordion
    el.querySelectorAll('.j-benef-header').forEach(btn => {
      btn.addEventListener('click', () => btn.closest('.j-benef-card').classList.toggle('open'));
    });

  } catch (err) {
    el.innerHTML = `<div class="jornada-loading"><p style="color:#C0A8B8">⚠️ Erro ao carregar jornada.</p><button onclick="renderJornada()" style="margin-top:8px;padding:10px 20px;background:#3D0E20;color:#C8A96E;border:none;border-radius:10px;cursor:pointer;font-family:'DM Sans',sans-serif">Tentar novamente</button></div>`;
    console.error('[Jornada]', err);
  }
}

function _buildJornadaHTML({ profile, nivelAtual, nivelIdx, nivelObj, proximo, totalPedidos, totalVolume, totalAulas }) {
  const prxMin  = proximo ? proximo.minPedidos : nivelObj.minPedidos;
  const faltam  = proximo ? Math.max(0, prxMin - totalPedidos) : 0;
  const baseMin = nivelObj.minPedidos;
  const pct     = proximo
    ? Math.min(100, prxMin === baseMin ? 100 : Math.round(((totalPedidos - baseMin) / (prxMin - baseMin)) * 100))
    : 100;

  // Timeline
  const tlHTML = _NIVEIS.map((n, i) => {
    const estado = i < nivelIdx ? 'concluido' : i === nivelIdx ? 'atual' : 'bloqueado';
    return `
      <div class="j-tl-item ${estado}" style="--nc:${n.cor}">
        <div class="j-tl-marker">${estado === 'concluido' ? '✓' : n.icon}</div>
        <div class="j-tl-content">
          <div class="j-tl-header">
            <span class="j-tl-nome" style="color:${estado === 'bloqueado' ? '' : n.cor}">${n.icon} ${n.label}</span>
            <span class="j-tl-req">${n.minPedidos === 0 ? 'Início' : n.minPedidos + (n.minPedidos === 1 ? ' pedido' : ' pedidos')}</span>
          </div>
          ${estado === 'atual' ? `
            <div class="j-prog-wrap">
              <div class="j-prog-track"><div class="j-prog-fill" data-pct="${pct}" style="background:${n.cor}"></div></div>
              <span class="j-prog-lbl">${totalPedidos} / ${proximo ? prxMin : totalPedidos} pedidos</span>
            </div>` : ''}
          ${estado === 'bloqueado' ? `<span class="j-tl-lock">🔒 Bloqueado</span>` : ''}
        </div>
      </div>`;
  }).join('');

  // Benefícios (níveis já alcançados, do maior para menor)
  const benefHTML = _NIVEIS.slice(0, nivelIdx + 1).reverse().map(n => `
    <div class="j-benef-card">
      <button class="j-benef-header">
        <span style="color:${n.cor}">${n.icon} ${n.label}</span>
        <span class="j-benef-chevron">▾</span>
      </button>
      <div class="j-benef-body">
        <ul>${n.beneficios.map(b => `<li>✅ ${b}</li>`).join('')}</ul>
      </div>
    </div>`).join('');

  return `
    <div class="jornada-page">

      <div class="j-hero">
        <div class="j-badge">
          <span class="j-badge-icon">${nivelObj.icon}</span>
          <div>
            <div class="j-badge-nivel" style="color:${nivelObj.cor}">${nivelObj.label}</div>
            <div class="j-badge-nome">${profile.full_name || 'Embaixadora'}</div>
          </div>
        </div>
        <p class="j-frase">${_FRASES[nivelAtual]}</p>
      </div>

      <div class="j-stats">
        <div class="j-stat">
          <div class="j-stat-val">${totalPedidos}</div>
          <div class="j-stat-lbl">Pedidos realizados</div>
        </div>
        <div class="j-stat">
          <div class="j-stat-val">${totalAulas}</div>
          <div class="j-stat-lbl">Aulas assistidas</div>
        </div>
        <div class="j-stat">
          <div class="j-stat-val">R$&nbsp;${totalVolume.toLocaleString('pt-BR',{minimumFractionDigits:0})}</div>
          <div class="j-stat-lbl">Volume total</div>
        </div>
      </div>

      <section class="j-section">
        <h2 class="j-title">Sua Jornada</h2>
        <div class="j-timeline">${tlHTML}</div>
      </section>

      <section class="j-section">
        <h2 class="j-title">Benefícios Desbloqueados</h2>
        <div>${benefHTML}</div>
      </section>

      <section class="j-section">
        ${proximo ? `
          <h2 class="j-title">Próximo Passo</h2>
          <div class="j-prox-card" style="--pc:${proximo.cor}">
            <div class="j-prox-icon">${proximo.icon}</div>
            <div>
              <div class="j-prox-titulo">Próximo nível: ${proximo.label}</div>
              <div class="j-prox-desc">Faltam <strong>${faltam} pedido${faltam !== 1 ? 's' : ''}</strong> para você ser ${proximo.label}!</div>
            </div>
          </div>
          <div class="j-prox-acoes">
            <button class="j-btn j-btn-p" onclick="irAba('vitrine')">🛍️ Ver Vitrine</button>
            <button class="j-btn j-btn-s" onclick="irAba('capacitacao')">📚 Capacitação</button>
          </div>
        ` : `
          <div class="j-prox-card j-diamante-card" style="--pc:#B9F2FF">
            <div class="j-prox-icon">💎</div>
            <div>
              <div class="j-prox-titulo" style="color:#B9F2FF">Você é Diamante!</div>
              <div class="j-prox-desc">Parabéns! Você atingiu o nível máximo da IRES. Continue brilhando! ✨</div>
            </div>
          </div>
        `}
      </section>

    </div>`;
}

// ============================================================
// IRES Embaixadoras — Aba "Informações" (v1)
// Guia completo da plataforma para embaixadoras
// ============================================================

function renderInformacoes() {
  const el = document.getElementById('conteudo');

  el.innerHTML = _informacoesHTML();

  // Injeta estilos
  _injectInfoCSS();

  // Accordion
  el.querySelectorAll('.info-acc-hdr').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.info-acc-card');
      const isOpen = card.classList.contains('open');
      // Fecha todos
      el.querySelectorAll('.info-acc-card').forEach(c => c.classList.remove('open'));
      // Abre o clicado (toggle)
      if (!isOpen) card.classList.add('open');
    });
  });

  // FAQ accordion interno
  el.querySelectorAll('.info-faq-hdr').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.info-faq-item').classList.toggle('open');
    });
  });

  // Animação de entrada
  el.querySelectorAll('.info-animate').forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    setTimeout(() => {
      el.style.transition = 'opacity .35s ease, transform .35s ease';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 60 + i * 50);
  });
}

function _informacoesHTML() {
  const secoes = [
    {
      id: 'plataforma',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
      titulo: 'Como funciona a plataforma',
      cor: '#5c1a2e',
      corBg: 'rgba(92,26,46,.08)',
      conteudo: `
        <div class="info-bloco">
          <p>A plataforma IRES Embaixadoras é um portal exclusivo para revendedoras cadastradas. Aqui você acessa o catálogo completo, faz pedidos de revenda, acompanha sua jornada de crescimento e se capacita com os módulos de treinamento.</p>
        </div>
        <div class="info-bloco">
          <div class="info-bloco-titulo">Acesso</div>
          <div class="info-item-list">
            <div class="info-item"><span class="info-dot"></span>O acesso à plataforma custa <strong>R$49,90</strong> — pagamento único pela IRES School</div>
            <div class="info-item"><span class="info-dot"></span>Após o pagamento e aprovação, você recebe login e senha por WhatsApp</div>
            <div class="info-item"><span class="info-dot"></span>O acesso é individual e intransferível</div>
            <div class="info-item"><span class="info-dot"></span>Disponível pelo celular ou computador, direto no navegador</div>
          </div>
        </div>
        <div class="info-bloco">
          <div class="info-bloco-titulo">O que você encontra aqui</div>
          <div class="info-chips">
            <span class="info-chip">🛍️ Vitrine de produtos</span>
            <span class="info-chip">📦 Acompanhamento de pedidos</span>
            <span class="info-chip">🎓 Capacitação em vídeo</span>
            <span class="info-chip">🖼️ Criativos profissionais</span>
            <span class="info-chip">🏆 Jornada de níveis</span>
            <span class="info-chip">📢 Avisos e comunicados</span>
            <span class="info-chip">💬 Suporte direto</span>
          </div>
        </div>
      `
    },
    {
      id: 'pedidos',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`,
      titulo: 'Pedidos',
      cor: '#8c5e38',
      corBg: 'rgba(140,94,56,.08)',
      conteudo: `
        <div class="info-bloco">
          <div class="info-bloco-titulo">Pedido mínimo</div>
          <div class="info-destaque">
            <div class="info-destaque-val">R$ 300,00</div>
            <div class="info-destaque-desc">valor mínimo por pedido de revenda</div>
          </div>
          <p style="font-size:13px;color:var(--nb-text-low);line-height:1.6;margin-top:10px">Pedidos abaixo desse valor não são processados. Planeje sua compra pensando nos produtos que têm mais saída com suas clientes.</p>
        </div>
        <div class="info-bloco">
          <div class="info-bloco-titulo">Como fazer um pedido</div>
          <div class="info-steps">
            <div class="info-step"><div class="info-step-num">1</div><div>Acesse a <button class="info-btn-link" onclick="irAba('vitrine')">Vitrine</button> e adicione produtos ao carrinho</div></div>
            <div class="info-step"><div class="info-step-num">2</div><div>Revise os itens e o valor total (mín. R$300)</div></div>
            <div class="info-step"><div class="info-step-num">3</div><div>Confirme seu endereço de entrega</div></div>
            <div class="info-step"><div class="info-step-num">4</div><div>Escolha a forma de pagamento e finalize</div></div>
            <div class="info-step"><div class="info-step-num">5</div><div>Acompanhe o status em <button class="info-btn-link" onclick="irAba('pedidos')">Meus Pedidos</button></div></div>
          </div>
        </div>
        <div class="info-bloco">
          <div class="info-bloco-titulo">Status dos pedidos</div>
          <div class="info-status-list">
            <div class="info-status-item"><span class="info-badge badge-amber">Pendente</span><span>Aguardando confirmação de pagamento</span></div>
            <div class="info-status-item"><span class="info-badge badge-blue">Processando</span><span>Pagamento confirmado, separando</span></div>
            <div class="info-status-item"><span class="info-badge badge-purple">Enviado</span><span>A caminho — código de rastreio disponível</span></div>
            <div class="info-status-item"><span class="info-badge badge-green">Entregue</span><span>Recebido com sucesso</span></div>
          </div>
        </div>
        <div class="info-bloco">
          <div class="info-bloco-titulo">Frete</div>
          <div class="info-item-list">
            <div class="info-item"><span class="info-dot"></span>Calculado por CEP no momento do pedido</div>
            <div class="info-item"><span class="info-dot"></span>Embaixadoras Ouro têm subsídio parcial no frete</div>
            <div class="info-item"><span class="info-dot"></span>Embaixadoras Diamante têm frete grátis com meta mínima</div>
          </div>
        </div>
      `
    },
    {
      id: 'jornada',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0012 0V2z"/></svg>`,
      titulo: 'Jornada & Níveis',
      cor: '#7A7D82',
      corBg: 'rgba(122,125,130,.08)',
      conteudo: `
        <div class="info-bloco">
          <p>Quanto mais você cresce, mais benefícios desbloqueia. A progressão é automática — basta atingir o número de compras de cada nível.</p>
        </div>
        <div class="info-niveis">
          <div class="info-nivel-item">
            <div class="info-nivel-badge" style="background:rgba(139,139,139,.12);border-color:rgba(139,139,139,.3)">🎯</div>
            <div class="info-nivel-body">
              <div class="info-nivel-nome">Iniciante</div>
              <div class="info-nivel-req">Cadastro na plataforma</div>
              <div class="info-nivel-benef">Vitrine, criativos e vídeos institucionais</div>
            </div>
          </div>
          <div class="info-nivel-item">
            <div class="info-nivel-badge" style="background:rgba(160,114,60,.12);border-color:rgba(160,114,60,.3)">🥉</div>
            <div class="info-nivel-body">
              <div class="info-nivel-nome">Bronze</div>
              <div class="info-nivel-req">1 compra mínima de R$300</div>
              <div class="info-nivel-benef">Treinamentos completos + Grupo WhatsApp Bronze + Criativos em vídeo</div>
            </div>
          </div>
          <div class="info-nivel-item">
            <div class="info-nivel-badge" style="background:rgba(122,125,130,.12);border-color:rgba(122,125,130,.3)">🥈</div>
            <div class="info-nivel-body">
              <div class="info-nivel-nome">Prata</div>
              <div class="info-nivel-req">3 compras mínimas de R$300</div>
              <div class="info-nivel-benef">Mentoria em grupo mensal + 5% desconto + Acesso antecipado a lançamentos</div>
            </div>
          </div>
          <div class="info-nivel-item">
            <div class="info-nivel-badge" style="background:rgba(140,94,56,.12);border-color:rgba(140,94,56,.3)">🥇</div>
            <div class="info-nivel-body">
              <div class="info-nivel-nome">Ouro</div>
              <div class="info-nivel-req">5 compras + ativa a cada 3 meses</div>
              <div class="info-nivel-benef">Mentoria individual mensal + 10% desconto + Frete subsidiado + Kit de vendas</div>
            </div>
          </div>
          <div class="info-nivel-item" style="border-bottom:none">
            <div class="info-nivel-badge" style="background:rgba(42,80,128,.12);border-color:rgba(42,80,128,.3)">💎</div>
            <div class="info-nivel-body">
              <div class="info-nivel-nome">Diamante</div>
              <div class="info-nivel-req">10 compras + ativa a cada 2 meses</div>
              <div class="info-nivel-benef">Mentoria individual + 15% desconto + Frete grátis + Grupo VIP Elite + Abertura de equipe</div>
            </div>
          </div>
        </div>
        <div class="info-bloco" style="margin-top:12px">
          <p style="font-size:12px;color:var(--nb-text-low);line-height:1.6">Acompanhe seu progresso em tempo real na aba <button class="info-btn-link" onclick="irAba('jornada')">Jornada</button>. O nível é atualizado automaticamente conforme seus pedidos são registrados.</p>
        </div>
      `
    },
    {
      id: 'capacitacao',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
      titulo: 'Capacitação',
      cor: '#2a5080',
      corBg: 'rgba(42,80,128,.08)',
      conteudo: `
        <div class="info-bloco">
          <p>A IRES School é a escola de capacitação para embaixadoras. Os módulos são desbloqueados conforme você avança de nível — quanto mais você cresce, mais conteúdo exclusivo você acessa.</p>
        </div>
        <div class="info-bloco">
          <div class="info-bloco-titulo">Módulos por nível</div>
          <div class="info-item-list">
            <div class="info-item"><span class="info-icon-sm">🎯</span><strong>Módulo 1 (Iniciante)</strong> — Comece aqui: primeiros passos na revenda IRES</div>
            <div class="info-item"><span class="info-icon-sm">🥉</span><strong>Módulo 2 (Bronze)</strong> — Vendas na prática, Instagram que vende, mentalidade e constância</div>
            <div class="info-item"><span class="info-icon-sm">🥈</span><strong>Módulo 3 (Prata)</strong> — Venda para quem já comprou, fidelize clientes, venda mais todo dia</div>
            <div class="info-item"><span class="info-icon-sm">🥇</span><strong>Módulo 4 (Ouro)</strong> — Profissionalização, gestão financeira, posicionamento de marca pessoal</div>
            <div class="info-item"><span class="info-icon-sm">💎</span><strong>Módulo 5 (Diamante)</strong> — Construção de equipe, liderança, escala e multiplicação</div>
          </div>
        </div>
        <div class="info-bloco">
          <div class="info-bloco-titulo">Aulas bônus</div>
          <div class="info-item-list">
            <div class="info-item"><span class="info-icon-sm">⭐</span>Aulas extras liberadas pelo admin para embaixadoras selecionadas</div>
            <div class="info-item"><span class="info-icon-sm">⭐</span>Conteúdo exclusivo sem requisito de nível — concessão manual</div>
            <div class="info-item"><span class="info-icon-sm">⭐</span>Aparece automaticamente na Capacitação quando ativado</div>
          </div>
        </div>
        <div class="info-bloco">
          <p style="font-size:12px;color:var(--nb-text-low);line-height:1.6">Acesse os vídeos a qualquer momento na aba <button class="info-btn-link" onclick="irAba('capacitacao')">Capacitação</button>. Seu progresso é salvo automaticamente.</p>
        </div>
      `
    },
    {
      id: 'criativos',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
      titulo: 'Criativos',
      cor: '#5c1a2e',
      corBg: 'rgba(92,26,46,.08)',
      conteudo: `
        <div class="info-bloco">
          <p>Os criativos são fotos e vídeos profissionais da IRES disponíveis para você usar nas suas redes sociais e no WhatsApp. Tudo pronto para divulgar os produtos sem precisar produzir conteúdo do zero.</p>
        </div>
        <div class="info-bloco">
          <div class="info-bloco-titulo">Como usar</div>
          <div class="info-steps">
            <div class="info-step"><div class="info-step-num">1</div><div>Acesse a aba <button class="info-btn-link" onclick="irAba('criativos')">Criativos</button></div></div>
            <div class="info-step"><div class="info-step-num">2</div><div>Navegue pelas coleções de fotos e vídeos</div></div>
            <div class="info-step"><div class="info-step-num">3</div><div>Toque na imagem ou vídeo para abrir</div></div>
            <div class="info-step"><div class="info-step-num">4</div><div>Faça o download e publique nas suas redes</div></div>
          </div>
        </div>
        <div class="info-bloco">
          <div class="info-bloco-titulo">Dicas de uso</div>
          <div class="info-item-list">
            <div class="info-item"><span class="info-dot"></span>Use nos Stories do Instagram para chamar atenção</div>
            <div class="info-item"><span class="info-dot"></span>Envie no WhatsApp direto para clientes potenciais</div>
            <div class="info-item"><span class="info-dot"></span>Combine criativos com os roteiros dos módulos de capacitação</div>
            <div class="info-item"><span class="info-dot"></span>Novos criativos são adicionados a cada coleção lançada</div>
          </div>
        </div>
      `
    },
    {
      id: 'faq',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      titulo: 'Dúvidas frequentes',
      cor: '#8c5e38',
      corBg: 'rgba(140,94,56,.08)',
      conteudo: `
        <div class="info-faq-list">
          ${[
            {
              p: 'Posso comprar qualquer quantidade de produtos?',
              r: 'Sim, mas o valor mínimo por pedido é de R$300. Você pode escolher os produtos que quiser na Vitrine, desde que o total do carrinho atinja esse valor.'
            },
            {
              p: 'Como meu nível é atualizado?',
              r: 'Automaticamente. Quando seus pedidos pagos atingem o mínimo de compras do próximo nível, o sistema atualiza sua posição. Você recebe a confirmação no painel.'
            },
            {
              p: 'O nível pode cair?',
              r: 'Os níveis Ouro e Diamante exigem que você permaneça ativa (comprando dentro do prazo). Ouro: compra a cada 3 meses. Diamante: compra a cada 2 meses. Os demais níveis não têm prazo de manutenção.'
            },
            {
              p: 'Posso revender para qualquer pessoa?',
              r: 'Sim. Você compra os produtos pelo preço de atacado da IRES e define seu próprio preço de venda para suas clientes. Sua margem é a diferença entre o que você cobra e o que você pagou.'
            },
            {
              p: 'Como funciona a mentoria?',
              r: 'A partir do nível Prata, você tem acesso a mentorias em grupo com a Vivi — 1 hora por mês. No nível Ouro, a mentoria é individual (1h mensal). No Diamante, também é individual e mensal, com foco em equipe e escala.'
            },
            {
              p: 'Posso montar minha própria equipe?',
              r: 'Sim, a partir do nível Diamante. Você pode convidar outras mulheres para se tornarem revendedoras e ganhar comissões sobre as compras da sua equipe (5% da equipe direta e 2% da indireta).'
            },
            {
              p: 'Os criativos têm custo adicional?',
              r: 'Não. Todos os criativos de fotos e vídeos profissionais estão inclusos no seu acesso à plataforma, sem custo extra.'
            },
            {
              p: 'Esqueci minha senha. O que faço?',
              r: 'Na tela de login, clique em "Esqueci minha senha". Você receberá um link de redefinição no e-mail cadastrado. Se tiver dificuldade, entre em contato pelo Suporte.'
            },
            {
              p: 'Como falo com o suporte?',
              r: 'Pela aba Suporte aqui no painel. Você pode enviar sua dúvida por texto. O atendimento é feito pela equipe IRES, geralmente em até 24h úteis.'
            },
          ].map(f => `
            <div class="info-faq-item">
              <button class="info-faq-hdr">
                <span>${f.p}</span>
                <svg class="info-faq-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="info-faq-body"><p>${f.r}</p></div>
            </div>
          `).join('')}
        </div>
      `
    },
  ];

  const secoesHTML = secoes.map((s, i) => `
    <div class="info-acc-card info-animate ${i === 0 ? 'open' : ''}" style="--ic:${s.cor};--ic-bg:${s.corBg}">
      <button class="info-acc-hdr">
        <div class="info-acc-hdr-left">
          <div class="info-acc-ico">${s.icon}</div>
          <span class="info-acc-titulo">${s.titulo}</span>
        </div>
        <svg class="info-acc-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="info-acc-body">${s.conteudo}</div>
    </div>
  `).join('');

  return `
    <div class="info-page">

      <!-- Hero -->
      <div class="info-hero info-animate">
        <div class="info-hero-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ouro)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <div>
          <div class="info-hero-titulo">Central de Informações</div>
          <div class="info-hero-sub">Tudo que você precisa saber sobre a plataforma IRES</div>
        </div>
      </div>

      <!-- Seções accordion -->
      <div class="info-sections">
        ${secoesHTML}
      </div>

      <!-- Contato -->
      <div class="info-contato info-animate">
        <div class="info-contato-txt">
          <div class="info-contato-titulo">Ainda tem dúvidas?</div>
          <div class="info-contato-sub">Nossa equipe responde em até 24h úteis</div>
        </div>
        <button class="info-contato-btn" onclick="irAba('suporte')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          Falar com suporte
        </button>
      </div>

    </div>`;
}

function _injectInfoCSS() {
  if (document.getElementById('info-css')) return;
  const s = document.createElement('style');
  s.id = 'info-css';
  s.textContent = `
.info-page{padding:0 0 100px}

/* Hero */
.info-hero{display:flex;align-items:center;gap:14px;background:var(--nb-card);border:0.5px solid var(--nb-border-s);border-radius:16px;padding:18px 20px;margin-bottom:16px}
.info-hero-icon{width:48px;height:48px;border-radius:14px;background:rgba(212,168,118,.12);border:0.5px solid rgba(212,168,118,.3);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.info-hero-titulo{font-size:16px;font-weight:800;color:var(--nb-text-hi);letter-spacing:-.2px}
.info-hero-sub{font-size:12px;color:var(--nb-text-low);margin-top:2px;line-height:1.4}

/* Sections */
.info-sections{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}

/* Accordion */
.info-acc-card{background:var(--nb-card);border:0.5px solid var(--nb-border-s);border-radius:14px;overflow:hidden}
.info-acc-hdr{width:100%;background:none;border:none;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-family:var(--font);text-align:left}
.info-acc-hdr-left{display:flex;align-items:center;gap:10px}
.info-acc-ico{width:32px;height:32px;border-radius:9px;background:var(--ic-bg);border:0.5px solid color-mix(in srgb, var(--ic) 30%, transparent);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--ic)}
.info-acc-titulo{font-size:14px;font-weight:700;color:var(--nb-text-hi)}
.info-acc-chevron{transition:transform .25s;color:var(--nb-text-low);flex-shrink:0}
.info-acc-card.open .info-acc-chevron{transform:rotate(180deg)}
.info-acc-body{max-height:0;overflow:hidden;transition:max-height .4s ease}
.info-acc-card.open .info-acc-body{max-height:2000px}

/* Blocos internos */
.info-bloco{padding:0 16px 14px}
.info-bloco:first-child{padding-top:4px;border-top:0.5px solid var(--nb-border)}
.info-bloco p{font-size:13px;color:var(--nb-text-mid);line-height:1.6}
.info-bloco-titulo{font-size:10px;font-weight:700;color:var(--ic);text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px}

/* Items list */
.info-item-list{display:flex;flex-direction:column;gap:6px}
.info-item{display:flex;align-items:flex-start;gap:8px;font-size:13px;color:var(--nb-text-mid);line-height:1.5}
.info-dot{width:5px;height:5px;border-radius:50%;background:var(--ic);margin-top:7px;flex-shrink:0;opacity:.7}
.info-icon-sm{font-size:14px;flex-shrink:0;margin-top:1px}

/* Destaque (valor mínimo) */
.info-destaque{display:inline-flex;align-items:baseline;gap:8px;background:var(--ic-bg);border:0.5px solid color-mix(in srgb, var(--ic) 25%, transparent);border-radius:10px;padding:10px 16px}
.info-destaque-val{font-size:22px;font-weight:800;color:var(--ic);letter-spacing:-.5px}
.info-destaque-desc{font-size:11px;color:var(--nb-text-low)}

/* Steps */
.info-steps{display:flex;flex-direction:column;gap:8px}
.info-step{display:flex;align-items:flex-start;gap:10px;font-size:13px;color:var(--nb-text-mid);line-height:1.5}
.info-step-num{width:22px;height:22px;border-radius:50%;background:var(--ic-bg);border:0.5px solid color-mix(in srgb, var(--ic) 30%, transparent);color:var(--ic);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}

/* Chips */
.info-chips{display:flex;flex-wrap:wrap;gap:6px}
.info-chip{font-size:11px;font-weight:500;color:var(--nb-text-mid);background:var(--nb-inset);border:0.5px solid var(--nb-border);border-radius:20px;padding:5px 10px}

/* Status badges */
.info-status-list{display:flex;flex-direction:column;gap:8px}
.info-status-item{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--nb-text-mid)}
.info-badge{font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;flex-shrink:0;letter-spacing:.2px}
.badge-amber{background:rgba(212,168,118,.15);color:#8c5e38;border:0.5px solid rgba(212,168,118,.4)}
.badge-blue{background:rgba(42,80,128,.1);color:#2a5080;border:0.5px solid rgba(42,80,128,.3)}
.badge-purple{background:rgba(92,26,46,.1);color:#5c1a2e;border:0.5px solid rgba(92,26,46,.25)}
.badge-green{background:rgba(34,120,70,.1);color:#1a6b40;border:0.5px solid rgba(34,120,70,.3)}

/* Níveis */
.info-niveis{border:0.5px solid var(--nb-border);border-radius:12px;overflow:hidden;margin-bottom:4px}
.info-nivel-item{display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border-bottom:0.5px solid var(--nb-border)}
.info-nivel-badge{width:34px;height:34px;border-radius:10px;border:0.5px solid;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.info-nivel-body{flex:1;min-width:0}
.info-nivel-nome{font-size:13px;font-weight:700;color:var(--nb-text-hi)}
.info-nivel-req{font-size:11px;color:var(--nb-text-low);margin-top:2px}
.info-nivel-benef{font-size:12px;color:var(--nb-text-mid);margin-top:4px;line-height:1.4}

/* FAQ */
.info-faq-list{padding:0 0 4px}
.info-faq-item{border-bottom:0.5px solid var(--nb-border)}
.info-faq-item:first-child{border-top:0.5px solid var(--nb-border)}
.info-faq-hdr{width:100%;background:none;border:none;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px;cursor:pointer;font-family:var(--font);font-size:13px;font-weight:600;color:var(--nb-text-hi);text-align:left;line-height:1.4}
.info-faq-chevron{transition:transform .2s;color:var(--nb-text-low);flex-shrink:0}
.info-faq-item.open .info-faq-chevron{transform:rotate(180deg)}
.info-faq-body{max-height:0;overflow:hidden;transition:max-height .3s ease}
.info-faq-item.open .info-faq-body{max-height:300px}
.info-faq-body p{font-size:13px;color:var(--nb-text-low);line-height:1.6;padding:0 16px 14px}

/* Link button inline */
.info-btn-link{background:none;border:none;color:var(--nb-burg);font-weight:700;font-family:var(--font);font-size:inherit;cursor:pointer;padding:0;text-decoration:underline}

/* Contato */
.info-contato{background:var(--nb-card);border:0.5px solid var(--nb-border-s);border-radius:14px;padding:16px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.info-contato-titulo{font-size:14px;font-weight:700;color:var(--nb-text-hi)}
.info-contato-sub{font-size:11px;color:var(--nb-text-low);margin-top:2px}
.info-contato-btn{display:flex;align-items:center;gap:6px;background:var(--nb-burg);color:var(--ouro-cl);border:none;border-radius:10px;padding:10px 14px;font-size:12px;font-weight:700;cursor:pointer;font-family:var(--font);white-space:nowrap;flex-shrink:0}

/* Animate */
.info-animate{transition:opacity .35s ease, transform .35s ease}

@media(min-width:768px){
  .info-page{max-width:620px;margin:0 auto;padding-top:10px}
}
`;
  document.head.appendChild(s);
}

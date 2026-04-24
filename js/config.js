// ============================================
// IRES EMBAIXADORAS — Configuração central
// Edite apenas este arquivo para mudar as
// credenciais do Supabase.
// ============================================

const IRES_CONFIG = {
  supabaseUrl:  'https://cqhcbbrpxytpybgnpxys.supabase.co',
  supabaseKey:  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxaGNiYnJweHl0cHliZ25weHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MjAxOTgsImV4cCI6MjA5MjA5NjE5OH0.UP99BYcl_lgOn071gL1TEOufjjFb_eQ4b1yHieLXJXg',
  appName:      'IRES Embaixadoras',
  appUrl:       'https://seudominio.com.br', // atualizar após comprar o domínio
};

// ── Inicializa o cliente Supabase ──
const { createClient } = supabase;
const _supabase = createClient(IRES_CONFIG.supabaseUrl, IRES_CONFIG.supabaseKey);

// ── Toast global ── (disponível em todas as páginas)
function showToast(msg, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<div class="toast-dot"></div><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ── Helper: formata status do pedido ──
function statusLabel(status) {
  const map = {
    pending:    { label: 'Pendente',    cls: 'pill-gray'  },
    paid:       { label: 'Pago',        cls: 'pill-amber' },
    processing: { label: 'Em processo', cls: 'pill-blue'  },
    shipped:    { label: 'Enviado',     cls: 'pill-blue'  },
    delivered:  { label: 'Entregue',    cls: 'pill-green' },
    cancelled:  { label: 'Cancelado',   cls: 'pill-red'   },
  };
  const s = map[status] || { label: status, cls: 'pill-gray' };
  return `<span class="pill ${s.cls}">${s.label}</span>`;
}

// ── Helper: formata moeda BRL ──
function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL'
  }).format(value);
}

// ── Helper: iniciais do nome ──
function initials(name) {
  if (!name) return '?';
  return name.trim().split(' ')
    .filter(Boolean).slice(0, 2)
    .map(w => w[0].toUpperCase()).join('');
}

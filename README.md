# IRES Embaixadoras — Painel de Revendedoras

Plataforma white-label para gestão de embaixadoras/revendedoras da marca **IRES**. Sistema completo com vitrine de produtos, pedidos, capacitação em vídeo, criativos para redes sociais e painel administrativo.

**Produção:** [iresembaixadoras.com.br](https://iresembaixadoras.com.br)

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | HTML + CSS + Vanilla JS (sem build step) |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions) |
| Pagamentos | Asaas (PIX + Cartão) |
| Frete | Melhor Envio (cotação + etiqueta automática) |
| Automação | n8n (webhooks de pagamento, notificações) |
| Deploy | GitHub → Cloudflare Pages (CNAME) |

---

## Estrutura

```
/
├── index.html          # Login / cadastro
├── painel.html         # Painel da embaixadora
├── admin.html          # Painel administrativo
├── carrinho.html       # Checkout (PIX/cartão + frete)
├── nova-senha.html     # Redefinição de senha
├── aguardando.html     # Aguardando aprovação
├── cadastro.html       # Formulário de cadastro
├── comunidade.html     # Comunidade / depoimentos
├── js/
│   ├── config.js       # Config Supabase + utilitários globais
│   ├── auth.js         # Autenticação + carrinho + checkout
│   ├── painel.js       # Painel da embaixadora (vitrine, pedidos, capacitação, criativos)
│   ├── admin.js        # Painel admin (embaixadoras, produtos, módulos, pedidos)
│   ├── carrinho.js     # Fluxo de checkout
│   └── jornada.js      # Jornada / onboarding
├── css/
│   └── style.css       # Estilos globais
└── supabase/
    └── functions/      # Edge Functions (Deno)
        ├── melhorenvio-callback/   # OAuth Melhor Envio
        ├── melhorenvio-cotacao/    # Cotação de frete
        └── melhorenvio-etiqueta/   # Geração de etiqueta
```

---

## Funcionalidades

### Embaixadora
- **Vitrine** — catálogo de produtos com variações (cor × tamanho), carrinho e checkout
- **Pedidos** — histórico com rastreamento e status em tempo real
- **Capacitação** — módulos de vídeo com sistema de níveis e progresso
- **Criativos** — banco de imagens/vídeos para redes sociais, com download
- **Perfil** — dados pessoais, endereço e foto
- **Jornada** — onboarding guiado

### Admin
- **Dashboard** — métricas (receita, pedidos, embaixadoras ativas)
- **Embaixadoras** — aprovar, suspender, alterar nível manualmente
- **Produtos** — CRUD completo com variações, imagens e categorias
- **Pedidos** — gestão com geração de etiqueta Melhor Envio
- **Capacitação** — módulos, sub-módulos, aulas com upload de capa e controle de nível
- **Criativos** — upload e organização por formato (story, feed, reels)

### Sistema de Níveis
| Nível | Pedidos pagos | Acesso |
|---|---|---|
| 🟢 Iniciante | 0 | Módulo 1 |
| 🟤 Bronze | 4 | Módulos 1–2 |
| ⚪ Prata | 8 | Módulos 1–3 |
| 🟡 Ouro | 14 | Módulos 1–4 |
| 💎 Diamante | 20 | Acesso total |

---

## Banco de Dados (Supabase)

Projeto: `cqhcbbrpxytpybgnpxys` (sa-east-1)

Tabelas principais: `profiles`, `products`, `categories`, `orders`, `order_items`, `modules`, `submodules`, `lessons`, `lesson_progress`, `creatives`, `notifications`, `app_secrets`

Row Level Security ativado em todas as tabelas.

---

## Deploy

O deploy é automático via **Cloudflare Pages** conectado a este repositório. Qualquer push na branch `main` dispara o deploy em ~30 segundos.

```bash
git push origin main  # deploy automático
```

---

## Variáveis de ambiente

Não há variáveis de ambiente no frontend — as chaves públicas do Supabase (anon key) ficam em `js/config.js`. Secrets de integração (Melhor Envio, Asaas) ficam nas Edge Functions do Supabase como `Deno.env`.

**Nunca commitar:**
- Tokens de acesso
- Service role key
- Chaves privadas de pagamento

---

## Edge Functions

| Função | Descrição |
|---|---|
| `melhorenvio-callback` | OAuth flow — salva access/refresh token |
| `melhorenvio-cotacao` | Calcula opções de frete por CEP |
| `melhorenvio-etiqueta` | Gera etiqueta e faz checkout no carrinho ME |

Deploy manual via Supabase CLI ou dashboard.

---

## Integrações externas

- **Asaas** — pagamentos PIX e cartão de crédito
- **Melhor Envio** — cotação e geração de etiquetas (token expira 30 dias — renovar em `/functions/v1/melhorenvio-callback`)
- **n8n** — automações em `webhook.ruahsystems.com.br`
- **ViaCEP** — preenchimento automático de endereço

---

## Manutenção

### Renovar token Melhor Envio
Acesse: `https://cqhcbbrpxytpybgnpxys.supabase.co/functions/v1/melhorenvio-callback`

### Adicionar produto
Admin → Produtos → Novo produto

### Criar módulo de capacitação
Admin → Capacitação → + Módulo → + Sub-módulo → + Aula

---

*Desenvolvido para IRES Revenda. Todos os direitos reservados.*

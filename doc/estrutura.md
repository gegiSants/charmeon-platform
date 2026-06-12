# Estrutura do repositório

Mapa objetivo de pastas e arquivos do CharmeOn Platform.

---

## Raiz

| Arquivo / pasta | Para que serve |
|-----------------|----------------|
| `package.json` | Dependências e scripts npm |
| `package-lock.json` | Lock de versões npm |
| `vite.config.ts` | Configuração do Vite (build, alias `@/`) |
| `tsconfig.json` | TypeScript — config base |
| `tsconfig.app.json` | TypeScript — app React |
| `tsconfig.node.json` | TypeScript — scripts Node (Vite) |
| `tailwind.config.ts` | Tema Tailwind + tokens shadcn |
| `postcss.config.js` | PostCSS (Tailwind + Autoprefixer) |
| `eslint.config.js` | Regras ESLint |
| `components.json` | Config do shadcn/ui |
| `index.html` | HTML base da SPA |
| `.env.example` | Template de variáveis de ambiente |
| `.gitignore` | Arquivos ignorados pelo Git |
| `.nvmrc` | Versão Node recomendada |
| `vercel.json` | Config de deploy na Vercel |
| `_redirects` | Redirects SPA (Netlify-style) |
| `README.md` | Visão geral do projeto |

---

## `src/` — Frontend React

### `src/pages/` — Páginas (rotas)

| Arquivo | Rota | Função |
|---------|------|--------|
| `Index.tsx` | `/` | Landing page do estúdio |
| `Booking.tsx` | `/agendar` | Fluxo de agendamento (serviço, data, horário) |
| `Payment.tsx` | `/pagamento` | Escolha sinal/total + inicia pagamento |
| `PixPayment.tsx` | `/pagamento-pix` | Exibe QR Code PIX |
| `PaymentSuccess.tsx` | `/pagamento-sucesso` | Página pós-pagamento |
| `ConfirmAppointment.tsx` | `/confirmar` | Confirma/cancela via link do e-mail |
| `Catalog.tsx` | `/catalogo` | Catálogo público de serviços |
| `Admin.tsx` | `/admin` | Painel CRUD (profissionais, agenda, etc.) |
| `AdminLogin.tsx` | `/admin/login` | Login do painel admin |
| `NotFound.tsx` | `*` | Página 404 |

### `src/components/` — Componentes reutilizáveis

| Arquivo | Função |
|---------|--------|
| `Header.tsx` | Cabeçalho + navegação |
| `Footer.tsx` | Rodapé com contato |
| `ProfessionalCard.tsx` | Card de profissional |
| `ServiceCard.tsx` | Card de serviço |
| `ServiceCatalogCard.tsx` | Card do catálogo |
| `TimeSlotButton.tsx` | Botão de horário disponível |
| `StudioInfo.tsx` | Informações do estúdio |
| `NavLink.tsx` | Link de navegação |
| `AdminAuthGuard.tsx` | Protege `/admin` — exige login + admin |

### `src/components/ui/` — shadcn/ui

Componentes de interface prontos (Button, Card, Dialog, Table, etc.). Gerados pelo shadcn — não editar manualmente sem necessidade.

### `src/hooks/`

| Arquivo | Função |
|---------|--------|
| `useAppointments.ts` | Profissionais, serviços, slots, criar agendamento |
| `use-toast.ts` | Hook de toast (re-export) |
| `use-mobile.tsx` | Detecta viewport mobile |

### `src/integrations/supabase/`

| Arquivo | Função |
|---------|--------|
| `client.ts` | Cliente Supabase (env vars) |
| `types.ts` | Tipos gerados do schema PostgreSQL |

### `src/data/`

| Arquivo | Função |
|---------|--------|
| `mockData.ts` | Dados estáticos/fallback (home) |

### `src/lib/`

| Arquivo | Função |
|---------|--------|
| `utils.ts` | Utilitário `cn()` (clsx + tailwind-merge) |

### Outros em `src/`

| Arquivo | Função |
|---------|--------|
| `App.tsx` | Rotas e providers |
| `main.tsx` | Entry point React |
| `index.css` | Estilos globais + CSS variables |
| `App.css` | Estilos legados |
| `vite-env.d.ts` | Tipos Vite |

---

## `public/` — Assets estáticos

| Arquivo | Função |
|---------|--------|
| `favicon.svg` | Ícone do site |
| `robots.txt` | Regras para crawlers (bloqueia `/admin`) |

---

## `supabase/` — Backend

> **Schema SQL não é versionado neste repositório.** Migrations e políticas de storage ficam apenas no projeto Supabase (privado). Ver [arquitetura.md](./arquitetura.md).

### `supabase/functions/` — Edge Functions (Deno)

| Pasta | Função |
|-------|--------|
| `_shared/cors.ts` | CORS restrito por origem |
| `_shared/auth.ts` | Validação webhook/cron secrets |
| `_shared/tokens.ts` | Tokens HMAC de confirmação |
| `create-checkout/` | Pagamento PIX MP |
| `create-payment-mp/` | Checkout MP |
| `verify-payment-mp/` | Verifica MP + n8n |
| `verify-payment/` | Stripe (legado) |
| `get-pix-qrcode/` | PIX Stripe (legado) |
| `send-email-confirmation/` | E-mail Resend |
| `email-webhook/` | Confirmação por link/e-mail |
| `check-upcoming-appointments/` | Cron de lembretes |

### Outros em `supabase/`

| Arquivo | Função |
|---------|--------|
| `config.toml` | Config local Supabase CLI (sem project ID real) |

**Não versionados (gitignored):** `migrations/`, `storage_policies.sql`

---

## `doc/` — Documentação

Esta pasta. Ver [README.md](./README.md).

---

## Scripts de teste (raiz)

| Arquivo | Função |
|---------|--------|
| `test-webhook-n8n.sh` | Testa webhook n8n (bash) |
| `test-webhook-n8n.ps1` | Testa webhook n8n (PowerShell) |
| `test-webhook-n8n.bat` | Testa webhook n8n (Windows) |

**Nota:** configure a URL do webhook via variável de ambiente, não hardcode.

---

## Tabelas principais (PostgreSQL)

Ver diagrama e domínios em [arquitetura.md](./arquitetura.md).

| Tabela | Função |
|--------|--------|
| `professionals` | Profissionais do estúdio |
| `services` | Serviços por profissional |
| `appointments` | Agendamentos |
| `clients` | E-mails salvos por telefone |
| `available_hours` | Horários de atendimento |
| `blocked_slots` | Bloqueios de agenda |
| `categories` | Categorias do catálogo |
| `studio_info` | Dados do estúdio |
| `admin_users` | Usuários com acesso ao `/admin` |

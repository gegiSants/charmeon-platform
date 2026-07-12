# CharmeOn Platform — Documentação

Plataforma de agendamento e pagamento online para profissionais da beleza.

**Site:** https://www.charmeon.com.br

---

## Stack tecnológica

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18, TypeScript, Vite 5 |
| UI | Tailwind CSS, shadcn/ui (Radix UI) |
| Roteamento | React Router 6 |
| Estado / dados | TanStack React Query |
| Formulários | React Hook Form + Zod |
| Backend / DB | Supabase (PostgreSQL + Auth + Storage) |
| Edge Functions | Deno (Supabase Functions) |
| Pagamentos | Mercado Pago (PIX), Stripe (legado) |
| E-mail | Resend (via Edge Function) |
| Automação | n8n (webhook WhatsApp) |
| Deploy frontend | Vercel |
| Lint | ESLint 9 |

---

## Documentos nesta pasta

| Arquivo | Conteúdo |
|---------|----------|
| [arquitetura.md](./arquitetura.md) | Diagramas e domínios (sem SQL) |
| [setup-producao.md](./setup-producao.md) | **Passo a passo para ir ao ar** |
| [estrutura.md](./estrutura.md) | Mapa de pastas e arquivos |
| [fluxo-caixa.md](./fluxo-caixa.md) | Aba Caixa — fluxo financeiro |
| [webhook-n8n.md](./webhook-n8n.md) | Integração WhatsApp via n8n |
| [webhook-n8n-curl.md](./webhook-n8n-curl.md) | Exemplos curl para testar webhook |
| [telefone-n8n.md](./telefone-n8n.md) | Formato de telefone para o n8n |

---

## Fluxo principal

```
Cliente → /agendar → escolhe serviço/horário → /pagamento (PIX MP)
       → pagamento confirmado → WhatsApp (n8n) → cliente confirma
       → /confirmar (token assinado) → status confirmed

Admin → /admin/login (Supabase Auth) → /admin (CRUD completo)
```

---

## Setup rápido

```bash
cp .env.example .env.local   # preencher credenciais Supabase
npm install
npm run dev                    # http://localhost:5173
```

### Primeiro admin

1. Crie um usuário em **Supabase Dashboard → Authentication → Users**
2. Execute no SQL Editor:

```sql
INSERT INTO public.admin_users (user_id)
VALUES ('uuid-do-usuario-auth');
```

3. Acesse `/admin/login` com e-mail e senha criados.

---

## Variáveis de ambiente

Ver [.env.example](../.env.example) na raiz do projeto.

---

## Scripts npm

| Comando | Função |
|---------|--------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |
| `npm run lint` | ESLint |

---

## Rotas do frontend

| Rota | Página | Acesso |
|------|--------|--------|
| `/` | Home | Público |
| `/agendar` | Agendamento | Público |
| `/pagamento` | Pagamento PIX/cartão | Público |
| `/pagamento-pix` | QR Code PIX | Público |
| `/pagamento-sucesso` | Confirmação de pagamento | Público |
| `/confirmar` | Confirmação por e-mail/link | Público (token assinado) |
| `/catalogo` | Catálogo de serviços | Público |
| `/admin/login` | Login admin | Público |
| `/admin` | Painel profissional | Autenticado + admin_users |

---

## Edge Functions (Supabase)

| Function | Função |
|----------|--------|
| `create-checkout` | Cria pagamento PIX Mercado Pago |
| `create-payment-mp` | Checkout hospedado MP |
| `verify-payment-mp` | Verifica pagamento MP + dispara n8n |
| `verify-payment` | Verifica pagamento Stripe (legado) |
| `get-pix-qrcode` | QR Code PIX Stripe (legado) |
| `send-email-confirmation` | Envia e-mail de confirmação |
| `email-webhook` | Processa confirmação/cancelamento |
| `check-upcoming-appointments` | Cron: e-mails automáticos |

---

## Migrations Supabase

O schema **não é versionado neste repositório**. Gerenciado privadamente no Supabase Dashboard.

Ver [setup-producao.md](./setup-producao.md) para aplicar o banco.

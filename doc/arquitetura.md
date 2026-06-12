# Arquitetura

Visão de alto nível do CharmeOn Platform. **Sem comandos SQL** — o schema é gerenciado privadamente no Supabase.

---

## Camadas

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (React + Vite)                                │
│  charmeon.com.br — Vercel                               │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS (chave anon)
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Supabase                                               │
│  ├── PostgreSQL (dados + RLS)                           │
│  ├── Auth (login admin)                                 │
│  ├── Storage (fotos profissionais)                      │
│  └── Edge Functions (Deno)                              │
└───────┬─────────────────────────────┬───────────────────┘
        │                             │
        ▼                             ▼
┌───────────────┐           ┌─────────────────┐
│ Mercado Pago  │           │ n8n → WhatsApp  │
│ PIX / checkout│           │ confirmação     │
└───────────────┘           └─────────────────┘
        │
        ▼
┌───────────────┐
│ Resend        │
│ e-mail conf.  │
└───────────────┘
```

---

## Domínios de dados

| Domínio | Entidades | Quem acessa |
|---------|-----------|-------------|
| Catálogo | profissionais, serviços, categorias | Público (leitura) |
| Agenda | agendamentos, horários, bloqueios | Cliente cria; admin gerencia |
| Clientes | telefone + e-mail | RPC controlada; admin vê tudo |
| Estúdio | endereço, redes, info geral | Público (leitura) |
| Admin | usuários autorizados | Só quem está em `admin_users` |
| Mídia | fotos no Storage | Leitura pública; escrita admin |

---

## Fluxo do cliente

1. Escolhe profissional, serviço, data e horário (`/agendar`)
2. Informa nome, telefone e e-mail
3. Paga sinal ou total via Mercado Pago (`/pagamento`)
4. Recebe WhatsApp (n8n) para confirmar horário
5. Recebe e-mail com link assinado (`/confirmar`)
6. Confirma ou solicita reagendamento

---

## Fluxo do admin

1. Login em `/admin/login` (Supabase Auth)
2. Sistema verifica se o usuário está em `admin_users`
3. Painel `/admin` — CRUD de profissionais, serviços, agenda, bloqueios, catálogo

---

## Segurança (RLS)

O banco usa **Row Level Security**:

- **Anônimo:** leitura de catálogo e horários; criação de agendamentos; sem acesso a dados sensíveis (PII, pagamentos)
- **Admin autenticado:** acesso completo via políticas vinculadas a `admin_users`
- **Edge Functions:** operações privilegiadas com service role (pagamento, e-mail, confirmação)

Funções expostas ao frontend (sem expor schema):

| RPC | Uso |
|-----|-----|
| `get_booked_slots` | Verificar horários ocupados na agenda |
| `get_client_email` | Recuperar e-mail salvo por telefone |

---

## Edge Functions

| Function | Responsabilidade |
|----------|------------------|
| `create-checkout` | Inicia pagamento PIX |
| `verify-payment-mp` | Confirma pagamento + dispara n8n |
| `send-email-confirmation` | Envia e-mail com link assinado |
| `email-webhook` | Processa confirmação/cancelamento |
| `check-upcoming-appointments` | Cron de lembretes (protegido por secret) |

---

## O que NÃO fica no repositório público

| Item | Onde fica |
|------|-----------|
| Migrations SQL | Supabase Dashboard (histórico privado) |
| Políticas RLS detalhadas | Supabase Dashboard |
| Secrets (MP, Resend, n8n) | Supabase Edge Functions Secrets |
| Chaves API | Variáveis de ambiente (`.env.local`) |
| Schema completo | Projeto Supabase (não versionado aqui) |

O arquivo `src/integrations/supabase/types.ts` contém apenas **tipos TypeScript** para o frontend — sem comandos SQL.

---

## Diagrama de entidades (relacionamentos)

```
professionals ──< services
      │               │
      └───────< appointments >────── clients (por telefone)
      
categories ──< services

available_hours ── professionals
blocked_slots ── professionals

admin_users ── auth.users (Supabase Auth)

studio_info (singleton)
```

---

## Referências internas

- [Setup de produção](./setup-producao.md) — passo a passo pós-deploy
- [Segurança](./seguranca.md) — checklist e permissões
- [Estrutura do código](./estrutura.md) — pastas do repositório

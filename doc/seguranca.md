# Segurança

Checklist e configuração de segurança do CharmeOn Platform.

---

## Correções aplicadas

| Item | Status |
|------|--------|
| `.env` removido do Git + `.gitignore` atualizado | ✅ |
| `.env.example` criado | ✅ |
| RLS restritivo aplicado no Supabase | ✅ (privado) |
| Login obrigatório em `/admin` | ✅ |
| Tokens de confirmação HMAC (não UUID) | ✅ |
| Bypass de pagamento bloqueado em produção | ✅ |
| URL n8n via env var (`N8N_WEBHOOK_URL`) | ✅ |
| CORS restrito via `ALLOWED_ORIGIN` | ✅ |
| Cron protegido por `CRON_SECRET` | ✅ |
| Storage: upload só para admins | ✅ |
| `robots.txt` bloqueia `/admin` | ✅ |
| `config.toml` sem project ID real | ✅ |

---

## Ainda necessário antes de tornar público

### 1. Purgar histórico Git

O histórico ainda contém `.env` e migrations SQL. Ver [setup-producao.md](./setup-producao.md#fase-1--limpar-o-git-obrigatório-antes-de-publicar).

### 2. Aplicar schema e políticas de segurança

Gerenciado **privadamente** no Supabase Dashboard ou via CLI local.

Ver [setup-producao.md](./setup-producao.md#fase-3--banco-de-dados-supabase-dashboard).

### 3. Configurar secrets das Edge Functions

No Supabase Dashboard → Edge Functions → Secrets:

| Secret | Obrigatório | Descrição |
|--------|-------------|-----------|
| `SUPABASE_URL` | Sim | URL do projeto |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Service role (nunca no frontend) |
| `MERCADOPAGO_ACCESS_TOKEN` | Sim | Token MP |
| `SITE_URL` | Sim | URL do site (ex: https://www.charmeon.com.br) |
| `ALLOWED_ORIGIN` | Sim | Mesma URL para CORS |
| `CONFIRMATION_TOKEN_SECRET` | Sim | String aleatória longa (32+ chars) |
| `N8N_WEBHOOK_URL` | Sim | URL do webhook n8n |
| `CRON_SECRET` | Sim | Protege cron de e-mails |
| `WEBHOOK_SECRET` | Recomendado | Protege webhook legado |
| `RESEND_API_KEY` | Se usar e-mail | API Resend |
| `ALLOW_TEST_PAYMENT` | Não | `false` em produção |
| `TEST_PAYMENT_SECRET` | Não | Só se `ALLOW_TEST_PAYMENT=true` |

Gerar secrets:

```bash
openssl rand -hex 32
```

### 4. Criar primeiro admin

Ver [README.md](./README.md#primeiro-admin).

### 5. Aplicar políticas de storage

Via Supabase Dashboard → Storage → Policies. Script local em `supabase/storage_policies.sql` (não versionado).

### 6. Scan automatizado

```bash
# gitleaks
brew install gitleaks
gitleaks detect --source .

# ou trufflehog
trufflehog git file://.
```

---

## Modelo de permissões (RLS)

| Recurso | Anônimo | Admin autenticado |
|---------|---------|-------------------|
| professionals/services SELECT | ✅ | ✅ |
| professionals/services INSERT/UPDATE/DELETE | ❌ | ✅ |
| appointments INSERT | ✅ (agendar) | ✅ |
| appointments SELECT/UPDATE/DELETE | ❌ | ✅ |
| clients INSERT/UPDATE | ✅ | ✅ |
| clients SELECT | ❌ (usa RPC) | ✅ |
| available_hours/blocked_slots SELECT | ✅ | ✅ |
| available_hours/blocked_slots write | ❌ | ✅ |
| storage fotos SELECT | ✅ | ✅ |
| storage fotos upload/delete | ❌ | ✅ |

---

## Tokens de confirmação

Links de e-mail usam formato:

```
/confirmar?token=<HMAC-assinado>&action=confirm
```

- Assinado com `CONFIRMATION_TOKEN_SECRET`
- Expira em 72 horas
- Não expõe UUID do agendamento diretamente

---

## Pagamento de teste

Bypass (`amount = 0`) só funciona se **todas** as condições forem verdadeiras:

- `ALLOW_TEST_PAYMENT=true`
- `TEST_PAYMENT_SECRET` configurado
- Header `x-test-secret` correto na requisição

Em produção: mantenha `ALLOW_TEST_PAYMENT=false` ou não configure.

---

## Cron de e-mails

A function `check-upcoming-appointments` exige header:

```
x-cron-secret: <CRON_SECRET>
```

Configure no Supabase Cron ou serviço externo (GitHub Actions, etc.).

---

## Referências

- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Edge Functions Secrets](https://supabase.com/docs/guides/functions/secrets)

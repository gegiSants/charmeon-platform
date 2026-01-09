# Configuração do Sistema de Confirmação via Email

Este sistema envia emails automáticos de confirmação 1-2 dias antes dos agendamentos e permite que os clientes confirmem via email ou link.

## Como Funciona

1. **Coleta de Email**: No momento do agendamento, se o telefone não tiver email cadastrado, o sistema solicita o email uma única vez.

2. **Pagamento Confirmado**: Quando um pagamento é confirmado, o agendamento fica com status `pending` aguardando confirmação do cliente.

3. **Envio Automático**: 1-2 dias antes do agendamento, o sistema envia um email com:
   - Detalhes do agendamento
   - Botões para confirmar ou cancelar
   - Instruções para responder por email

4. **Confirmação do Cliente**: O cliente pode confirmar de duas formas:
   - **Clicando nos botões** no email (links diretos)
   - **Respondendo o email** com "SIM" ou "NÃO"

5. **Atualização Automática**: O sistema atualiza o status do agendamento:
   - **SIM** → Status muda para `confirmed`
   - **NÃO** → Status muda para `cancelled` (pode ser reagendado)

## Opções de Configuração (Todas Gratuitas)

### Opção 1: Resend (RECOMENDADO - Mais Fácil) ⭐

**Vantagens:**
- ✅ Muito fácil de configurar
- ✅ 3.000 emails/mês grátis
- ✅ Sem necessidade de verificar domínio inicialmente
- ✅ API simples

**Como configurar:**

1. Acesse [https://resend.com](https://resend.com)
2. Clique em "Sign Up" e crie uma conta (pode usar Google/GitHub)
3. Vá em **API Keys** → **Create API Key**
4. Dê um nome (ex: "Studio Ingrid Leandro")
5. Copie a API Key
6. Vá em **Domains** → **Add Domain** (ou use o domínio de teste que eles fornecem)
7. No Supabase, adicione como Secrets:
   ```
   RESEND_API_KEY=sua_api_key_aqui
   FROM_EMAIL=noreply@seudominio.com (ou use o domínio de teste deles)
   FROM_NAME=Studio Ingrid Leandro
   SITE_URL=https://seu-site.com
   ```

**Pronto!** É só isso. Muito mais simples que SendGrid.

---

### Opção 2: Gmail SMTP (Usa sua conta Gmail)

**Vantagens:**
- ✅ Todo mundo tem Gmail
- ✅ 500 emails/dia grátis
- ✅ Não precisa criar conta em outro serviço

**Como configurar:**

1. Acesse sua conta Google: [https://myaccount.google.com](https://myaccount.google.com)
2. Vá em **Segurança** → **Verificação em duas etapas** (precisa estar ativada)
3. Vá em **Segurança** → **Senhas de app**
4. Clique em **Selecionar app** → **Email**
5. Clique em **Selecionar dispositivo** → **Outro (nome personalizado)**
6. Digite "Studio Ingrid Leandro" e clique em **Gerar**
7. Copie a senha gerada (16 caracteres)
8. No Supabase, adicione como Secrets:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=seuemail@gmail.com
   SMTP_PASSWORD=senha_de_app_gerada
   FROM_EMAIL=seuemail@gmail.com
   FROM_NAME=Studio Ingrid Leandro
   SITE_URL=https://seu-site.com
   ```

**Nota:** Você precisará modificar a função para usar SMTP direto (mais complexo). Recomendo usar Resend.

---

### Opção 3: Mailgun (5.000 emails/mês grátis)

1. Acesse [https://www.mailgun.com](https://www.mailgun.com)
2. Crie uma conta
3. Verifique seu domínio ou use o domínio de teste
4. Copie a API Key
5. Configure no Supabase (similar ao Resend)

---

### Opção 4: Amazon SES (62.000 emails/mês grátis no primeiro ano)

Mais complexo, mas muito generoso no free tier. Requer conta AWS.

---

## Recomendação

**Use Resend!** É a opção mais fácil e rápida de configurar. Leva menos de 5 minutos.

## Deploy das Funções

### 1. Deploy Manual (via Supabase Dashboard)

1. Acesse **Edge Functions** no Supabase
2. Para cada função, copie o código e faça deploy:
   - `send-email-confirmation`
   - `check-upcoming-appointments`
   - `email-webhook`

### 2. Deploy via CLI

```bash
supabase functions deploy send-email-confirmation
supabase functions deploy check-upcoming-appointments
supabase functions deploy email-webhook
```

## Configurar Cron Job (Verificação Automática)

Para enviar emails automaticamente, você precisa configurar um cron job que chama `check-upcoming-appointments` diariamente.

### Opção 1: Usar Supabase Cron (Recomendado)

No Supabase Dashboard:
1. Vá em **Database** → **Cron Jobs**
2. Crie um novo cron job:
   - **Name**: `check_upcoming_appointments`
   - **Schedule**: `0 9 * * *` (todos os dias às 9h)
   - **SQL**:
   ```sql
   SELECT
     net.http_post(
       url := 'https://seu-projeto.supabase.co/functions/v1/check-upcoming-appointments',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
       ),
       body := '{}'::jsonb
     ) AS request_id;
   ```

### Opção 2: Usar Serviço Externo (cron-job.org, EasyCron, etc.)

Configure para chamar:
```
POST https://seu-projeto.supabase.co/functions/v1/check-upcoming-appointments
Headers:
  Authorization: Bearer SEU_SERVICE_ROLE_KEY
  apikey: SEU_SERVICE_ROLE_KEY
```

## Aplicar Migration

Execute o SQL em `supabase/migrations/20260109000001_add_email_confirmation.sql` no SQL Editor do Supabase.

## Testar o Sistema

### 1. Testar Envio Manual

Chame a função `send-email-confirmation`:

```bash
curl -X POST https://seu-projeto.supabase.co/functions/v1/send-email-confirmation \
  -H "Authorization: Bearer SEU_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"appointmentId": "id-do-agendamento"}'
```

## Fluxo Completo

1. Cliente faz agendamento
   - Sistema verifica se telefone tem email cadastrado
   - Se não tiver, solicita email
   - Email é salvo vinculado ao telefone

2. Cliente paga
3. Sistema marca como `pending` (aguardando confirmação)
4. 1-2 dias antes: Sistema envia email
5. Cliente responde "SIM" ou "NÃO" (ou clica nos botões)
6. Webhook recebe resposta e atualiza status:
   - SIM → `confirmed`
   - NÃO → `cancelled`

## Troubleshooting

### Emails não estão sendo enviados

1. Verifique se a API Key está correta
2. Verifique se o FROM_EMAIL está configurado
3. Verifique os logs da função `send-email-confirmation` no Supabase
4. Teste enviando um email manualmente

### Webhook não está recebendo emails

1. Verifique se o webhook está configurado corretamente
2. Verifique os logs da função `email-webhook` no Supabase
3. Certifique-se de que o webhook está acessível publicamente

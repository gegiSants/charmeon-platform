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

## Configuração do SendGrid (Gratuito)

### 1. Criar Conta no SendGrid

1. Acesse [https://sendgrid.com](https://sendgrid.com)
2. Crie uma conta gratuita (permite enviar 100 emails/dia)
3. Complete a verificação de identidade (necessário para ativar)

### 2. Criar API Key

1. No dashboard do SendGrid, vá em **Settings** → **API Keys**
2. Clique em **Create API Key**
3. Dê um nome (ex: "Studio Ingrid Leandro")
4. Selecione **Full Access** ou **Restricted Access** (com permissões de Mail Send)
5. Copie a API Key (ela só aparece uma vez!)

### 3. Verificar Domínio ou Email Remetente

**Opção 1: Verificar Domínio (Recomendado)**
1. Vá em **Settings** → **Sender Authentication**
2. Clique em **Authenticate Your Domain**
3. Siga as instruções para adicionar registros DNS

**Opção 2: Verificar Email Individual (Mais Rápido)**
1. Vá em **Settings** → **Sender Authentication**
2. Clique em **Verify a Single Sender**
3. Preencha os dados e confirme o email

### 4. Configurar Inbound Parse (Para Receber Respostas)

1. Vá em **Settings** → **Inbound Parse**
2. Clique em **Add Host & URL**
3. Configure:
   - **Subdomain**: `mail` (ou outro de sua escolha)
   - **Domain**: Seu domínio (ex: `studioingridleandro.com`)
   - **Destination URL**: `https://seu-projeto.supabase.co/functions/v1/email-webhook`
   - Marque **POST the raw, full MIME message**
4. Adicione os registros DNS conforme instruções

### 5. Configurar no Supabase

No Supabase Dashboard, vá em **Edge Functions** → **Secrets** e adicione:

```
SENDGRID_API_KEY=sua_api_key_aqui
SENDGRID_FROM_EMAIL=noreply@seu-dominio.com
SENDGRID_FROM_NAME=Studio Ingrid Leandro
SITE_URL=https://seu-site.com
```

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

### 2. Testar Webhook

Envie um email de teste para o endereço configurado no Inbound Parse e verifique se o webhook recebe a mensagem.

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

## Notas Importantes

- **SendGrid Free Tier**: Permite 100 emails/dia gratuitamente
- **Limites**: Após 100 emails/dia, você precisará de um plano pago
- **Alternativas Gratuitas**: 
  - Gmail API (até 500 emails/dia)
  - Mailgun (5.000 emails/mês grátis)
  - Amazon SES (62.000 emails/mês grátis no primeiro ano)

## Troubleshooting

### Emails não estão sendo enviados

1. Verifique se a API Key do SendGrid está correta
2. Verifique se o email remetente está verificado
3. Verifique os logs da função `send-email-confirmation` no Supabase
4. Teste enviando um email manualmente via SendGrid

### Webhook não está recebendo emails

1. Verifique se o Inbound Parse está configurado corretamente
2. Verifique se os registros DNS estão corretos
3. Verifique os logs da função `email-webhook` no Supabase
4. Certifique-se de que o webhook está acessível publicamente


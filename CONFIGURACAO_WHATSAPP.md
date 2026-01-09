# Configuração do Sistema de Confirmação via WhatsApp

Este sistema envia mensagens automáticas de confirmação 1-2 dias antes dos agendamentos e permite que os clientes confirmem via WhatsApp.

## Como Funciona

1. **Pagamento Confirmado**: Quando um pagamento é confirmado, o agendamento fica com status `pending` aguardando confirmação do cliente.

2. **Envio Automático**: 1-2 dias antes do agendamento, o sistema envia uma mensagem via WhatsApp perguntando se o cliente pode comparecer.

3. **Confirmação do Cliente**: O cliente responde "SIM" ou "NÃO" via WhatsApp.

4. **Atualização Automática**: O sistema atualiza o status do agendamento:
   - **SIM** → Status muda para `confirmed`
   - **NÃO** → Status muda para `cancelled` (pode ser reagendado)

## Configuração do Twilio WhatsApp

### 1. Criar Conta no Twilio

1. Acesse [https://www.twilio.com](https://www.twilio.com)
2. Crie uma conta gratuita (trial permite testar)
3. Vá em **Messaging** → **Try it out** → **Send a WhatsApp message**
4. Siga as instruções para ativar o WhatsApp Sandbox

### 2. Obter Credenciais

No dashboard do Twilio, você encontrará:
- **Account SID**: Seu identificador de conta
- **Auth Token**: Token de autenticação
- **WhatsApp Number**: Número no formato `whatsapp:+14155238886` (sandbox) ou seu número verificado

### 3. Configurar no Supabase

No Supabase Dashboard, vá em **Edge Functions** → **Secrets** e adicione:

```
TWILIO_ACCOUNT_SID=seu_account_sid_aqui
TWILIO_AUTH_TOKEN=seu_auth_token_aqui
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### 4. Configurar Webhook

No Twilio Console:
1. Vá em **Messaging** → **Settings** → **WhatsApp Sandbox Settings**
2. Configure o webhook URL:
   ```
   https://seu-projeto.supabase.co/functions/v1/whatsapp-webhook
   ```
3. Salve as configurações

## Deploy das Funções

### 1. Deploy Manual (via Supabase Dashboard)

1. Acesse **Edge Functions** no Supabase
2. Para cada função, copie o código e faça deploy:
   - `send-whatsapp-confirmation`
   - `check-upcoming-appointments`
   - `whatsapp-webhook`

### 2. Deploy via CLI

```bash
supabase functions deploy send-whatsapp-confirmation
supabase functions deploy check-upcoming-appointments
supabase functions deploy whatsapp-webhook
```

## Configurar Cron Job (Verificação Automática)

Para enviar mensagens automaticamente, você precisa configurar um cron job que chama `check-upcoming-appointments` diariamente.

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

## Testar o Sistema

### 1. Testar Envio Manual

Chame a função `send-whatsapp-confirmation`:

```bash
curl -X POST https://seu-projeto.supabase.co/functions/v1/send-whatsapp-confirmation \
  -H "Authorization: Bearer SEU_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"appointmentId": "id-do-agendamento"}'
```

### 2. Testar Webhook

Envie uma mensagem de teste do WhatsApp para o número do Twilio e verifique se o webhook recebe a mensagem.

## Fluxo Completo

1. Cliente faz agendamento e paga
2. Sistema marca como `pending` (aguardando confirmação)
3. 1-2 dias antes: Sistema envia mensagem WhatsApp
4. Cliente responde "SIM" ou "NÃO"
5. Webhook recebe resposta e atualiza status:
   - SIM → `confirmed`
   - NÃO → `cancelled`

## Notas Importantes

- **Twilio Sandbox**: No modo sandbox, você só pode enviar mensagens para números verificados. Para produção, você precisa de um número WhatsApp Business verificado.
- **Custos**: Twilio cobra por mensagem enviada/recebida. Verifique os preços no site deles.
- **Alternativas**: Você também pode usar a API oficial do WhatsApp Business, mas requer mais configuração.

## Troubleshooting

### Mensagens não estão sendo enviadas

1. Verifique se as credenciais do Twilio estão corretas
2. Verifique se o número está no formato correto: `whatsapp:+5511999999999`
3. No modo sandbox, certifique-se de que o número do cliente foi verificado

### Webhook não está recebendo mensagens

1. Verifique se a URL do webhook está configurada corretamente no Twilio
2. Verifique os logs da função `whatsapp-webhook` no Supabase
3. Certifique-se de que o webhook está acessível publicamente


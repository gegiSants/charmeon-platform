# Documentação - Webhook WhatsApp n8n

## Endpoint do Webhook
```
POST https://n8n.codethio.com/webhook/charmeon
```

## Estrutura dos Dados Enviados

O webhook recebe um objeto JSON com a seguinte estrutura:

### Estrutura Principal

```json
{
  "appointment": {
    "id": "uuid",
    "client_name": "string",
    "client_phone": "string",
    "appointment_date": "YYYY-MM-DD",
    "appointment_time": "HH:MM",
    "payment_type": "sinal" | "total",
    "amount_paid": number,
    "total_amount": number,
    "status": "pending" | "confirmed" | "completed" | "cancelled",
    "created_at": "ISO 8601 timestamp"
  },
  "professional": {
    "id": "uuid",
    "name": "string",
    "specialty": "string",
    "phone": "string",
    "photo_url": "string | null"
  } | null,
  "service": {
    "id": "uuid",
    "name": "string",
    "price": number,
    "duration": number,
    "photo_url": "string | null"
  } | null
}
```

## Tabela: `appointments`

### Colunas Principais

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Identificador único do agendamento |
| `client_name` | TEXT | Nome completo do cliente |
| `client_phone` | TEXT | Telefone do cliente **FORMATADO NO FORMATO INTERNACIONAL BRASILEIRO** (55 + DDD + número, sem caracteres especiais. Ex: `5511987654321`) |
| `appointment_date` | DATE | Data do agendamento (formato: YYYY-MM-DD) |
| `appointment_time` | TEXT | Horário do agendamento (formato: HH:MM) |
| `payment_type` | TEXT | Tipo de pagamento: 'sinal' ou 'total' |
| `amount_paid` | DECIMAL(10,2) | Valor já pago |
| `total_amount` | DECIMAL(10,2) | Valor total do serviço |
| `status` | TEXT | Status: 'pending', 'confirmed', 'completed', 'cancelled' |
| `created_at` | TIMESTAMP WITH TIME ZONE | Data/hora de criação do agendamento |
| `professional_id` | UUID | Referência à tabela `professionals` |
| `service_id` | UUID | Referência à tabela `services` |
| `whatsapp_confirmation_sent` | BOOLEAN | Indica se a mensagem foi enviada (atualizado após disparo) |
| `whatsapp_confirmation_sent_at` | TIMESTAMP WITH TIME ZONE | Data/hora em que a mensagem foi enviada |
| `mercado_pago_payment_id` | TEXT | ID do pagamento no Mercado Pago |
| `mercado_pago_preference_id` | TEXT | ID da preferência no Mercado Pago |

## Tabela: `professionals`

### Colunas

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Identificador único da profissional |
| `name` | TEXT | Nome completo da profissional |
| `specialty` | TEXT | Especialidade da profissional |
| `phone` | TEXT | Telefone de contato |
| `photo_url` | TEXT | URL da foto da profissional (pode ser null) |
| `created_at` | TIMESTAMP WITH TIME ZONE | Data/hora de criação |

## Tabela: `services`

### Colunas

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Identificador único do serviço |
| `professional_id` | UUID | Referência à profissional que oferece o serviço |
| `name` | TEXT | Nome do serviço |
| `price` | DECIMAL(10,2) | Preço do serviço |
| `duration` | INTEGER | Duração em minutos |
| `photo_url` | TEXT | URL da foto do serviço (pode ser null) |
| `created_at` | TIMESTAMP WITH TIME ZONE | Data/hora de criação |

## Quando o Webhook é Disparado

O webhook é disparado automaticamente quando:
1. Um pagamento do tipo "sinal" é confirmado no Mercado Pago
2. O status do pagamento é `approved`
3. O agendamento existe e foi atualizado com sucesso

## Atualização Automática

Após o disparo bem-sucedido do webhook, o sistema atualiza automaticamente:
- `whatsapp_confirmation_sent` = `true`
- `whatsapp_confirmation_sent_at` = timestamp atual

## Exemplo de Payload

```json
{
  "appointment": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "client_name": "Maria Silva",
    "client_phone": "5511987654321",
    "appointment_date": "2026-01-15",
    "appointment_time": "14:00",
    "payment_type": "sinal",
    "amount_paid": 45.00,
    "total_amount": 150.00,
    "status": "pending",
    "created_at": "2026-01-12T10:30:00Z"
  },
  "professional": {
    "id": "223e4567-e89b-12d3-a456-426614174001",
    "name": "Ingrid Leandro",
    "specialty": "Especialista em Cílios e Unhas",
    "phone": "(11) 99027-8446",
    "photo_url": "https://example.com/photo.jpg"
  },
  "service": {
    "id": "323e4567-e89b-12d3-a456-426614174002",
    "name": "Alongamento de Cílios Fio a Fio",
    "price": 150.00,
    "duration": 90,
    "photo_url": "https://example.com/service.jpg"
  }
}
```

## Observações Importantes

1. O campo `professional` e `service` podem ser `null` se os dados não estiverem disponíveis
2. O `status` do agendamento permanece como `pending` até confirmação via WhatsApp
3. O `amount_paid` representa o valor do sinal pago
4. O formato de data é ISO 8601 para timestamps e YYYY-MM-DD para datas
5. O formato de horário é HH:MM (24 horas)
6. **⚠️ FORMATO DO TELEFONE (`client_phone`)**: 
   - **DEVE ser enviado no formato internacional brasileiro**
   - **Formato**: `55` + DDD + número (sem espaços, parênteses ou hífens)
   - **Exemplo**: `(11) 98765-4321` → `5511987654321`
   - **Exemplo**: `(11) 99027-8446` → `5511990278446`
   - **Sempre incluir o código do país `55` no início**
   - **Remover todos os caracteres especiais** (espaços, parênteses, hífens)


#!/bin/bash

# Teste do Webhook n8n - WhatsApp Confirmation
# URL do webhook: https://n8n.codethio.com/webhook/charmeon

curl -X POST https://n8n.codethio.com/webhook/charmeon \
  -H "Content-Type: application/json" \
  -d '{
    "appointment": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "client_name": "Maria Silva",
      "client_phone": "(11) 98765-4321",
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
  }'

echo ""
echo "Teste concluído!"



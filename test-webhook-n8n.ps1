# Configure: $env:N8N_WEBHOOK_URL = "https://seu-n8n.com/webhook/charmeon"
if (-not $env:N8N_WEBHOOK_URL) {
    Write-Host "Erro: defina N8N_WEBHOOK_URL antes de executar." -ForegroundColor Red
    exit 1
}

$body = @{
    appointment = @{
        id = "123e4567-e89b-12d3-a456-426614174000"
        client_name = "Maria Silva"
        client_phone = "5511987654321"
        appointment_date = "2026-01-15"
        appointment_time = "14:00"
        payment_type = "sinal"
        amount_paid = 45.00
        total_amount = 150.00
        status = "pending"
        created_at = "2026-01-12T10:30:00Z"
    }
    professional = @{
        id = "223e4567-e89b-12d3-a456-426614174001"
        name = "Profissional Exemplo"
        specialty = "Especialista"
        phone = "5511999999999"
        photo_url = "https://example.com/photo.jpg"
    }
    service = @{
        id = "323e4567-e89b-12d3-a456-426614174002"
        name = "Servico Exemplo"
        price = 150.00
        duration = 90
        photo_url = "https://example.com/service.jpg"
    }
} | ConvertTo-Json -Depth 10

Write-Host "Enviando teste para o webhook n8n..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $env:N8N_WEBHOOK_URL -Method POST -Body $body -ContentType "application/json"
    Write-Host "SUCESSO! Webhook respondeu:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "ERRO ao chamar webhook:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

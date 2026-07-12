# Fluxo de Caixa

Aba **Caixa** no painel `/admin` para controlar entradas e saídas do negócio.

## O que inclui

- Cards: Entradas, Saídas, Saldo, A receber
- Filtros: período, tipo, categoria, profissional
- Lançamentos manuais (CRUD) e automáticos (pagamentos de agendamento)
- Gráfico Recharts (últimos 6 meses)
- Exportação CSV

## Banco (privado)

Aplique no Supabase SQL Editor o arquivo local:

`supabase/migrations/20260710000000_cash_flow.sql`

Cria:

- `cash_flow_categories`
- `cash_flow_entries`
- Trigger que gera lançamento automático quando `appointments.amount_paid` > 0
- Proteção: lançamentos `source = appointment` não podem ser editados/excluídos pela UI

## Regras

| Origem | Editar | Excluir |
|--------|--------|---------|
| Manual | ✅ | ✅ |
| Automático (agendamento) | ❌ | ❌ |

Acesso: apenas `admin_users` autenticados (RLS).

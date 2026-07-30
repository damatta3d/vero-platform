# Operação inicial

Endpoints protegidos pela chave e pelo tenant do MVP:

- `POST /v1/finance` — registrar receita ou despesa;
- `GET /v1/finance` — listar lançamentos;
- `GET /v1/finance/summary` — consultar fluxo de caixa;
- `PATCH /v1/finance/:id/settle` — marcar como pago ou recebido;
- `PATCH /v1/finance/:id/cancel` — cancelar lançamento aberto.

Valores monetários são enviados em centavos. Datas usam ISO 8601.

# MISSÃO 010 — VERO Finance MVP

## Objetivo

Permitir ao Santo Parma registrar receitas e despesas, controlar vencimentos e pagamentos e consultar fluxo de caixa.

## Entrega incremental

- domínio financeiro tenant-aware;
- contas a pagar e a receber;
- estados aberto, pago e cancelado;
- idempotência por tenant;
- vínculo opcional com origem para impedir duplicidade de compras e vendas;
- resumo projetado, realizado e vencido;
- persistência PostgreSQL inicial.

## Fora do escopo

Conciliação bancária, fiscal, contabilidade, emissão de documentos, billing SaaS e integrações bancárias.

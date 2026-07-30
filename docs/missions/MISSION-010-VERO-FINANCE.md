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
- persistência PostgreSQL inicial;
- interface operacional em `/finance`;
- geração automática de conta a pagar ao registrar uma compra;
- geração automática de conta a receber ao registrar uma venda.

## Regras de automação

- compra de estoque gera lançamento `PAYABLE` na categoria `Compra de insumos e embalagens`;
- venda gera lançamento `RECEIVABLE` na categoria `Vendas`;
- cada lançamento guarda `sourceType` e `sourceId`;
- a chave de idempotência impede a duplicação do lançamento financeiro quando a operação é repetida.

## Fora do escopo

Conciliação bancária, fiscal, contabilidade, emissão de documentos, billing SaaS e integrações bancárias.

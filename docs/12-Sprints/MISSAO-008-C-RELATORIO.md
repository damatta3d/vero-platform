# MISSÃO 008-C — Relatório de Venda, CMV e Margem

## Resultado

**Estado:** implementação concluída e validada no CI  
**Branch:** `agent/missao-008-santo-parma-mvp`  
**PR:** #8 — permanece em rascunho  
**CI:** run `30401419715` — `quality` e `integration` aprovados

## Fluxo entregue

1. registrar uma venda manual de um produto;
2. usar a ficha técnica vigente e seu rendimento;
3. fixar produto, versão da ficha, preço e custos;
4. baixar todos os insumos na mesma transação;
5. calcular CMV estimado, CMV realizado e margem;
6. consultar vendas recentes e resumo operacional.

## Garantias

- operação isolada por Tenant;
- chave de idempotência impede baixa duplicada;
- estoque insuficiente rejeita a venda inteira;
- venda, custos e ledger são persistidos atomicamente;
- histórico de venda e custo não pode ser alterado ou excluído;
- conectores futuros usarão este mesmo fluxo, mas a VERO já funciona sem Anota AI ou iFood.

## Evidências

- formatação, lint, TypeScript strict e arquitetura aprovados;
- 94 testes aprovados;
- cobertura do novo módulo acima dos gates mínimos;
- schema Prisma válido;
- build dos 14 projetos aprovado.

O CI aplicou a migration e validou idempotência, baixa de estoque, snapshot imutável, isolamento e
resumo realizado com PostgreSQL real.

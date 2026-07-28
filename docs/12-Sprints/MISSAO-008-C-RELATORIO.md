# MISSÃO 008-C — Relatório de Produção, Venda, CMV e Margem

## Resultado

**Estado:** implementação concluída e validada no CI
**Branch:** `agent/missao-008-santo-parma-mvp`
**PR:** #8 — permanece em rascunho
**CI de vendas:** run `30401419715` — `quality` e `integration` aprovados
**CI de produção:** run `30402690997` — `quality` e `integration` aprovados

## Fluxo entregue

1. registrar produção ou venda manual de um produto;
2. usar a ficha técnica vigente e seu rendimento;
3. fixar produto, versão da ficha, preço e custos;
4. baixar todos os insumos na mesma transação;
5. calcular CMV estimado e realizado para produção e venda;
6. calcular faturamento e margem apenas para venda;
7. consultar produções, vendas e resumos operacionais.

Produção e venda direta são alternativas operacionais neste MVP. A mesma porção não deve ser
registrada nos dois fluxos, pois ainda não existe estoque intermediário de produto acabado.

## Garantias

- operação isolada por Tenant;
- chaves de idempotência impedem baixa duplicada;
- estoque insuficiente rejeita a produção ou venda inteira;
- operação, custos e ledger são persistidos atomicamente;
- históricos de produção, venda e custos não podem ser alterados ou excluídos;
- produção não cria receita ou margem fictícia;
- a interface alerta contra a baixa dupla entre produção e venda direta;
- conectores futuros usarão este mesmo fluxo, mas a VERO já funciona sem Anota AI ou iFood.

## Evidências

- formatação, lint, TypeScript strict e arquitetura aprovados;
- 106 testes aprovados;
- cobertura do novo módulo acima dos gates mínimos;
- schema Prisma válido;
- build dos 15 projetos aprovado.

Os CIs aplicaram as migrations e comprovaram idempotência, baixa atômica, snapshots imutáveis e
isolamento entre empresas com PostgreSQL real. A próxima etapa é a M008-D com dados reais, sem
retirar o PR do rascunho ou realizar merge antes do parecer final.

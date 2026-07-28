# MISSÃO 008-B — Relatório de Compras e Estoque

## Resultado

**Estado:** implementação concluída e validada localmente  
**Branch remota de destino:** `agent/missao-008-santo-parma-mvp`  
**PR:** #8 — permanece em rascunho  
**Baseline:** `9540e55ba966c094639e768a41cf1ea331eb13d9`  
**Próximo gate:** CI `quality` e `integration`

## Fluxo entregue

A segunda fatia empresarial da VERO permite:

1. registrar uma entrada de compra para um insumo;
2. normalizar o custo por unidade física;
3. recalcular o custo médio móvel a cada entrada;
4. registrar consumo e ajustes com motivo e autor;
5. impedir uma saída que produza estoque negativo;
6. consultar saldo, custo médio e valor do estoque;
7. operar por API ou pela interface responsiva em `/mvp`.

## Regras e rastreabilidade

- todas as quantidades usam inteiros com precisão de seis casas decimais;
- dinheiro usa centavos e custo unitário usa microcentavos;
- cada saída mantém o snapshot do custo médio usado no momento da operação;
- movimentações são somente adicionadas e nunca sobrescritas;
- uma proteção no PostgreSQL rejeita `UPDATE` e `DELETE` no ledger;
- cada lançamento registra tipo, quantidade, custo, motivo, autor e instante;
- saldo e ledger são atualizados na mesma transação serializável;
- conflitos de serialização possuem repetição limitada;
- chaves e relações compostas por `tenantId` impedem vínculos entre empresas.

## Cenário real validado

O cálculo foi exercitado com a compra informada para o Santo Parma:

| Dado | Valor |
|---|---:|
| Insumo | Batata Asterix |
| Quantidade | 25 kg |
| Valor da compra | R$ 100,00 |
| Custo normalizado | R$ 4,00/kg |
| Saldo após a entrada | 25 kg |
| Valor do estoque | R$ 100,00 |

Uma segunda entrada de 10 kg por R$ 50,00 recalcula o custo médio para aproximadamente
R$ 4,285714/kg e mantém o valor total do estoque em R$ 150,00.

## Segurança e isolamento

- autorização dedicada ao recurso `inventory.management`;
- ações distintas para compra, consumo, ajuste, posição e ledger;
- autorização negada por padrão;
- existência do insumo verificada dentro do Tenant autorizado;
- todas as consultas filtradas por `tenantId`;
- relações PostgreSQL compostas por `tenantId` e `ingredientId`;
- teste de integração preparado para rejeitar movimento entre Tenants.

## Evidências locais

- formatação aprovada;
- lint dos 13 projetos aprovado;
- TypeScript strict aprovado;
- 79 testes unitários e de segurança aprovados;
- validação arquitetural aprovada;
- build dos 13 projetos aprovado;
- schema Prisma válido;
- smoke test aprovado: `/mvp` responde `200` e estoque sem credenciais responde `401`;
- auditoria sem vulnerabilidades altas;
- uma vulnerabilidade moderada transitiva já conhecida.

O job `integration` do GitHub validará a nova migration, as transações, o ledger imutável e o
isolamento com PostgreSQL real.

## Próxima entrega

Após o CI verde, a MISSÃO 008 seguirá para **M008-C — Produção, Venda, CMV e Margem**, consumindo
o custo médio e o ledger entregues nesta etapa.

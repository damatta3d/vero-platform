# VERO Intelligence — inventário de reuso e análise de lacunas

## Controle

| Campo | Valor |
|---|---|
| Estado | Discovery |
| Linha analisada | `main` |
| Baseline | `bac02c7aa561f62fb582381fd0b710e948fc3d2a` |
| Data | 2026-07-29 |
| Escopo | Inteligência comercial para iFood, Anota AI e fontes importadas |

Este documento registra o que a VERO já possui antes de qualquer nova implementação. Ele não aprova
novos ADRs nem altera os contratos dos módulos existentes.

## Conclusão executiva

A VERO já possui a fundação transacional necessária para iniciar o Intelligence sem reconstruir
catálogo, ficha técnica, estoque, CMV, margem, isolamento por Tenant ou o conector Anota AI.

O trabalho novo deve começar depois da fronteira dos conectores: persistir fatos externos,
preservar sua procedência, reconciliá-los com o catálogo interno e produzir métricas históricas,
recomendações e alertas explicáveis.

## Reuso confirmado

| Capacidade existente | Evidência na `main` | Decisão de reuso |
|---|---|---|
| Catálogo interno | `packages/business/catalog` | Reutilizar produtos e fichas técnicas; estender metadados sem duplicar o agregado |
| Custo de ficha | `calculateRecipeCost` em `catalog-model.ts` | Reutilizar como custo estimado determinístico |
| Estoque e custo médio | `packages/business/inventory` | Reutilizar ledger, posição e custo médio móvel |
| CMV e margem realizados | `packages/business/sales` e `SalesRecord` | Reutilizar snapshots históricos e cálculos transacionais |
| Produção | `packages/business/production` | Reutilizar fatos de produção e custos realizados |
| Pedido externo canônico inicial | `ExternalOrder` em `packages/business/sales` | Reutilizar como contrato de entrada; evoluir por compatibilidade |
| Vínculo catálogo externo/interno | `ExternalCatalogLink` | Reutilizar para iFood e Anota AI por provedor e estabelecimento |
| Conector Anota AI | `packages/integrations/anota-ai` | Reutilizar OAuth, cliente, exportação de cardápio e tradução de pedidos |
| Tenancy, Identity e Access | `packages/core` | Reutilizar resolução confiável, isolamento e negação por padrão |
| PostgreSQL, Prisma e mensageria | ADR-003 e fundação executável | Permanecer na stack aprovada; nenhuma nova plataforma de dados no MVP |

## Cobertura atual do Anota AI

O conector integrado no PR #9 já contém:

- OAuth 2.0 por `client_credentials`, cache de token e renovação após 401;
- listagem e detalhe de pedidos;
- tradução de pedido para `ExternalOrder` em BRL;
- itens, complementos, descontos, pagamentos, cliente, endereço e origem;
- exportação do cardápio;
- vínculo de página e configuração de callbacks;
- homologação persistente de itens e complementos externos;
- idempotência e isolamento por Tenant/estabelecimento.

Os métodos operacionais de aceitar, cancelar, marcar como pronto e finalizar existem no adapter,
mas a automação operacional permanece desabilitada até homologação específica. O Intelligence não
deve ativá-los como efeito colateral de uma leitura analítica.

## Lacunas reais

### Extensões dos modelos existentes

1. `CatalogProduct` ainda não representa categoria, variante, complemento, disponibilidade,
   posição no cardápio ou histórico de preço.
2. `SalesRecord` representa uma venda nativa simplificada de um produto. Não representa um pedido
   multitem, canal, promoção, cupom, cashback, taxas, repasse, cancelamento ou status externo.
3. `ExternalOrder` é um contrato em memória; ainda não existe fato externo persistido com
   procedência, versão do payload, checkpoint de ingestão e ciclo de reconciliação.
4. O payload de lista/cardápio do Anota AI ainda preserva documentos como registros genéricos em
   partes do contrato. Tipagem adicional deve ser baseada somente em evidência homologada.
5. O schema atual não possui fatos analíticos, dimensões temporais, agregados, recomendações,
   tendências ou alertas.

### Capacidades novas

- conector oficial iFood;
- landing zone imutável e sanitizada para payloads autorizados;
- checkpoints, idempotência de ingestão, retry e dead-letter;
- reconciliação entre pedido externo, produto externo e produto VERO;
- modelo canônico analítico com fatos e dimensões;
- métricas por produto, categoria, restaurante, canal, horário e promoção;
- ingestão financeira e conciliação;
- ingestão de avaliações;
- importadores CSV/XLSX com schema, versão e relatório de erros;
- funil e conversão quando a fonte oficial disponibilizar os dados;
- engine determinístico de recomendações e alertas;
- camada de IA explicativa, sempre posterior ao cálculo determinístico;
- dashboard executivo e trilha de evidências da recomendação.

## Evidência oficial iFood já localizada

A documentação oficial pública confirma, entre outros:

- OAuth 2.0 com Bearer token e fluxos centralizado e distribuído;
- Merchant API para dados e operação do estabelecimento;
- Catalog API v2.0 para categorias, itens e complementos;
- Order API orientada a eventos;
- Events por webhook ou polling;
- Promotion API v2.0 para criação e gestão de promoções de produto;
- Financial APIs: Sales, Financial Events, Reconciliation, Reconciliation On-Demand, Settlement e
  Anticipation;
- Reviews API v2;
- relatório de pedidos no Portal do Parceiro exportável em XLS;
- reconciliação financeira exportável e API oficial;
- tela de desempenho e funil disponíveis no Portal do Parceiro.

Fontes:

- https://developer.ifood.com.br/docs/guides/modules/authentication/intro
- https://developer.ifood.com.br/docs/guides/modules/authentication/centralized
- https://developer.ifood.com.br/docs/guides/modules/authentication/distributed
- https://developer.ifood.com.br/docs/guides/modules/merchant/workflow
- https://developer.ifood.com.br/en-US/docs/guides/modules/catalog/introduction
- https://developer.ifood.com.br/en-US/docs/guides/modules/order/fundamentals
- https://developer.ifood.com.br/en-US/docs/guides/modules/events/webhook-overview
- https://developer.ifood.com.br/en-US/docs/guides/modules/events/polling-overview
- https://developer.ifood.com.br/docs/guides/modules/promotion/general
- https://developer.ifood.com.br/docs/guides/modules/financial/intro
- https://developer.ifood.com.br/docs/guides/modules/review/details
- https://blog-parceiros.ifood.com.br/relatorio-de-pedidos/
- https://blog-parceiros.ifood.com.br/relatorio-de-conciliacao/
- https://blog-parceiros.ifood.com.br/tela-de-desempenho/

A presença de uma API na documentação não garante acesso automático à aplicação VERO. Módulos,
escopos, homologação, consentimento do restaurante e limites devem ser confirmados durante o
onboarding oficial do integrador.

## Limitações públicas confirmadas

- As APIs públicas operacionais do iFood não devem ser tratadas automaticamente como uma API de
  todos os indicadores exibidos no Portal do Parceiro.
- Performance de campanha, funil, benchmarking e alguns relatórios do Portal ainda precisam de
  verificação de exportação/API por relatório.
- A documentação pública do Anota AI cobre pedidos e cardápio, mas não comprova endpoints públicos
  para todos os relatórios, financeiro, estoque e CRM anunciados no produto.
- Ausência de documentação pública será registrada como `não comprovado`; não será preenchida por
  endpoint presumido.
- Scraping autenticado não será arquitetura principal.

## Decisão de fronteira

O desenho deve manter quatro conceitos separados:

1. **Transação operacional** — venda, produção, compra, estoque e CMV da VERO.
2. **Evento externo recebido** — dado bruto autorizado, imutável e rastreável.
3. **Fato canônico reconciliado** — pedido, item, promoção ou evento financeiro interpretado.
4. **Métrica derivada** — cálculo reproduzível que aponta para os fatos de origem.

A IA não escreve fatos, não altera o ledger e não substitui fórmulas financeiras. Ela explica
métricas, levanta hipóteses e propõe ações com confiança, evidências e possibilidade de rejeição.

## Decisões candidatas a ADR

Ainda não aprovadas:

- ADR — Ingestão externa, idempotência, procedência e replay;
- ADR — Persistência analítica e política de agregados dentro do Modular Monolith;
- ADR — Governança de recomendações de IA, explicabilidade e human-in-the-loop.

## Próximo gate

1. concluir a matriz oficial de capacidades e campos do iFood;
2. concluir a matriz de relatórios/exportações do Portal do Parceiro;
3. confrontar a documentação Anota AI com o conector já homologado;
4. definir o modelo canônico mínimo sem duplicar entidades transacionais;
5. submeter os ADRs realmente necessários como `Proposed`;
6. iniciar implementação somente após o gate arquitetural.

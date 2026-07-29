# VERO Intelligence — backlog de discovery e implementação

## Estado

**Status:** iniciado em 2026-07-29  
**Estratégia:** reuse-first, evidência oficial e entrega vertical  
**Dependências concluídas:** MISSÃO 008 e MISSÃO 009  
**Implementação funcional:** bloqueada até conclusão do gate arquitetural

## Objetivo do discovery

Determinar, sem duplicar capacidades existentes:

- quais dados cada integração oficial fornece;
- quais indicadores dependem de relatórios exportados;
- qual modelo canônico mínimo é necessário;
- quais decisões materiais exigem ADR;
- qual primeiro fluxo vertical entrega valor ao Santo Parma e permanece reutilizável por outros
  restaurantes.

## Workstreams

### D0 — Inventário de reuso

- [x] confirmar baseline da `main`;
- [x] mapear catálogo, estoque, produção, vendas, CMV e margem existentes;
- [x] mapear o contrato `ExternalOrder`;
- [x] mapear vínculos de catálogo externo;
- [x] mapear o conector Anota AI integrado;
- [x] registrar lacunas sem criar entidades duplicadas.

### D1 — iFood oficial

- [ ] registrar autenticação centralizada e distribuída;
- [ ] registrar módulos, escopos e gates de homologação;
- [ ] mapear Merchant API;
- [ ] mapear Catalog API;
- [ ] mapear Order API e ciclo de eventos;
- [ ] mapear webhook, polling e acknowledgements;
- [ ] mapear Promotion API;
- [ ] mapear Financial APIs;
- [ ] mapear Reviews API;
- [ ] registrar rate limits por módulo;
- [ ] classificar cada campo como leitura, escrita, evento, arquivo ou não comprovado.

### D2 — Portal do Parceiro

- [ ] inventariar Pedidos, Operação, Produtos, Desempenho, Financeiro, Avaliações e Promoções;
- [ ] registrar formato de exportação por relatório;
- [ ] registrar janela histórica e frequência de atualização;
- [ ] identificar correspondência com API oficial;
- [ ] registrar dados sem acesso programático público como lacuna;
- [ ] validar o inventário em uma sessão autorizada do Portal do Santo Parma, sem scraping.

### D3 — Anota AI

- [x] confirmar pedidos e cardápio no conector existente;
- [x] confirmar callbacks e vínculo de página;
- [ ] tipar somente campos observados nos contratos oficiais/homologação;
- [ ] verificar documentação oficial de clientes, financeiro, estoque e relatórios;
- [ ] comparar dados de pedido com iFood;
- [ ] manter automações de status e estoque desabilitadas até gate próprio.

### D4 — Arquitetura canônica

- [ ] separar agregado transacional, fato externo, fato reconciliado e métrica;
- [ ] definir `SourceConnection`, `IngestionRun`, `SourceEvent` e `IngestionCheckpoint`;
- [ ] definir pedido e item externos persistidos;
- [ ] definir dimensões mínimas de canal, estabelecimento, produto, categoria e tempo;
- [ ] definir fatos de venda, desconto, taxa, repasse, visita e conversão;
- [ ] definir agregados reproduzíveis;
- [ ] definir procedência, versão, retenção, LGPD e minimização;
- [ ] validar compatibilidade com o CDM aprovado.

### D5 — ADRs candidatos

- [ ] ADR de ingestão externa, idempotência, replay e dead-letter;
- [ ] ADR de persistência analítica e agregados no Modular Monolith;
- [ ] ADR de recomendações determinísticas e IA explicável;
- [ ] eliminar qualquer ADR que apenas repita decisão já coberta pelos ADR-001 a ADR-009.

### D6 — Primeiro corte vertical

Proposta sujeita ao gate:

1. importar ou sincronizar pedidos iFood autorizados;
2. reconciliar itens com `CatalogProduct`;
3. cruzar receita, descontos e taxas com CMV realizado/estimado;
4. exibir produto, quantidade, faturamento, CMV, margem de contribuição e impacto promocional;
5. apontar a origem de cada número;
6. gerar alertas determinísticos, sem alteração automática de preço ou promoção.

## Roadmap preliminar

| Etapa | Resultado | Estimativa preliminar |
|---|---|---:|
| Discovery oficial | matrizes de APIs, relatórios, lacunas e ADRs | 8–12 dias de engenharia |
| MVP Intelligence | pedidos + catálogo + CMV/margem por produto | 15–25 dias |
| Sprint 1 | financeiro, taxas, repasses e promoções | 15–25 dias |
| Sprint 2 | funil, horários, clientes e avaliações | 15–25 dias |
| Sprint 3 | recomendações, alertas e simulações | 20–30 dias |
| Enterprise | redes, benchmarking, governança e escala ampliada | 30–60+ dias |

As estimativas serão recalibradas após acesso/homologação do iFood e confirmação das exportações do
Portal do Parceiro.

## Riscos prioritários

| Risco | Severidade | Mitigação |
|---|---|---|
| Confundir API operacional com analytics do Portal | Alta | matriz de cobertura com evidência por campo |
| Duplicar vendas/CMV existentes | Alta | fatos externos reconciliados apontam para agregados existentes |
| Associar item externo ao produto errado | Alta | homologação explícita e fila de não reconciliados |
| Reprocessamento duplicar fatos | Alta | idempotência, checkpoint e chave natural por fonte |
| Promoção parecer lucrativa sem taxas/CMV | Alta | margem de contribuição somente com componentes disponíveis |
| Expor dados pessoais desnecessários | Alta | minimização, pseudonimização, retenção e auditoria |
| Recomendação de IA sem prova | Alta | fórmula determinística, evidência, confiança e aprovação humana |
| Limites/homologação mudarem | Média | adapters versionados, feature flags e monitoramento de contrato |

## Critérios para iniciar código

- matriz oficial iFood concluída;
- primeira fonte de dados escolhida;
- contrato canônico mínimo revisado;
- ADRs materiais aprovados;
- acesso e escopos confirmados;
- política de dados pessoais definida;
- critérios de aceite do primeiro corte vertical aprovados.

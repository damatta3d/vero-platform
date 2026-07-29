# VERO Intelligence — backlog de discovery e implementação

## Estado

**Status:** iniciado em 2026-07-29  
**Estratégia:** reuse-first, evidência oficial e entrega vertical  
**Dependências concluídas:** MISSÃO 008 e MISSÃO 009  
**Implementação funcional:** bloqueada até conclusão do gate arquitetural  
**D1 iFood:** discovery público concluído; homologação e payloads reais pendentes  
**D2 Portal:** inventário público concluído; validação autenticada pendente  
**D3 Anota AI:** comparação concluída com base no conector e homologação atuais  
**D4 Canônico:** revisão normativa concluída; ADR-011 Proposed; aprovação e implementação bloqueadas

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

- [x] registrar autenticação centralizada e distribuída;
- [x] registrar módulos, escopos e gates de homologação;
- [x] mapear Merchant API;
- [x] mapear Catalog API;
- [x] mapear Order API e ciclo de eventos;
- [x] mapear webhook, polling e acknowledgements;
- [x] mapear Promotion API;
- [x] mapear Financial APIs;
- [x] mapear Reviews API;
- [x] registrar rate limits publicamente comprovados e marcar os demais para homologação;
- [x] classificar cada grupo de dados como leitura, escrita, evento, arquivo ou não comprovado.

Evidência: `docs/04-Architecture/VERO-INTELLIGENCE-IFOOD-CAPABILITY-MATRIX.md`.

### D2 — Portal do Parceiro

- [x] inventariar Pedidos, Operação, Produtos, Desempenho, Financeiro, Avaliações e Promoções;
- [x] registrar formatos de exportação publicamente comprovados e marcar os demais como pendentes;
- [x] registrar janela histórica e frequência quando públicas; marcar lacunas para validação;
- [x] identificar correspondência com API oficial;
- [x] registrar dados sem acesso programático público como lacuna;
- [ ] validar o inventário em uma sessão autorizada do Portal do Santo Parma, sem scraping.

Evidência: `docs/04-Architecture/VERO-INTELLIGENCE-IFOOD-PARTNER-PORTAL-MATRIX.md`.

### D3 — Anota AI

- [x] confirmar pedidos e cardápio no conector existente;
- [x] confirmar callbacks e vínculo de página;
- [x] confrontar `ExternalOrder`, mapper, smoke real e Design `VERO-INT-001`;
- [x] comparar cobertura atual com iFood;
- [x] registrar vantagem de maturidade da Anota AI e amplitude oficial do iFood;
- [x] manter automações de status e estoque desabilitadas até gate próprio;
- [ ] obter respostas formais sobre scopes, rate limits, incremental, webhooks e
  `additionalFees`;
- [ ] comprovar documentação oficial de clientes, financeiro, estoque e relatórios além de
  pedidos/cardápio;
- [ ] tipar campos adicionais somente após contrato ou payload sanitizado.

Evidência:
`docs/04-Architecture/VERO-INTELLIGENCE-ANOTA-AI-IFOOD-COMPARISON.md`.

### D4 — Arquitetura canônica

- [x] separar agregado transacional, recebimento externo, fato reconciliado e métrica;
- [x] reutilizar `IntegrationConnection` e `ExternalMessageReceipt` do ADR-010;
- [x] eliminar `SourceConnection` e `SourceEvent` duplicados;
- [x] definir `IngestionRun` e `IngestionCheckpoint`;
- [x] definir pedido, linha, ajuste e financeiro externos persistidos;
- [x] manter produto, categoria, preço, estoque, compra, CMV e margem em seus donos canônicos;
- [x] definir dimensões como referências/snapshots, não agregados mestres;
- [x] definir métricas versionadas, completude, procedência e qualidade;
- [x] adiar visita, conversão, CRM, tendência e recomendação até fonte ou histórico suficientes;
- [x] registrar tenancy, minimização de PII e retenção como gates;
- [x] revisar o modelo contra a versão integral do CDM e precedência normativa;
- [x] propor no ADR-011 o dono de `ChannelOrderFact` e a estratégia de persistência;
- [ ] aprovar o modelo no gate arquitetural.

Evidência:
`docs/04-Architecture/VERO-INTELLIGENCE-MINIMUM-CANONICAL-MODEL.md`.

### D5 — ADRs candidatos

- [x] eliminar ADR genérico de inbox/idempotência/replay por já estar coberto pelo ADR-010;
- [x] submeter ADR-011 de persistência analítica e agregados no Modular Monolith como `Proposed`;
- [x] propor posição de `ChannelOrderFact`, retenção por dataset e materialização seletiva no ADR;
- [ ] detalhar checkpoints/importação de arquivos em Design, salvo decisão material nova;
- [ ] adiar ADR de IA explicável até existir motor determinístico e contrato de evidências;
- [x] eliminar qualquer ADR que apenas repita ADR-001 a ADR-010.

### D6 — Primeiro corte vertical

Proposta sujeita ao gate:

1. ingerir pedidos Anota AI read-only por execução controlada, sem efeito operacional;
2. persistir revisões imutáveis e linhas com procedência;
3. reconciliar itens por `ExternalCatalogLink`;
4. cruzar receita/desconto observados com CMV estimado e, quando existir venda terminal, realizado;
5. exibir produto, quantidade, faturamento, cobertura de vínculo, CMV e margem observável;
6. apontar origem, fórmula, versão e completude de cada número;
7. gerar alertas determinísticos de qualidade e margem incompleta;
8. manter preço, promoção, venda, estoque e status externo sem alteração automática.

O iFood entra no mesmo pipeline somente após onboarding, escopos e homologação oficiais.

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
| Duplicar Integration Hub/inbox | Alta | reutilizar ADR-010 e eliminar conceitos paralelos |
| Duplicar vendas/CMV existentes | Alta | fatos externos apontam para agregados existentes |
| Associar item externo ao produto errado | Alta | vínculo explícito e fila de não reconciliados |
| Reprocessamento duplicar fatos | Alta | revisão imutável, checkpoint e chave natural |
| Promoção parecer lucrativa sem taxas/CMV | Alta | margem somente com componentes e completude visíveis |
| Expor dados pessoais desnecessários | Alta | minimização, pseudonimização, retenção e auditoria |
| Recomendação de IA sem prova | Alta | fórmula, evidência, confiança e aprovação humana |
| Limites/homologação mudarem | Média | adapters versionados, feature flags e monitoramento |

## Critérios para iniciar código

- matriz oficial iFood concluída;
- comparação Anota AI × iFood concluída;
- primeira fonte de dados escolhida e autorizada;
- contrato canônico mínimo revisado e aprovado;
- ADR de persistência analítica aprovado;
- dono de `ChannelOrderFact` decidido;
- política de retenção e PII aprovada;
- chaves de revisão e checkpoint confirmadas;
- critérios de aceite do primeiro corte vertical aprovados;
- nenhum efeito empresarial habilitado pelo Intelligence.

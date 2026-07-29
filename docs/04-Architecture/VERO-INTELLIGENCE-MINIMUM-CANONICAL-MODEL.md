# VERO Intelligence — modelo canônico mínimo

## Controle

| Campo | Valor |
|---|---|
| Estado | Revisado contra a baseline normativa; ADR-011 v1.0.0 Approved |
| Data | 2026-07-29 |
| Escopo | Primeiro corte: pedidos externos + catálogo VERO + CMV/margem |
| Implementação | Corte vertical read-only autorizado; ainda não iniciado |
| Princípio | Reuse-first; nenhuma duplicação de agregados transacionais |

## 1. Objetivo

Definir o menor modelo capaz de ingerir pedidos externos, reconciliar itens com o catálogo VERO e
calcular métricas comerciais rastreáveis. O modelo deve funcionar com Anota AI, iFood, arquivo
oficial e futuras integrações sem levar DTOs de provider para Business.

## 2. Decisão de reuso

Não serão criadas as entidades genéricas `Restaurant`, `Menu`, `Product`, `Inventory`,
`Supplier`, `Purchase`, `CMV` ou `Margin` dentro do Intelligence.

| Conceito solicitado | Dono canônico | Uso no Intelligence |
|---|---|---|
| Restaurante/empresa/filial | Core Tenancy e estabelecimento VERO | Referência obrigatória |
| Produto | Business Catalog | Referência e snapshot de nome |
| Categoria/variante/complemento | Extensão futura de Business Catalog | Referência; nunca cópia como mestre |
| Preço e histórico | Business Catalog | Snapshot observado e histórico governado pelo Catálogo |
| Insumo/embalagem/ficha | Business Catalog | Base do CMV estimado |
| Estoque e custo médio | Business Inventory | Fonte do custo realizado |
| Compra/fornecedor | Business Purchasing quando implementado | Fonte de custo, não fato duplicado |
| Venda nativa | Business Sales | Fonte transacional |
| Produção | Business Production | Fonte transacional |
| Conexão externa | `IntegrationConnection` do ADR-010 | Reutilização integral |
| Recebimento/inbox | `ExternalMessageReceipt` do ADR-010 | Reutilização integral |
| Vínculo externo | `ExternalCatalogLink` existente | Reutilização integral |
| Pedido de entrada | `ExternalOrder` existente | Contrato público, não persistência final |

A terminologia `SourceConnection` e `SourceEvent` do backlog é substituída pelos conceitos já
aprovados no ADR-010. Isso elimina duas entidades duplicadas.

## 3. Quatro camadas de verdade

1. **Transação operacional:** catálogo, compra, estoque, produção e venda VERO.
2. **Recebimento externo:** envelope durável, deduplicado e sanitizado.
3. **Fato canônico reconciliado:** interpretação provider-neutral, imutável por revisão.
4. **Métrica derivada:** cálculo reproduzível com fórmula e referências aos fatos.

A camada analítica nunca escreve retroativamente em uma transação operacional.

## 4. Modelo mínimo

### 4.1 IntegrationConnection — existente/aprovado

Responsável por provider, Tenant, estabelecimento externo, credencial referenciada, modo, status,
health e kill switch. Não será redefinido pelo Intelligence.

Chave: `tenantId + provider + externalEstablishmentId`.

### 4.2 ExternalMessageReceipt — existente/aprovado

Envelope de inbox para evento, polling ou arquivo:

- Tenant e estabelecimento resolvidos;
- `connectionId`;
- ID externo ou hash estável;
- tipo, schema e hash do payload;
- instante externo, recebimento e processamento;
- status, tentativa, erro, correlação e causalidade.

O payload bruto com PII não é persistido por padrão.

### 4.3 IngestionRun — novo

Representa uma execução controlada de ingestão por polling, webhook processado, API financeira ou
arquivo oficial.

Campos mínimos:

- `id`, `tenantId`, `establishmentId`, `connectionId`;
- `sourceKind`: `API | WEBHOOK | FILE | MANUAL`;
- `dataSet`: `ORDER | FINANCIAL | CATALOG | REVIEW | FUNNEL`;
- `schemaVersion`;
- período solicitado, timezone e filtros;
- início, fim e status;
- contagens recebidas, aceitas, rejeitadas e duplicadas;
- checksum/identificador do arquivo quando aplicável;
- autoria e correlação.

Ele não substitui a inbox; resume uma execução e permite auditoria de backfill.

### 4.4 IngestionCheckpoint — novo

Mantém o cursor técnico por conexão e conjunto de dados:

- `tenantId`, `connectionId`, `dataSet`;
- cursor/token/janela confirmados pelo provider;
- último instante externo confirmado;
- última execução bem-sucedida;
- versão otimista.

A semântica do cursor é privada ao adapter. Checkpoint só avança depois da persistência durável.

Chave: `tenantId + connectionId + dataSet`.

### 4.5 ChannelOrderFact — novo

Snapshot canônico de uma revisão do pedido externo:

- `id`, `tenantId`, `establishmentId`, `connectionId`;
- `provider`, `externalOrderId`, `revision`;
- referência, canal e origem;
- estado canônico e estado original;
- criado, atualizado, concluído ou cancelado;
- moeda;
- subtotal de itens, descontos, entrega, outras taxas e total;
- `financialCompleteness`: `GROSS_ONLY | PARTIAL | RECONCILED`;
- `receiptId`, `ingestionRunId`, schema e qualidade;
- hash semântico do snapshot.

Chave lógica: `tenantId + connectionId + externalOrderId + revision`.

No armazenamento analítico, `externalOrderId` representa uma chave HMAC determinística,
versionada e scoped por Tenant e conexão. O identificador bruto não entra no fato; quando necessário
para uma nova consulta ao provider, permanece como referência operacional criptografada e restrita
no Integration Hub.

Revisões são imutáveis. A visão “estado atual” aponta para a maior revisão válida.

### 4.6 ChannelOrderLineFact — novo

Linha imutável do pedido:

- `orderFactId`, ID externo da linha e ID externo do item;
- ID do pai quando complemento;
- tipo: `ITEM | MODIFIER`;
- nome observado;
- quantidade, preço unitário e total;
- `catalogLinkId` opcional;
- `productId` opcional, obtido somente por vínculo explícito;
- `reconciliationStatus`: `MATCHED | UNMATCHED | CONFLICT | NOT_APPLICABLE`;
- snapshots opcionais de receita e custo usados no cálculo.

Uma linha não reconciliada continua visível como venda externa, mas não recebe CMV de produto.

### 4.7 OrderAdjustmentFact — novo

Componente monetário observado:

- `orderFactId`;
- tipo: `DISCOUNT | DELIVERY_FEE | COMMISSION | SERVICE_FEE | SUBSIDY | COUPON | CASHBACK | OTHER`;
- valor em centavos;
- direção: crédito ou débito;
- financiador quando comprovado;
- promotion/campaign externos quando comprovados;
- origem: pedido, Financial Sales, evento financeiro ou conciliação;
- estado de reconciliação.

`OTHER` exige código original da fonte e não pode alimentar ROI sem classificação.

### 4.8 OrderFinancialFact — novo, opcional

Criado somente quando houver fonte financeira oficial:

- pedido canônico;
- receita bruta;
- descontos por financiador;
- comissões, taxas, subsídios e ajustes;
- receita líquida;
- competência;
- valor previsto de repasse;
- estado de reconciliação;
- fonte e referência de arquivo/evento.

Revisões financeiras são imutáveis e a conciliação não sobrescreve o pedido operacional.

### 4.9 MetricDefinition — novo

Contrato versionado da fórmula:

- código e versão;
- granularidade;
- componentes obrigatórios;
- fórmula e regra de arredondamento;
- política para dados ausentes;
- proprietário e estado.

### 4.10 MetricObservation — novo apenas quando necessário

Resultado materializado para desempenho ou auditoria:

- Tenant, estabelecimento, período e granularidade;
- código/versão da métrica;
- valor, unidade e completude;
- IDs/hash dos fatos de origem;
- calculado em e versão do algoritmo.

No MVP, preferir consultas/visões reproduzíveis. Materializar somente quando custo ou histórico exigir.

## 5. Conceitos deliberadamente adiados

| Conceito | Estado |
|---|---|
| Visit e Conversion | Ausentes até fonte oficial comprovada |
| Customer mestre/CRM | Ausente; pedido não cria identidade mestre |
| Promotion/Campaign canônicas | Adiadas até contratos e atribuição comprovados |
| Recommendation e Alert persistidos | Etapa posterior ao motor determinístico |
| Trend e previsão | Etapa posterior a histórico suficiente |
| Data warehouse/lakehouse | Fora do MVP |
| Benchmarking entre restaurantes | Fora do MVP e sujeito a governança |
| Escrita automática de preço/promoção | Proibida |

## 6. Dimensões analíticas

Dimensões não são novos agregados mestres:

- Tenant/empresa e estabelecimento: referências do Core;
- produto: referência do Catalog + snapshot;
- categoria: referência futura do Catalog + snapshot;
- canal/provider: valor controlado pela Integration Platform;
- tempo: derivado com timezone do estabelecimento;
- promoção: referência externa somente quando comprovada.

Mudanças históricas são preservadas no fato. Uma renomeação posterior não altera o pedido antigo.

## 7. Fórmulas do primeiro corte

Todas as fórmulas usam inteiros em centavos e versão explícita.

### Receita bruta de itens

`sum(line.totalCents para ITEM e MODIFIER)`

### Desconto observado

`sum(adjustment.amountCents onde type = DISCOUNT e direção = DEBIT)`

### Valor do pedido

Usar o total informado pela fonte e validar a igualdade com componentes. Divergência gera alerta de
qualidade; não é corrigida silenciosamente.

### CMV estimado

Soma do custo de ficha versionada dos produtos reconciliados, proporcional à quantidade. Itens sem
vínculo permanecem fora do CMV e reduzem a completude.

### CMV realizado

Usar o snapshot da venda/baixa transacional existente quando houver vínculo terminal idempotente.
Sem venda concluída, não simular como realizado.

### Margem bruta observável

`receita bruta atribuível - desconto atribuível - CMV disponível`.

### Margem de contribuição

Somente com financeiro oficial reconciliado:

`receita líquida - CMV realizado - custos variáveis adicionais não incluídos na receita líquida`.

A fórmula deve impedir dupla dedução de comissão/taxa.

### ROI promocional

Não pertence ao primeiro corte. Exige custo financiado pelo restaurante, janela, baseline e regra de
atribuição documentados.

## 8. Completude e qualidade

Cada observação recebe:

- `sourceCompleteness`;
- `catalogReconciliationCoverage`;
- `financialCompleteness`;
- `dataQualityStatus`;
- lista de componentes ausentes;
- instante da última reconciliação.

Uma margem com 80% dos itens vinculados não pode ser exibida como margem completa.

## 9. Tenancy, segurança e LGPD

- `tenantId` e `establishmentId` são obrigatórios em toda chave e consulta;
- nenhum identificador externo resolve Tenant sozinho;
- nome, telefone, endereço e coordenadas não entram no fato analítico padrão;
- retenção, PII, pseudonimização e expurgo seguem a política `VERO-INTELLIGENCE-DATA-RETENTION-AND-PII-POLICY.md` v1.0.0 — Approved no Gate C;
- arquivos oficiais recebem checksum, controle de acesso e relatório de rejeições;
- logs e métricas não expõem PII, tokens ou valores de alta cardinalidade;
- reprocessamento é auditado e não altera revisões imutáveis.

## 10. Fluxo do primeiro corte

```text
Provider/arquivo
  -> IntegrationConnection
  -> ExternalMessageReceipt
  -> ACL provider-neutral
  -> ChannelOrderFact + linhas + ajustes
  -> ExternalCatalogLink
  -> Catalog/Recipe/Sales snapshots
  -> métricas reproduzíveis
  -> dashboard e alertas determinísticos
```

Nenhuma seta representa escrita direta em tabela de outro módulo.

## 11. Limites de módulo

- `platform/integration-hub`: conexão, inbox, checkpoint e execução;
- `integrations/*`: autenticação, DTOs, schemas e ACL do provider;
- `business/catalog`: produto, categoria futura, preço e ficha;
- `business/sales` ou futura capacidade de Order Intake: pedido operacional e venda terminal;
- `business/intelligence`: fatos reconciliados, fórmulas, métricas e explicações;
- `infrastructure/database`: implementações por portas públicas.

A revisão arquitetural atribuiu `ChannelOrderFact` ao `business/intelligence` como projeção
analítica append-only. A decisão material está registrada no ADR-011 v1.0.0 — Approved. O fato não
é pedido operacional, não representa venda concluída e não produz efeitos em Sales ou Inventory.

## 12. Impacto nos ADRs candidatos

1. **Ingestão, idempotência e replay:** núcleo já decidido pelo ADR-010. Não criar novo ADR que o
   repita. Checkpoints e arquivos podem ser detalhados em design document, salvo nova decisão
   material.
2. **Persistência analítica e agregados:** materializada no ADR-011 v1.0.0 — Approved. O ADR atribui
   os fatos ao Business Intelligence, mantém execução/checkpoint no Integration Hub, usa PostgreSQL
   no MVP e exige política de retenção por dataset antes da ativação.
3. **IA explicável:** adiar até o motor determinístico e o contrato de evidências estarem definidos.

## 13. Critérios de aceite para implementação

- modelo revisado contra Constituição, Blueprints, CDM e ADR-010;
- ADR-011 aprovado pelo Arquiteto-Chefe;
- `ChannelOrderFact` pertencente ao Business Intelligence como fato analítico append-only;
- primeira fonte escolhida e escopos autorizados;
- política de retenção e PII v0.1.0 revisada e formalmente aprovada;
- chaves naturais e semântica de revisão confirmadas;
- fórmula do primeiro dashboard versionada;
- testes de isolamento e reprocessamento definidos;
- nenhum efeito de venda, estoque ou provider ativado pelo Intelligence.

## 14. Resultado do gate D4

A revisão contra Constituição, Blueprints, CDM e ADR-010 foi concluída. O modelo reutiliza três
blocos já existentes/aprovados (`IntegrationConnection`, `ExternalMessageReceipt`,
`ExternalCatalogLink`) e o contrato `ExternalOrder`, evitando conexões, inbox, catálogo, venda,
estoque e CMV paralelos.

A decisão material de persistência e propriedade foi registrada no ADR-011 v1.0.0 — Approved. A
política inicial de retenção e PII v1.0.0 foi aprovada no Gate C. A Anota AI read-only e o recorte de
pedidos homologados foram autorizados como primeira fonte; desenvolvimento e testes estão liberados,
mas ingestão produtiva e qualquer efeito operacional permanecem bloqueados até gates próprios.

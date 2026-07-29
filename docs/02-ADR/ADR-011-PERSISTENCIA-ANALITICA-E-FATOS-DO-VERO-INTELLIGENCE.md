# ADR-011 — Persistência analítica e propriedade dos fatos do VERO Intelligence

## Controle

| Campo | Valor |
|---|---|
| Identificador | ADR-011 |
| Versão | 0.1.0 |
| Estado | Proposed |
| Data | 2026-07-29 |
| Escopo | VERO Intelligence |
| Autoridade de aprovação | Arquiteto-Chefe |

## Contexto

A VERO já possui catálogo, ficha técnica, compras, estoque, produção, vendas, CMV e margem na MISSÃO 008, além do Integration Hub, do Connector Anota AI, do contrato ExternalOrder e dos vínculos de catálogo aprovados no ADR-010.

O VERO Intelligence precisa preservar pedidos, linhas, ajustes e dados financeiros externos como fatos históricos reconciliáveis, calcular métricas reproduzíveis e sustentar dashboards, alertas e recomendações. Esses dados não são:

- a mensagem externa recebida, pertencente ao Integration Hub;
- o DTO privado de um provider;
- a venda nativa simplificada existente;
- um pedido operacional autorizado a produzir efeitos;
- um novo catálogo, estoque ou ledger financeiro paralelo.

Sem uma decisão explícita há risco de duplicar Integration Hub, transformar Intelligence em sistema operacional de pedidos, acessar tabelas de outros módulos, reescrever fatos históricos, materializar métricas sem procedência e introduzir uma plataforma de dados incompatível com o Modular Monolith.

## Decisão proposta

1. Criar o bounded context Business Intelligence no grupo Business.
2. Atribuir ao Business Intelligence a propriedade de ChannelOrderFact, ChannelOrderLineFact, OrderAdjustmentFact, OrderFinancialFact, MetricDefinition e MetricObservation.
3. Definir ChannelOrderFact como projeção analítica append-only de uma revisão provider-neutral de pedido externo. Ele não é Aggregate operacional de pedido, não é venda concluída e não produz baixa de estoque.
4. Manter IntegrationConnection, ExternalMessageReceipt, IngestionRun e IngestionCheckpoint no Platform Integration Hub.
5. Manter autenticação, DTOs, schemas e tradução específica em packages/integrations por provider.
6. Entregar ao Intelligence somente contratos públicos versionados e sanitizados. Payload externo não é contrato canônico e não atravessa a fronteira do provider.
7. Persistir o MVP no PostgreSQL aprovado pelo ADR-003, com propriedade lógica exclusiva do módulo, repositories próprios e proibição de acesso direto às tabelas de Catalog, Inventory, Production, Sales ou Integration Hub.
8. Referenciar fatos de outros módulos por identidades e contratos públicos. Snapshots necessários ao cálculo são copiados de forma explícita, imutável e rastreável.
9. Tornar fatos e revisões analíticas imutáveis. Correções criam nova revisão; a visão atual é derivada.
10. Adotar chaves naturais tenant-aware e idempotentes. Nenhum identificador externo resolve Tenant ou estabelecimento sozinho.
11. Calcular métricas por MetricDefinition versionada, com fórmula, arredondamento, componentes obrigatórios, política de ausência e proprietário.
12. Preferir consultas e views reproduzíveis no MVP. MetricObservation será materializada apenas quando desempenho, auditoria ou preservação histórica exigirem.
13. Não adotar data warehouse, lakehouse, banco analítico separado ou nova tecnologia de persistência no MVP.
14. Exigir política de retenção por dataSet antes de sua ativação. Ausência de política bloqueia ingestão produtiva daquele conjunto.
15. Excluir PII do fato analítico padrão. Dados de cliente, telefone, endereço e coordenadas não serão copiados sem finalidade, base e política aprovadas.
16. Manter o Intelligence read-only em relação a providers e módulos transacionais. Alterar preço, promoção, pedido, venda ou estoque exige caso de uso separado, autorização humana e ADR quando material.
17. Proibir IA de escrever fatos, alterar ledger ou substituir fórmulas determinísticas.

## Fronteiras

~~~mermaid
flowchart TD
    P["Provider ou arquivo oficial"] --> C["Connector e ACL"]
    C --> H["Integration Hub"]
    H --> E["Contrato público sanitizado"]
    E --> I["Business Intelligence"]
    I --> M["Métricas e evidências"]
    M --> D["Dashboard, alertas e recomendações"]
~~~

### Platform Integration Hub

Possui conexão, health, kill switch, inbox, deduplicação, execução, checkpoint, replay e auditoria de ingestão. Não calcula margem nem possui fatos comerciais reconciliados.

### Integrations

Possuem OAuth, endpoints, DTOs, schemas, rate limit e Anti-Corruption Layer específicos. Não possuem modelo analítico nem escrevem em Business.

### Business Intelligence

Possui fatos reconciliados, definições de métricas, observações materializadas, completude, qualidade, explicações e recomendações. Não opera pedidos nem modifica ledgers transacionais.

### Módulos transacionais

Catalog, Purchasing, Inventory, Production e Sales continuam soberanos sobre seus agregados e dados. O Intelligence consome apenas contratos públicos, eventos aprovados ou snapshots autorizados.

## Persistência e isolamento

- todas as tabelas, índices, queries e caches incluem Tenant explícito;
- invariantes e chaves compostas impedem referência cruzada entre tenants;
- cada revisão de pedido possui hash semântico, receiptId, ingestionRunId, schemaVersion e tempos da fonte/ingestão;
- reprocessamento é idempotente e auditado;
- checkpoint só avança após persistência durável;
- arquivos possuem checksum, competência, versão e relatório de rejeições;
- reconciliação financeira acrescenta revisão e não sobrescreve o pedido operacional;
- views de leitura não concedem acesso direto a tabelas de outro módulo.

A organização física final dos schemas Prisma será detalhada no Design e na migration da implementação, preservando a propriedade lógica definida aqui e as restrições do ADR-003.

## Completude obrigatória

Nenhuma métrica financeira é publicada sem:

- sourceCompleteness;
- catalogReconciliationCoverage;
- financialCompleteness;
- dataQualityStatus;
- componentes ausentes;
- versão da fórmula;
- referências ou hash dos fatos de origem.

Margem parcial deve ser identificada como parcial. ROI promocional permanece bloqueado sem custo financiado, baseline, janela e regra de atribuição comprovados.

## Retenção e LGPD

A retenção será configurada por dataSet e ambiente. Antes de habilitar um conjunto em produção devem existir:

- finalidade declarada;
- classificação dos campos;
- política de retenção e exclusão;
- necessidade de replay;
- controle de acesso;
- trilha de auditoria;
- tratamento de solicitações do titular quando aplicável.

Metadados de procedência podem sobreviver ao payload quando necessários à auditoria, sem reter PII desnecessária. O ADR não fixa prazo jurídico universal; o prazo depende do conjunto, finalidade e obrigação aplicável.

## Alternativas consideradas

### Colocar ChannelOrderFact no Integration Hub

Rejeitada. O Hub recebe e entrega dados; não deve se tornar dono de semântica comercial, CMV ou margem.

### Colocar ChannelOrderFact em Sales

Rejeitada para o primeiro corte. Sales representa venda terminal nativa. Um fato externo analítico não pode ampliar implicitamente seu agregado nem habilitar efeitos transacionais.

### Persistir somente agregados diários

Rejeitada. Sem fatos de base, reconciliação, auditoria, correção de fórmula e explicabilidade ficam comprometidas.

### Criar data warehouse desde o início

Rejeitada no MVP. Acrescenta tecnologia, sincronização e operação antes de volume ou necessidade comprovados.

### Calcular tudo em tempo real sem definições versionadas

Rejeitada. Resultados históricos mudariam silenciosamente quando fórmulas fossem alteradas.

## Consequências positivas

- reuso integral das MISSÕES 008 e 009;
- separação entre mensagem, fato, transação e métrica;
- explicabilidade e auditoria por construção;
- suporte provider-neutral para Anota AI, iFood e arquivos oficiais;
- evolução compatível com Modular Monolith e extração futura por evidência;
- redução do risco de baixa, venda ou mutação indevida.

## Custos e riscos

- novas tabelas append-only e índices tenant-aware;
- necessidade de contratos públicos entre módulos;
- custo de reprocessamento e reconciliação;
- crescimento de volume histórico;
- disciplina de retenção e minimização;
- dashboards devem representar completude sem induzir certeza falsa.

## Critérios de aprovação

- conformidade com Constituição, Blueprints, CDM e ADR-001/003/005/010;
- aceite da propriedade de ChannelOrderFact pelo Business Intelligence;
- aceite de PostgreSQL como persistência do MVP;
- aceite de fatos append-only, métricas versionadas e completude obrigatória;
- aceite de read-only em relação a providers e módulos transacionais;
- definição da política inicial de retenção antes do runtime produtivo.

## Referências

- VERO-CONST-001 — princípios, modelo modular, governança e evolução;
- VERO-BLP-001 — packages, propriedade de dados, contratos e dependências;
- VERO-BLP-002 — eventos, identificadores, superfícies públicas e testes;
- VERO-CDM-001 §§ 4, 6.7, 7.1–7.3 e 9–10;
- ADR-001 — Modular Monolith;
- ADR-003 — PostgreSQL, Prisma e mensageria;
- ADR-005 — observabilidade;
- ADR-010 — Integration Hub e Connector Anota AI;
- VERO-INTELLIGENCE-MINIMUM-CANONICAL-MODEL.

## Histórico

| Versão | Data | Alteração | Estado |
|---|---|---|---|
| 0.1.0 | 2026-07-29 | Proposta inicial de persistência analítica e propriedade dos fatos | Proposed |

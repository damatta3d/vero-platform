# VERO Intelligence — arquitetura executiva

## Controle

| Campo | Valor |
|---|---|
| Estado | Arquitetura e Gate C aprovados; implementação produtiva permanece bloqueada |
| Data | 2026-07-29 |
| Branch | agent/vero-intelligence-discovery |
| Implementação | Corte vertical read-only autorizado; ainda não iniciado |
| ADR material | ADR-011 v1.0.0 — Approved |

## 1. Resultado executivo

O VERO Intelligence será uma capacidade Business provider-neutral que transforma dados autorizados em fatos comerciais reconciliados, métricas determinísticas, explicações, alertas e recomendações.

Ele reutiliza o catálogo, ficha técnica, estoque, produção, vendas, CMV e margem da MISSÃO 008 e o Integration Hub, a inbox, o Connector Anota AI e os vínculos externos da MISSÃO 009. Não cria ERP paralelo, não copia DTO de provider para o domínio e não altera preço, promoção, pedido ou estoque automaticamente.

## 2. Fontes e níveis de evidência

| Fonte | Uso autorizado no discovery | Situação |
|---|---|---|
| Anota AI | pedidos e cardápio homologados em read-only | primeira fonte candidata ao MVP |
| iFood APIs | desenho baseado em documentação oficial | onboarding, escopos e payloads reais pendentes |
| Portal do Parceiro iFood | inventário de telas e exportações oficiais | validação autenticada sem scraping pendente |
| CSV/XLSX | backfill por arquivo oficial com schema e checksum | design previsto |
| Google Sheets/Drive | transporte/importação governada, não fonte soberana | etapa posterior |
| PostgreSQL VERO | fonte transacional e persistência analítica do MVP | aprovado pela stack |
| BI externo | consumo futuro por contrato de leitura | fora do MVP |

A existência de documentação pública não prova que um escopo foi concedido à VERO. Ausência de evidência permanece como não comprovada.

## 3. Arquitetura

~~~mermaid
flowchart TD
    S["iFood, Anota AI e arquivos"] --> A["Connectors e ACL"]
    A --> H["Integration Hub"]
    H --> F["Fatos reconciliados"]
    F --> E["Metrics Engine"]
    E --> R["Recommendation Engine"]
    R --> D["Dashboards e alertas"]
~~~

### Fluxo de ingestão

1. Connection resolve Tenant, estabelecimento, provider, credencial e kill switch.
2. Connector autentica, aplica rate limit e traduz DTO privado.
3. ExternalMessageReceipt deduplica e registra procedência sanitizada.
4. IngestionRun e Checkpoint controlam janela, arquivo, backfill e avanço seguro.
5. Business Intelligence cria revisão imutável de ChannelOrderFact.
6. Linhas são reconciliadas somente por ExternalCatalogLink explícito.
7. CMV estimado e realizado são obtidos por contratos públicos dos donos transacionais.
8. MetricDefinition calcula valor e completude.
9. Dashboard expõe resultado, fórmula, período, origem, versão e lacunas.
10. Recommendation Engine propõe ação; nenhuma ação é executada sem fluxo próprio e autorização.

## 4. Modelo de domínio mínimo

### Reutilizados

- Tenant, estabelecimento e contextos confiáveis;
- CatalogProduct, ficha técnica e preço;
- Inventory ledger e custo médio;
- Production e Sales snapshots;
- IntegrationConnection;
- ExternalMessageReceipt;
- ExternalCatalogLink;
- ExternalOrder como contrato de entrada.

### Novos

| Conceito | Owner | Finalidade |
|---|---|---|
| IngestionRun | Platform Integration Hub | auditoria de uma execução |
| IngestionCheckpoint | Platform Integration Hub | cursor/janela confirmada |
| ChannelOrderFact | Business Intelligence | revisão imutável de pedido externo |
| ChannelOrderLineFact | Business Intelligence | item ou complemento observado |
| OrderAdjustmentFact | Business Intelligence | desconto, taxa, comissão ou subsídio |
| OrderFinancialFact | Business Intelligence | visão financeira oficial reconciliada |
| MetricDefinition | Business Intelligence | fórmula versionada |
| MetricObservation | Business Intelligence | resultado materializado quando necessário |

Visit, Conversion, Customer mestre, Promotion canônica, Trend e Recommendation persistida ficam adiados até fonte, histórico e contrato suficientes.

## 5. Intelligence Engine

O motor possui cinco estágios independentes:

1. Quality: valida moeda, soma, duplicidade, timestamps, schemas e lacunas.
2. Reconciliation: associa estabelecimento, item, complemento, produto, ficha e venda terminal.
3. Metrics: calcula apenas fórmulas versionadas e determinísticas.
4. Insight Rules: detecta padrões explicáveis por regras e limiares versionados.
5. AI Explanation: resume evidências, hipóteses e ações; não altera fatos.

### Métricas iniciais

| Escopo | Métricas |
|---|---|
| Produto | quantidade, faturamento, desconto, ticket atribuível, CMV estimado/realizado, margem e cobertura |
| Categoria | participação, crescimento, margem e mix quando Catalog suportar categoria |
| Restaurante | pedidos, faturamento, ticket, margem observável e recorrência somente com identidade válida |
| Promoção | volume e desconto observado; ROI bloqueado até atribuição e custo comprovados |
| Operação | cancelamento e tempos apenas quando eventos oficiais fornecerem o ciclo completo |
| Financeiro | receita líquida, taxas e repasses somente após fonte oficial reconciliada |

## 6. Recomendações explicáveis

Toda recomendação contém:

- hipótese;
- escopo e período;
- evidências e fatos de origem;
- fórmula e versão;
- completude e confiança;
- impacto esperado como intervalo, nunca certeza;
- risco e contraindicação;
- validade temporal;
- opção de aceitar, rejeitar ou adiar;
- autoria humana quando convertida em ação.

Exemplos como aumentar preço, suspender promoção ou reorganizar item serão inicialmente simulações. Ação automática permanece proibida.

## 7. Dashboard executivo

### MVP

- visão geral de pedidos, faturamento e ticket;
- ranking de produtos por quantidade e receita;
- CMV e margem observável por produto;
- cobertura de reconciliação do catálogo;
- qualidade e completude dos dados;
- origem e atualização de cada indicador.

### Evolução

| Etapa | Painéis |
|---|---|
| Sprint 1 | financeiro, taxas, repasses, promoções e conciliação |
| Sprint 2 | categorias, horários, avaliações, clientes válidos e funil quando disponível |
| Sprint 3 | menu engineering, ABC, tendências, simulações e recomendações |
| Enterprise | redes, múltiplas lojas, benchmarking governado, SLA e escala ampliada |

Mapa de calor, funil e conversão só aparecem quando a fonte oficial correspondente estiver comprovada.

## 8. APIs e integrações

### iFood

Capacidades oficiais documentadas: Authentication, Merchant, Catalog v2, Order, Events, Promotion v2, Financial Sales, Financial Events, Reconciliation, Settlement, Anticipation e Reviews v2. O acesso real depende de cadastro, consentimento, scopes e homologação. Rate limits não comprovados permanecem pendentes; Reviews possui limite público registrado na matriz específica.

### Anota AI

A documentação oficial pública cobre OAuth, pedidos, cardápio e boas práticas. A VERO homologou em read-only autenticação, page-id, lista/detalhe de pedido e exportação de cardápio. Clientes, financeiro, estoque, rate limits e outros relatórios permanecem não comprovados fora dos payloads observados.

### Arquivos

CSV e XLSX serão tratados por importadores versionados:

- schema e versão;
- Tenant e estabelecimento explícitos;
- checksum;
- período e timezone;
- pré-visualização;
- linhas aceitas/rejeitadas;
- idempotência;
- relatório de erros;
- aprovação antes da ingestão.

PDF não será fonte estruturada primária quando houver CSV/XLSX/API oficial.

## 9. Multi-tenancy, segurança e LGPD

A política técnica inicial está materializada em
`VERO-INTELLIGENCE-DATA-RETENTION-AND-PII-POLICY.md` como v1.0.0 — Approved. Ela define
classificação, pseudonimização, prazos por dataset, expurgo, backups e critérios do Gate C.

- Tenant e estabelecimento fazem parte de toda chave, query e cache;
- IDs externos nunca resolvem Tenant isoladamente;
- conexão e dataset possuem kill switch;
- secrets ficam por referência e nunca em documento, log ou fixture;
- PII é excluída dos fatos padrão;
- arquivos e rejeições possuem controle de acesso;
- reprocessamento, reconciliação e materialização são auditados;
- políticas de retenção são obrigatórias por dataset;
- testes de isolamento e redaction bloqueiam merge.

## 10. Observabilidade

Indicadores técnicos:

- atraso de ingestão;
- taxa de sucesso, rejeição e duplicidade;
- avanço de checkpoint;
- idade do último dado;
- cobertura de vínculo;
- completude financeira;
- divergência de soma;
- falhas por provider sem PII;
- tempo e custo de cálculo;
- versão da fórmula em uso.

Valores de alta cardinalidade, IDs de pedido, telefone, endereço e tokens não entram em labels de métricas.

## 11. Roadmap e esforço

| Marco | Entrega | Estimativa |
|---|---|---:|
| Discovery/gate | fontes, matrizes, arquitetura e ADR-011 | 8–12 dias de engenharia |
| MVP | Anota AI read-only, fatos, reconciliação, CMV/margem e dashboard | 15–25 dias |
| Sprint 1 | iFood pedidos/financeiro, conciliação e promoções | 15–25 dias |
| Sprint 2 | categorias, horários, avaliações, funil e clientes válidos | 15–25 dias |
| Sprint 3 | regras, simulações, alertas e explicações de IA | 20–30 dias |
| Enterprise | redes, governança avançada e escala | 30–60+ dias |

Estimativas serão recalibradas após onboarding iFood, política de retenção e validação do Portal.

## 12. Riscos e controles

| Risco | Severidade | Controle |
|---|---|---|
| API operacional tratada como analytics completo | Alta | matriz por campo e nível de evidência |
| duplicação de Integration Hub, Sales ou CMV | Alta | owners definidos no ADR-011 |
| item externo associado incorretamente | Alta | vínculo explícito e fila de pendências |
| margem publicada como completa sem dados | Alta | completude obrigatória |
| reprocessamento duplicar fatos | Alta | chave natural, revisão e hash |
| PII retida sem necessidade | Alta | minimização e policy gate |
| IA afirmar causalidade inexistente | Alta | evidência, intervalo e human-in-the-loop |
| mudança de contrato/rate limit | Média | adapter versionado e homologação |
| crescimento do histórico | Média | retenção, índices e materialização seletiva |

## 13. Gates

### Gate A — Discovery

Matrizes oficiais, lacunas e comparação concluídas.

### Gate B — Arquitetura

Concluído em 2026-07-29. O modelo mínimo e o ADR-011 foram revisados; o ADR-011 v1.0.0 foi aprovado formalmente pelo Arquiteto-Chefe.

### Gate C — Governança de dados e implementação read-only

Concluído em 2026-07-29.

- política de retenção e PII v1.0.0 aprovada formalmente;
- Anota AI read-only aprovada como primeira fonte, limitada a pedidos já homologados;
- PII direta, payload bruto e texto livre excluídos do recorte;
- desenvolvimento e testes read-only do primeiro corte vertical autorizados;
- ingestão produtiva, webhooks e mutações de provider, Sales ou Inventory permanecem bloqueados.

### Gate D — Homologação

Executar com payloads reais sanitizados, isolamento entre tenants, replay, falha, duplicidade, reconciliação e completude.

### Gate E — IA e ações

Somente após motor determinístico e contrato de evidências. Ações continuam humanas até decisão arquitetural própria.

## 14. Critérios de aceite do MVP

- nenhum agregado da MISSÃO 008 ou 009 duplicado;
- fatos append-only e tenant-aware;
- Anota AI permanece read-only;
- vínculo explícito para CMV;
- fórmula e versão visíveis;
- margem parcial identificada;
- reprocessamento idempotente;
- PII ausente do fato padrão;
- dashboard responsivo com procedência;
- testes unitários, integração PostgreSQL, arquitetura, segurança e isolamento aprovados;
- nenhuma mudança automática de preço, promoção, venda ou estoque.

## 15. Fontes oficiais

- documentação iFood Developer para Authentication, Merchant, Catalog, Order, Events, Promotion, Financial e Reviews;
- Blog iFood Parceiros para Relatório de Pedidos, Conciliação e Tela de Desempenho;
- documentação oficial Anota AI em integ-public-platform-docs.anota.ai;
- documentação normativa e código integrado da VERO Platform.

As matrizes especializadas registram URLs, evidência, formato e limitações por capacidade.

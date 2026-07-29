# VERO-INT-001 — Design do Connector Anota AI

## Controle do documento

| Campo | Valor |
|---|---|
| Identificador | `VERO-INT-001` |
| Versão | `0.1.0` |
| Estado | Draft |
| Data | 2026-07-29 |
| Missão | MISSÃO 009 |
| Tenant piloto | O Santo Parma |
| Baseline | `main` em `34fdcf456c551bcd580299effde6d500fc5b405d` |

## 1. Objetivo

Definir a primeira integração operacional da VERO com a Anota AI sem permitir que contratos,
estados ou indisponibilidades do fornecedor contaminem o domínio da plataforma.

O conector deve ser reutilizável, tenant-aware, desligável e seguro. A VERO continuará operando
sem a Anota AI, e nenhuma credencial, DTO externo ou regra específica do fornecedor poderá ser
incorporada a módulos Business, Core ou Shared Kernel.

## 2. Fontes e grau de confirmação

### 2.1 Fontes normativas internas

- Constituição `VERO-CONST-001 v1.0.0`, especialmente CH02 §§ 3.5, 3.8–3.11 e CH05 §§ 3.2–3.6;
- Blueprint Volume I §§ 8.3–8.5, 9, 11 e 12;
- Blueprint Volume II §§ 17, 20 e 21;
- CDM `VERO-CDM-001 v0.1.0`, especialmente §§ 7.3, 9 e 10;
- ADR-003, ADR-004 e ADR-005;
- Engineering Playbook `VERO-ENG-001 v1.1.0`.

### 2.2 Fatos externos confirmados

| Fato | Evidência | Uso permitido |
|---|---|---|
| Existe documentação oficial no Stoplight sob “API de Pedidos” | Portal oficial Anota AI | Contratos implementados no PR #9 |
| OAuth 2.0 usa `client_credentials` | Documentação oficial + smoke real | Autenticação do conector |
| Estabelecimento é informado por `x-page-id` | Documentação oficial + smoke real | Isolamento da conexão |
| Consulta e detalhe de pedidos são read-only | Documentação oficial + smoke real | Homologação segura |
| Exportação do cardápio está disponível | Documentação oficial + smoke real | Mapeamento de catálogo |
| Existe operação para inserir ID externo em item | Página oficial + contrato implementado | Candidato futuro de mapeamento |
| Existem contratos para vínculo de página e webhooks | Documentação oficial | Não ativados |
| Contato oficial indicado: `integracao@anota.ai` | Página oficial “API Cardápio” | Esclarecimentos/homologação |
| Cadastro do integrador foi atualizado para “VERO Platform” em 28/07/2026 | Comunicação da Anota AI | Homologação |
| Smoke read-only autenticou e encontrou 30 categorias e 1 pedido | CI `30471438277` | Evidência de conectividade |
| Pedido real foi traduzido com 2 itens, 4 adicionais, 1 desconto e 1 pagamento | CI `30471438277` | Evidência da ACL |

### 2.3 Contratos ainda não confirmados

Nenhum dos itens abaixo será inferido a partir de documentação antiga, exemplos de terceiros ou
comportamento observado sem contrato:

- scopes concedidos e processo de rotação;
- busca incremental e garantias de ordenação;
- catálogo de estados e transições válidas;
- autenticação, replay e ativação operacional dos webhooks;
- garantias de idempotência das operações externas;
- limites de requisição e cabeçalhos de rate limit;
- política de versionamento e descontinuação;
- formato de `additionalFees` quando não vazio;
- roteiro formal de aprovação e ativação em produção.

Essas lacunas não bloqueiam o smoke read-only já aprovado, mas bloqueiam webhooks ativos, retry de
mutação, conversão em venda e operação em produção.

## 3. Descoberta crítica sobre o domínio atual

O módulo `business/sales` da baseline representa uma venda já concluída de um único produto VERO.
Seu contrato recebe somente `productId`, `quantity` e `idempotencyKey`; ele calcula preço pela
ficha local e baixa estoque imediatamente.

Um pedido externo pode possuir múltiplos itens, adicionais, preço praticado, descontos, frete,
forma de pagamento, observações e ciclo de status. Portanto, converter diretamente um pedido
Anota AI em `SalesService.recordSale` perderia semântica e poderia:

- baixar estoque antes da conclusão operacional;
- calcular faturamento diferente do valor cobrado;
- ignorar adicionais, descontos e taxas;
- duplicar efeitos durante reprocessamento;
- impedir cancelamento correto;
- misturar pedido recebido com venda realizada.

**Decisão de design:** o conector não chamará `SalesService.recordSale`. O PR #9 introduz um
contrato provider-neutral `ExternalOrder` na superfície pública de `business/sales`, sem persistir
pedido, criar venda ou baixar estoque. Essa é a fronteira inicial de Order Intake. A geração de
venda será uma etapa posterior, idempotente e disparada somente por estado terminal confirmado.

## 4. Fronteiras propostas

### 4.1 Integration Hub

Capacidade Platform, neutra em relação ao fornecedor, responsável por:

- ciclo de vida de `IntegrationConnection`;
- resolução obrigatória de tenant e estabelecimento;
- referência de credencial, nunca o segredo;
- inbox durável e deduplicação;
- política de execução, pausa e kill switch;
- contratos de health, auditoria, telemetria e falha;
- portas para relógio, IDs, secrets, transporte e persistência.

O Integration Hub não conhece DTOs, endpoints ou estados da Anota AI.

### 4.2 Connector Anota AI

Módulo Integrations responsável por:

- schemas de borda e DTOs externos privados;
- cliente HTTP e autenticação confirmados oficialmente;
- Anti-Corruption Layer;
- tradução de falhas externas;
- estratégia de captura confirmada pela documentação;
- mapeamento entre IDs externos e IDs VERO;
- comandos externos explicitamente autorizados.

Nenhum tipo da Anota AI será exportado como contrato público VERO.

### 4.3 Order Intake em Sales

Capacidade Business iniciada pelo contrato `ExternalOrder`, responsável futuramente por:

- pedido, linhas, adicionais e valores efetivamente cobrados;
- estados internos e transições;
- vínculo imutável com origem externa;
- cancelamento e conclusão;
- comando idempotente que, quando aprovado, poderá originar venda e baixa de estoque.

O conector depende somente da superfície pública provider-neutral. `business/sales` não depende do
conector nem conhece a Anota AI. A separação em novo módulo ocorrerá apenas se o ciclo de pedidos
demonstrar autonomia suficiente para justificar outra fronteira.

## 5. Fluxo seguro por etapas

### Etapa 1 — Conectividade read-only

1. Resolver `tenantId` e `connectionId`.
2. Obter credenciais protegidas do ambiente de CI; integração com `SecretProvider` permanece
   obrigatória antes de runtime compartilhado.
3. Consultar cardápio, lista e detalhe de pedido oficialmente documentados.
4. Validar o payload na borda.
5. Registrar somente metadados operacionais permitidos.
6. Emitir health, métricas e auditoria sem PII ou segredo.

Este fluxo foi aprovado no CI `30471438277`. Nenhum estoque, venda, produção ou estado externo foi
alterado.

### Etapa 2 — Captura e inbox

1. Receber por polling ou webhook, conforme contrato oficial.
2. Validar origem/autenticidade.
3. Calcular a chave de deduplicação oficial ou uma chave VERO documentada.
4. Persistir o recebimento na inbox antes do processamento.
5. Traduzir o payload por ACL.
6. Marcar processamento, falha recuperável ou quarentena.

A garantia interna será **at-least-once com efeitos idempotentes**, nunca “exactly once”.

### Etapa 3 — Order Intake

1. Resolver mapeamentos de produtos e adicionais.
2. Criar ou atualizar o pedido por contrato público versionado.
3. Preservar valores externos como snapshot.
4. Impedir efeito empresarial quando houver mapeamento incompleto.
5. Manter divergências em fila operacional para correção.

### Etapa 4 — Ações externas

Aceitar, cancelar, marcar pronto ou finalizar somente quando:

- endpoints e transições estiverem confirmados;
- a operação tiver autorização explícita;
- retry for seguro ou protegido por idempotência;
- a resposta externa estiver auditada;
- o estado interno não for antecipado antes da confirmação externa.

### Etapa 5 — Venda e estoque

Somente um estado terminal confirmado poderá acionar a porta pública de venda. O efeito usará chave
estável derivada de `tenantId + connectionId + externalOrderId + terminalEvent`, e reprocessamento
não poderá gerar nova baixa.

## 6. Modelo lógico mínimo

### IntegrationConnection

- `id`;
- `tenantId`;
- `provider`;
- `externalEstablishmentId`;
- `credentialReference`;
- `status`;
- `mode`;
- `lastSuccessfulSyncAt`;
- `createdAt`, `updatedAt`;
- autoria e versão.

Chave única: `tenantId + provider + externalEstablishmentId`.

### ExternalMessageReceipt

- `id`;
- `tenantId`;
- `connectionId`;
- `externalMessageId` ou hash estável aprovado;
- `messageType`;
- `externalOccurredAt`;
- `receivedAt`;
- `payloadHash`;
- `schemaVersion`;
- `processingStatus`;
- `attemptCount`;
- `lastErrorCode`;
- correlação e causalidade.

Chave única de deduplicação definida após confirmação do contrato oficial.

### ExternalEntityMapping

- `tenantId`;
- `connectionId`;
- `entityType`;
- `externalId`;
- `veroId`;
- `mappingStatus`;
- autoria e versão.

Chave única: `tenantId + connectionId + entityType + externalId`.

Payload bruto com dados pessoais não será persistido por padrão. Qualquer necessidade diagnóstica
exigirá minimização, criptografia, prazo de retenção e controle de acesso definidos antes do uso.

## 7. Segurança

- segredos fora de código, Git, documentação, banco em texto aberto e logs;
- `credentialReference` persistida, segredo resolvido apenas no uso;
- falha fechada quando tenant, conexão, autorização ou segredo não forem válidos;
- TLS e timeout obrigatórios;
- redaction de headers, tokens, telefone, endereço e payload pessoal;
- proteção contra replay quando houver webhook;
- rotação de credencial sem recriar a conexão;
- menor privilégio e scopes mínimos;
- kill switch por conexão e global;
- nenhuma credencial real em fixture, teste ou artefato de CI.

ADR-004 permite environment apenas em desenvolvimento local. Homologação compartilhada e produção
dependem de decisão própria para secret store.

## 8. Resiliência

- retry somente em leitura ou operação comprovadamente idempotente;
- backoff exponencial com jitter e limite;
- circuit breaker por conexão;
- limite de concorrência e respeito ao rate limit oficial;
- inbox para redelivery;
- quarentena/DLQ após esgotamento;
- reprocessamento manual auditado;
- timeout e cancelamento explícitos;
- isolamento de falha: uma conexão não bloqueia outros tenants.

Publicação transacional confiável exige outbox/inbox conforme ADR-003. Até sua implementação, o
design não prometerá entrega atômica entre banco e RabbitMQ.

## 9. Observabilidade e auditoria

Métricas mínimas:

- chamadas, latência e erros por operação/provider, sem ID de tenant de alta cardinalidade;
- idade da última sincronização bem-sucedida;
- tamanho e idade da inbox;
- duplicatas descartadas;
- falhas de mapeamento;
- circuit breaker aberto;
- divergências de estado.

Logs usarão `correlationId`, `connectionId` pseudonimizado, operação e código de resultado. Auditoria
registrará autoria, ação, alvo, instante e resultado, sem substituir logs ou eventos.

## 10. Estratégia de testes

- testes de contrato com fixtures versionadas provenientes da documentação oficial;
- schemas rejeitando campos, tipos e estados inválidos;
- ACL sem importar DTO externo no domínio;
- autenticação sem vazamento de segredo;
- timeout, retry, rate limit e circuit breaker;
- duplicata, replay, redelivery e quarentena;
- isolamento positivo e negativo entre tenants;
- mapeamento incompleto sem efeito empresarial;
- regressão provando que a VERO funciona com o conector desligado;
- smoke test read-only na homologação;
- teste controlado de mutação somente após autorização específica.

## 11. Gates

### Gate A — Pesquisa, prova read-only e desenho

- [x] contratos oficiais essenciais catalogados;
- [x] cliente, ACL e smoke read-only implementados em PR Draft;
- [x] conectividade real sem exposição de dados;
- [ ] lacunas operacionais respondidas pela Anota AI;
- [ ] ADR-010 aprovado;
- [ ] Design Document aprovado;
- nenhum segredo versionado.

### Gate B — Fundação governada

- Integration Hub mínimo ou composição explicitamente aderente à decisão aprovada;
- conexão tenant-aware;
- SecretProvider adequado ao ambiente;
- timeout próprio e redaction;
- lifecycle de conexão e health;
- persistência dos vínculos com auditoria;
- contract tests.

### Gate C — Captura e Order Intake

- inbox/deduplicação;
- ACL;
- mapeamento de catálogo;
- contrato público de Order Intake;
- isolamento e reprocessamento.

### Gate D — Ações e homologação

- transições externas confirmadas;
- autorização e auditoria;
- venda terminal idempotente;
- testes reais controlados;
- parecer técnico final.

## 12. Fora do escopo inicial

- sincronização completa bidirecional de cardápio;
- preços e disponibilidade em massa;
- importação histórica;
- conciliação financeira;
- logística e entregadores;
- marketing, CRM e dados analíticos;
- suporte simultâneo ao iFood;
- promessas de exactly-once.

## 13. Questões formais para a Anota AI

1. Quais scopes são disponibilizados à VERO Platform?
2. Como consultar pedidos incrementalmente com ordenação estável?
3. Como validar autenticidade e impedir replay nos webhooks?
4. Quais são os estados e transições válidas?
5. Quais operações aceitam chave de idempotência?
6. Quais limites e cabeçalhos de rate limit são aplicados?
7. Qual é a política de versão e descontinuação?
8. Qual é o formato de `additionalFees` quando não vazio?
9. Quais passos e evidências liberam a integração para produção?

## 14. Critério para iniciar código

O cliente e a tradução read-only já existem no PR #9 e permanecem em Draft. Nenhum webhook, ação
externa, criação de venda ou baixa de estoque poderá ser ativado antes da aprovação do ADR-010,
deste Design Document e dos contratos operacionais pendentes.

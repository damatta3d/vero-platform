# ADR-006 — Core Platform e Shared Kernel da VERO Platform

## Controle do documento

| Campo | Valor |
|---|---|
| Identificador | ADR-006 |
| Título | Core Platform e Shared Kernel — Responsabilidades, Limites, Inclusão e Exclusão |
| Versão | 0.1.0 |
| Estado | Proposed — aguardando revisão arquitetural |
| Data | 2026-07-27 |
| Autoridade de aprovação | Arquiteto-Chefe |
| Responsável pela materialização | Engenharia Oficial |
| Decisão estrutural | Sim |
| Depende de | ADR-001, ADR-002 e VERO-CDM-001 |
| Substitui | Nenhum ADR |

## 1. Contexto

A Constituição define Core Platform e Shared Kernel como elementos distintos. O Canonical Domain Model estabelece os conceitos fundamentais sem impor implementação. O Blueprint Volume II prevê capacidades Core e um catálogo de famílias candidatas ao Shared Kernel, mas exige ADR para a decomposição inicial e para o catálogo efetivamente materializado. Sem limites explícitos, ambos poderiam virar depósitos genéricos ou antecipar módulos de negócio.

## 2. Problema

Definir responsabilidades, dependências, critérios de admissão e exclusão para que a Sprint 0 possa criar somente a fundação mínima, preservando ownership, linguagem canônica, independência de frameworks e evolução controlada.

## 3. Decisão

Se aprovado, este ADR estabelece:

### 3.1 Core Platform

1. Core Platform conterá capacidades fundamentais necessárias ao funcionamento seguro e contextual da plataforma, sem regras específicas de domínios empresariais.
2. A topologia inicial autorizada será:
   - `identity`: principal e contexto de identidade, sem protocolo concreto como regra de domínio;
   - `access`: contratos e decisões contextuais de autorização, sem políticas empresariais;
   - `tenancy`: identidade e contexto de Tenant, sem acesso aos dados dos consumidores;
   - `organization`: referência estrutural de Organization, sem processos empresariais;
   - `user`: referência estrutural de User, sem perfil funcional de negócio;
   - `workspace`: contexto operacional de Workspace, sem agregados empresariais;
   - `configuration`: contratos tipados de configuração, conforme ADR-004.
3. Cada capacidade Core será projeto Nx autônomo somente quando possuir responsabilidade materializada, owner, superfície pública e testes.
4. Diretórios vazios ou abstrações especulativas não serão criados para completar a topologia.
5. Core não dependerá de Business, integrations concretas ou implementações de Infrastructure.
6. Dependências entre capacidades Core serão excepcionais, públicas, acíclicas e justificadas.
7. Modelagem detalhada de Identity, Access e Tenancy além do VERO-CDM-001 exigirá Blueprint/ADR correspondente antes de implementação.

### 3.2 Shared Kernel

8. Shared Kernel conterá somente semântica universal, estável, agnóstica de framework e necessariamente idêntica entre múltiplos contextos.
9. O catálogo inicial autorizado para avaliação e implementação incremental será:
   - contrato de identificador tipado e opaco;
   - base semântica de `Entity`;
   - base semântica de `Value Object`;
   - base semântica de `Aggregate Root`;
   - contrato mínimo de `Domain Event`;
   - abstração pura de `Specification`;
   - `Result` para sucesso ou falha esperada sem transporte;
   - metadados agnósticos de correlação e causalidade.
10. O catálogo autoriza famílias, não obriga a criação imediata de todas as abstrações. Cada item somente será materializado com caso de uso da fundação, semântica precisa e testes.
11. Shared Kernel não dependerá de qualquer projeto interno, NestJS, Fastify, Prisma, Redis, RabbitMQ, OpenTelemetry, Pino, filesystem, rede ou configuração de runtime.
12. `public-api.ts` será a única superfície externa. Deep imports serão proibidos.
13. Classes base serão rasas, sem I/O, relógio, UUID, contexto global, serialização, persistência ou hooks.
14. Identificadores concretos de domínio, schemas, DTOs, repositories e contratos de provider permanecerão no owner apropriado.
15. Context metadata do Shared Kernel conterá somente valores agnósticos; armazenamento em AsyncLocalStorage pertencerá à plataforma de observabilidade.

### 3.3 Critérios de inclusão

Um item somente poderá entrar no Shared Kernel se todos os critérios forem atendidos:

1. semântica única e estável;
2. ausência de owner mais adequado;
3. uso legítimo por mais de um contexto ou necessidade fundacional comprovada;
4. independência de framework, provider e transporte;
5. API mínima;
6. invariantes e compatibilidade documentadas;
7. testes suficientes;
8. impacto e migração avaliados;
9. aprovação arquitetural aplicável.

Uma capacidade somente poderá entrar no Core Platform se:

1. for indispensável à operação da plataforma;
2. não pertencer a domínio empresarial;
3. possuir owner, responsabilidade e limites;
4. publicar contrato mínimo;
5. respeitar direção de dependências;
6. possuir evidência e testes de isolamento.

### 3.4 Critérios de exclusão

Ficam excluídos do Shared Kernel:

- DTOs e schemas de transporte;
- modelos Prisma ou tipos de banco;
- `IRepository<T>`, `IService<T>`, controllers e services genéricos;
- clients HTTP, cache, broker ou telemetry;
- helpers, utils, common e misc sem owner;
- tipos específicos de módulos;
- autenticação, autorização ou tenancy concretas;
- regras de negócio;
- configuração e feature flags;
- auditoria, logging e observabilidade;
- test fixtures de produção.

Ficam excluídos do Core Platform:

- CRM, Financeiro, Estoque, Compras, Produção, RH, Fiscal, Vendas;
- Workflow, Automation, Business Rules e IA;
- regras empresariais ou perfis funcionais;
- adapters proprietários sem porta interna;
- compartilhamento de tabelas e internals;
- abstrações criadas apenas por conveniência técnica.

## 4. Alternativas consideradas

### 4.1 Shared Kernel amplo

**Vantagem:** reutilização rápida.

**Rejeição proposta:** cria acoplamento, ownership difuso e dependências transversais incompatíveis com a Constituição.

### 4.2 Shared Kernel vazio permanentemente

**Vantagem:** máximo isolamento.

**Rejeição proposta:** duplicaria semântica verdadeiramente universal e contraria a existência governada prevista.

### 4.3 Um único package Core

**Vantagem:** composição inicial simples.

**Rejeição proposta:** mistura ownership e fronteiras de capacidades distintas.

### 4.4 Core organizado por camadas técnicas

**Vantagem:** agrupamento familiar.

**Rejeição proposta:** capacidades devem ser verticais e orientadas a responsabilidade, não depósitos de domain/application/infrastructure globais.

### 4.5 Framework e providers no Shared Kernel

**Vantagem:** integração conveniente.

**Rejeição proposta:** contamina a camada mais interna, reduz portability e inverte dependências.

## 5. Impacto Arquitetural

A decisão fixa a fronteira conceitual do núcleo e o primeiro catálogo autorizável do Shared Kernel. Ela não implementa os conceitos, não cria módulos de negócio e não aprova modelagem adicional à do CDM.

## 6. Componentes afetados

- `packages/core/*`;
- `packages/shared-kernel`;
- superfícies públicas e aliases;
- tags e boundaries Nx;
- testes unitários e arquiteturais;
- contratos de identidade, contexto e configuração;
- futuros módulos consumidores.

## 7. Justificativa

Separar capacidades Core de semântica universal reduz acoplamento e preserva ownership. Materialização sob demanda evita abstrações especulativas. Critérios negativos explícitos protegem o Shared Kernel de se tornar biblioteca genérica.

## 8. Consequências positivas

- responsabilidades e owners claros;
- Shared Kernel mínimo e portátil;
- menor vazamento de framework;
- prevenção de dependências cíclicas;
- evolução governada por evidência;
- alinhamento entre CDM e estrutura física;
- testes de arquitetura mais objetivos.

## 9. Consequências negativas

- alguma duplicação local será preferida ao compartilhamento prematuro;
- admissão exige revisão e documentação;
- boundaries iniciais podem demandar mais mappers e contratos;
- casos de uso precisarão demonstrar a necessidade de abstrações;
- mudanças no catálogo podem exigir migração coordenada.

## 10. Riscos

| Risco | Tratamento |
|---|---|
| Shared Kernel virar `common` | critérios de inclusão/exclusão e owner |
| Core absorver negócio | lista explícita e revisão |
| Abstração sem uso real | materialização incremental |
| Base class limitar modelos | composição e hierarquias rasas |
| CDM ser reinterpretado pelo código | CDM prevalece e mudança é formal |
| Dependência circular entre Core | contracts públicos e testes Nx |
| Contexto técnico invadir Domain | tipos agnósticos separados do storage |

## 11. Impactos futuros

- Novos itens do Shared Kernel exigirão análise e aprovação conforme criticidade.
- Remoção terá inventário, depreciação, migração e testes de compatibilidade.
- Capacidades Core poderão ser divididas ou extraídas somente por ADR.
- Identity, Access e Tenancy terão detalhamento próprio antes de regras concretas.
- Novos módulos de negócio consumirão apenas superfícies públicas do Core e Shared Kernel.

## 12. Critérios de revisão futura

- novo conceito canônico aprovado;
- semântica compartilhada comprovada em múltiplos contextos;
- acoplamento ou ciclos recorrentes;
- abstração do catálogo mostrar-se inadequada;
- divisão, fusão ou extração de capacidade Core;
- alteração incompatível de superfície pública;
- evolução do CDM ou Blueprint superior.

## 13. Constitution Traceability

- VERO-CONST-001-CH02 — DDD, modularidade e evolução controlada;
- VERO-CONST-001-CH03 — governança do Shared Kernel e ciclo de módulos;
- VERO-CONST-001-CH05 — Core Platform, Shared Kernel, camadas, ownership e dependências;
- VERO-CONST-001-CH06 — compatibilidade, depreciação e migração;
- VERO-CONST-001-CH07 — definições canônicas de Core Platform, Shared Kernel, Module, Capability e Aggregate.

## 14. Blueprint Traceability

- VERO-BLP-001 §§ 3, 5–6, 9–12 e 20 — packages, Core, Shared Kernel, imports, dependências e ADRs;
- VERO-BLP-002 §§ 2–5 — composição, catálogo e admissão;
- VERO-BLP-002 §§ 13–20 — contracts, base classes, interfaces, utilities, eventos, IDs e dependências;
- VERO-BLP-002 §§ 21–23 — testes, conformidade e decisões reservadas.

## 15. Canonical Domain Model Traceability

- VERO-CDM-001 §§ 5–7 — Tenant, Organization, Workspace, User, Role, Permission, Module, Capability e conceitos táticos;
- VERO-CDM-001 §§ 8–10 — relações, dependências e restrições de evolução;
- conceitos canônicos não serão redefinidos por classes base ou contratos técnicos.

## 16. Referências

- [Constituição Arquitetural](../00-Constituicao-Arquitetural/README.md)
- [VERO-BLP-001 — Volume I](../01-Blueprint/VERO-BLP-001-VOLUME-I-VISAO-GERAL-E-ESTRUTURA-FISICA.md)
- [VERO-BLP-002 — Volume II](../01-Blueprint/VERO-BLP-002-VOLUME-II-CORE-PLATFORM-E-SHARED-KERNEL.md)
- [VERO-CDM-001 — Canonical Domain Model](../03-Domain/VERO-CDM-001-CANONICAL-DOMAIN-MODEL.md)
- [ADR-001](ADR-001-ARQUITETURA-GERAL.md)
- [ADR-004](ADR-004-CONFIGURACAO-CENTRALIZADA.md)
- [ADR-005](ADR-005-OBSERVABILIDADE.md)

## 17. Histórico de revisões

| Versão | Data | Alteração | Estado |
|---|---|---|---|
| 0.1.0 | 2026-07-27 | Proposta inicial de limites e catálogo do Core Platform e Shared Kernel | Proposed |

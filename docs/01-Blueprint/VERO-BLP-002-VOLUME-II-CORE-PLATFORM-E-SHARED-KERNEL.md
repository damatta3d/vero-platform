# VERO Platform — Blueprint Arquitetural

# VERO-BLP-002

## Volume II — Core Platform e Shared Kernel

## Controle do documento

| Campo | Valor |
|---|---|
| Identificador | VERO-BLP-002 |
| Documento | Blueprint Arquitetural da VERO Platform |
| Volume | II — Core Platform e Shared Kernel |
| Versão | 0.1.0 |
| Estado | Draft — aguardando aprovação do Arquiteto-Chefe |
| Documento normativo superior | VERO-CONST-001 v1.0.0 — Approved |
| Blueprint anterior | VERO-BLP-001 v0.1.0 — Approved |
| Autoridade | Arquiteto-Chefe |
| Responsável pela materialização | Engenharia Oficial |
| Data | 2026-07-27 |

## Resumo executivo

Este volume especifica a fundação interna da VERO Platform: a composição do Core Platform, os limites do Shared Kernel e os mecanismos transversais mínimos que permitem construir módulos consistentes sem criar acoplamento indevido.

O Core Platform reúne capacidades estruturais com responsabilidade e propriedade explícitas. O Shared Kernel permanece pequeno, estável, agnóstico de frameworks e sujeito a admissão governada. Configuração, logging, observabilidade, erros, validação, contratos, eventos e identificadores são definidos como mecanismos coerentes, mas não como depósitos genéricos.

Este documento não implementa código, não modela módulos de negócio, não substitui o Canonical Domain Model e não antecipa decisões que exigem ADR. Estruturas apresentadas são especificações de implementação para a Sprint 0 e fases posteriores autorizadas.

---

## 1. Objetivo e escopo

Este volume tem por objetivos:

1. decompor o Core Platform em responsabilidades técnicas verificáveis;
2. estabelecer a composição e os limites do Shared Kernel;
3. padronizar a estrutura das libraries fundamentais;
4. definir o modelo de Dependency Injection e composição;
5. especificar configuração global e contextual;
6. instituir contratos de logging, observabilidade, erros e validação;
7. definir primitivas, interfaces, base classes, eventos e identificadores;
8. proteger as direções de dependência estabelecidas no Volume I;
9. fornecer critérios de conformidade para a fundação executável;
10. preservar decisões tecnológicas que dependem de ADR.

### 1.1 Dentro do escopo

- libraries do Core Platform e Shared Kernel;
- contratos e primitivas transversais;
- fronteiras entre Domain, Application, Infrastructure e Presentation;
- composição por Dependency Injection;
- configuração estática de runtime;
- logging, telemetria e contexto de execução;
- taxonomia de erros e exceções;
- validação por fronteira;
- eventos base e identificadores globais;
- regras de evolução, testes e conformidade.

### 1.2 Fora do escopo

- regras e módulos de negócio;
- modelagem definitiva de Tenant, Organization, Workspace, User, Role e Permission;
- autenticação, autorização e multi-tenancy detalhadas;
- persistência, migrations e transações detalhadas;
- Event Platform, Lifecycle Engine, Workflow Engine e Business Rules Engine;
- contratos concretos de APIs e eventos;
- escolha final de bibliotecas de schema, logging e telemetria;
- dashboards, alertas, SLOs e políticas operacionais completas;
- código executável.

### Constitution Traceability

Este capítulo implementa:

- VERO-CONST-001-CH01 — escopo e autoridade;
- VERO-CONST-001-CH02 §§ 3.1–3.3 — arquitetura, modularidade e monorepo;
- VERO-CONST-001-CH05 §§ 3.1–3.3 — camadas, núcleo e módulos.

---

## 2. Core Platform

Core Platform é o conjunto de capacidades essenciais que sustenta identidade, contexto, tenancy, acesso, organização e execução segura da plataforma. Ele não é um módulo único, uma camada genérica ou um atalho para dependências compartilhadas.

### 2.1 Composição prevista

```text
packages/core/
├── identity/
├── access/
├── tenancy/
├── organization/
├── user/
├── workspace/
└── configuration/
```

Cada diretório materializado deve ser um projeto Nx autônomo, com owner, superfície pública, testes, tags e dependências explícitas. A lista é uma topologia inicial; a confirmação dos limites semânticos depende do Canonical Domain Model e de ADR quando houver mudança estrutural.

### 2.2 Responsabilidades por capacidade

| Capacidade | Responsabilidade estrutural | Não deve assumir |
|---|---|---|
| Identity | identidade autenticada, principal e contexto de identidade | protocolo concreto de autenticação como regra de domínio |
| Access | contratos e decisões contextuais de autorização | regras empresariais específicas de um módulo |
| Tenancy | contexto, isolamento e identidade de tenant | acesso direto aos dados de módulos consumidores |
| Organization | referência estrutural à organização | processos empresariais da organização |
| User | referência estrutural ao usuário da plataforma | perfil funcional específico de um domínio |
| Workspace | contexto operacional e escopo de trabalho | agregados de negócio hospedados no workspace |
| Configuration | contratos tipados de configuração do núcleo | leitura dispersa de ambiente ou segredos |

### 2.3 Regras de propriedade

1. Cada conceito possui um único módulo proprietário.
2. Módulos consumidores usam somente contratos públicos.
3. Nenhum módulo Core acessa tabelas, repositories ou internals de outro módulo.
4. Core não depende de Platform, Business ou integrações concretas.
5. Dependências entre módulos Core são excepcionais, acíclicas e justificadas.
6. Uma capacidade somente é movida para Core se for indispensável à plataforma, não por ser amplamente utilizada.
7. Contexto propagado não transfere propriedade de dados.

### 2.4 Superfície pública

Um módulo Core pode publicar:

- facades de Application;
- portas necessárias a consumidores;
- identificadores e referências opacas;
- tipos de contexto;
- tokens de DI;
- comandos e queries deliberadamente públicos;
- eventos de integração aprovados;
- módulo de composição autorizado.

Não publica entidades, aggregates, schemas Prisma, repositories concretos, controllers, serializers internos ou modelos de provider.

### Constitution Traceability

Este capítulo implementa:

- VERO-CONST-001-CH05 § 3.2 — Core Platform;
- VERO-CONST-001-CH05 §§ 3.3, 3.5 e 3.6 — organização, dependências e propriedade;
- VERO-CONST-001-CH03 — governança de módulos e contratos.

---

## 3. Shared Kernel

O Shared Kernel contém somente semântica fundamental, universal e estável. Ele não centraliza conveniências técnicas e não substitui contratos públicos entre módulos.

### 3.1 Estrutura lógica

```text
packages/shared-kernel/
├── src/
│   ├── domain/
│   │   ├── entity/
│   │   ├── value-object/
│   │   ├── aggregate/
│   │   ├── event/
│   │   ├── specification/
│   │   └── identity/
│   ├── application/
│   │   ├── result/
│   │   └── context/
│   ├── contracts/
│   └── public-api.ts
├── test/
└── project.json
```

Somente diretórios com conteúdo aprovado devem existir. O Shared Kernel não possui `infrastructure/`, `presentation/`, módulo NestJS ou dependência de runtime.

### 3.2 Catálogo inicial permitido

| Categoria | Exemplos de responsabilidade |
|---|---|
| Identidade | contrato de identificador tipado e comparável |
| Entity | identidade e igualdade por identidade |
| Value Object | igualdade estrutural e imutabilidade |
| Aggregate Root | limite de consistência e coleta de eventos |
| Domain Event | fato de domínio ocorrido |
| Specification | predicado de domínio combinável e puro |
| Result | sucesso ou falha explícita sem transporte |
| Context metadata | correlação e causalidade agnósticas |

O catálogo indica famílias de abstração, não autoriza classes genéricas sem uso real.

### 3.3 Processo de admissão

Uma proposta deve informar:

1. semântica precisa;
2. owner responsável;
3. consumidores legítimos;
4. motivo pelo qual contrato do módulo proprietário é insuficiente;
5. estabilidade esperada;
6. impacto de compatibilidade;
7. testes;
8. plano de migração;
9. aprovação aplicável.

O requisito de múltiplos consumidores não é suficiente sozinho. Semântica universal e ausência de owner mais adequado são obrigatórias.

### 3.4 Processo de remoção

Remoções exigem inventário de consumidores, migração, período de coexistência quando aplicável, teste de compatibilidade e registro de mudança. Um item depreciado não pode receber novas dependências.

### 3.5 Dependências

- não depende de qualquer projeto interno;
- não depende de NestJS, Fastify, Prisma, RabbitMQ, Redis ou OpenTelemetry;
- aceita somente dependências externas agnósticas, mínimas e aprovadas;
- não importa tipos de Node.js quando isso retirar portabilidade sem necessidade;
- não conhece configuração, transporte, serialização ou providers.

### Constitution Traceability

Este capítulo implementa:

- VERO-CONST-001-CH05 § 3.2 e regra obrigatória 12 — Shared Kernel mínimo e governado;
- VERO-CONST-001-CH03 — governança do Shared Kernel;
- VERO-CONST-001-CH06 — compatibilidade, depreciação e migração.

---

## 4. Estrutura das libraries

As libraries fundamentais seguem uma estrutura previsível, mas somente materializam camadas necessárias.

### 4.1 Projeto de módulo Core

```text
packages/core/<module>/
├── src/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   ├── presentation/
│   ├── public/
│   └── public-api.ts
├── test/
└── project.json
```

### 4.2 Projeto transversal técnico

```text
packages/infrastructure/<capability>/
├── src/
│   ├── adapters/
│   ├── configuration/
│   ├── public/
│   └── public-api.ts
├── test/
└── project.json
```

### 4.3 Projeto de contratos

```text
packages/contracts/<owner>/
├── src/
│   ├── api/
│   ├── events/
│   ├── schemas/
│   └── public-api.ts
├── test/
└── project.json
```

### 4.4 Regras

1. `public-api.ts` é a única entrada externa.
2. Projeto não expõe tudo por padrão.
3. Contracts pertencem ao publicador ou owner da capacidade.
4. Infrastructure implementa portas definidas em direção mais interna.
5. Código de framework fica fora de Domain.
6. `packages/contracts` não contém lógica de negócio.
7. Libraries não podem depender de apps.
8. Tags Nx refletem tipo, scope, runtime e estabilidade.

### Constitution Traceability

Este capítulo implementa:

- VERO-CONST-001-CH05 §§ 3.1, 3.3 e 3.5 — camadas, módulos e dependências;
- VERO-BLP-001 §§ 3, 5, 9 e 10 — projetos, packages, diretórios e imports.

---

## 5. Dependency Injection e composição

Dependency Injection é mecanismo de composição, não parte do modelo de domínio. Dependências apontam para abstrações internas; implementações concretas são selecionadas na borda.

### 5.1 Princípios

- Domain não usa container de DI.
- Application declara portas necessárias.
- Infrastructure implementa portas.
- Presentation recebe facades/casos de uso.
- Apps formam o composition root.
- Tokens públicos são estáveis e pertencem ao contrato que representam.
- Service locator e acesso global ao container são proibidos.
- Injeção por propriedade é evitada; dependências obrigatórias são explícitas.

### 5.2 Composition roots

| Processo | Composition root | Responsabilidade |
|---|---|---|
| API | `apps/api/src/composition` | HTTP, módulos, portas, adaptadores e lifecycle |
| Worker | `apps/worker/src/composition` | consumers, handlers, mensageria e lifecycle |
| Scheduler | `apps/scheduler/src/composition` | jobs e handlers, se autorizado |

### 5.3 Módulos de composição

Um módulo de composição pode exportar providers deliberadamente públicos, mas não expõe internals. Módulos dinâmicos recebem configuração tipada; não leem `process.env` diretamente.

### 5.4 Ciclo de vida

Recursos com conexão devem possuir inicialização, health, readiness e encerramento gracioso. A ordem deve ser explícita: validar configuração, criar recursos, iniciar consumidores/servidor, anunciar readiness; na parada, retirar readiness, cessar entradas, concluir trabalho permitido e liberar recursos.

### Constitution Traceability

Este capítulo implementa:

- VERO-CONST-001-CH05 § 3.1 — inversão de dependências;
- VERO-CONST-001-CH05 §§ 3.4–3.6 — comunicação, direção e contratos;
- VERO-BLP-001 § 4 — apps como composition roots.

---

## 6. Configuração global

Configuração global compreende somente valores necessários ao processo como um todo. Configuração funcional pertence à capacidade proprietária.

### 6.1 Categorias

| Categoria | Exemplos | Owner |
|---|---|---|
| Runtime | ambiente, porta, shutdown timeout | app |
| Database | URL de conexão, pool e timeouts | adapter de database |
| Messaging | endpoints, credenciais e políticas técnicas | adapter de messaging |
| Cache | endpoint, namespace e defaults técnicos | adapter de cache |
| Observability | service name, exporters e sampling | observability |
| Security | referências a chaves e políticas técnicas | security |
| Module | feature flags e parâmetros da capacidade | módulo proprietário |

### 6.2 Regras

1. Configuração é tipada, validada e imutável após bootstrap.
2. Valores obrigatórios ausentes bloqueiam startup.
3. Defaults devem ser seguros e explícitos.
4. Segredos são referenciados, não documentados ou logados.
5. Módulos recebem apenas seu recorte de configuração.
6. Configuração não é singleton de acesso irrestrito.
7. Mudança dinâmica exige capacidade própria, auditoria e contrato.

### Constitution Traceability

Este capítulo implementa:

- VERO-CONST-001-CH02 § 3.9 — segurança e configuração;
- VERO-CONST-001-CH05 §§ 3.2 e 3.6 — Core Platform e propriedade;
- VERO-BLP-001 § 13 — estratégia de configuração.

---

## 7. Sistema de configuração

O sistema transforma fontes externas em objetos tipados consumidos pelos composition roots e módulos.

### 7.1 Fluxo

```mermaid
flowchart LR
    S["Fontes"] --> L["Loaders"]
    L --> V["Validação"]
    V --> T["Configuração tipada"]
    T --> C["Composition root"]
```

### 7.2 Precedência

1. defaults versionados e seguros;
2. arquivo ou parâmetros do ambiente sem segredos;
3. variáveis de ambiente;
4. secret store;
5. override efêmero de teste.

Fontes de maior precedência substituem valores, mas não alteram schema ou tipo.

### 7.3 Namespaces

Cada capacidade declara namespace, schema, defaults, sensibilidade e owner. Nomes usam prefixo `VERO_` na fronteira de ambiente e estrutura tipada interna sem refletir literalmente o provider.

### 7.4 Falhas

Erros de configuração devem identificar chave lógica e regra violada sem revelar o valor sensível. A validação ocorre antes de conexões ou abertura de portas de rede.

### Constitution Traceability

Este capítulo implementa:

- VERO-CONST-001-CH02 §§ 3.9–3.10 — configuração e operação;
- VERO-BLP-001 §§ 13–14 — configuração e ambientes.

---

## 8. Logging

Logging é capacidade transversal estruturada. Logs registram fatos técnicos e operacionais; não substituem eventos de domínio, auditoria ou métricas.

### 8.1 Contrato mínimo

O logger deve suportar níveis `trace`, `debug`, `info`, `warn`, `error` e `fatal`, campos estruturados, contexto filho e serialização segura de erro.

### 8.2 Campos padronizados

| Campo | Obrigatoriedade |
|---|---|
| timestamp, level, message, service, environment, version | sempre |
| correlationId, traceId, spanId | quando houver contexto |
| tenantId, workspaceId, userId | quando permitido e aplicável |
| module, operation | em operações identificáveis |
| errorCode, errorType | em falhas classificadas |

### 8.3 Proteção

- credenciais, tokens, segredos e payloads sensíveis nunca são registrados;
- dados pessoais seguem minimização e mascaramento;
- objetos não são despejados indiscriminadamente;
- stack trace é controlada por ambiente;
- mensagem humana não é chave de agregação; códigos estáveis são usados.

### 8.4 Fronteira

Domain não depende de logger. Application pode emitir sinais por porta quando observação for necessária. Infrastructure e Presentation produzem logs técnicos. Auditoria usa contrato próprio e retenção própria.

### Constitution Traceability

Este capítulo implementa:

- VERO-CONST-001-CH02 §§ 3.8–3.10 — auditabilidade, segurança e observabilidade;
- VERO-CONST-001-CH05 § 3.2 — Cross-Cutting Services.

---

## 9. Observabilidade

Observabilidade correlaciona logs, métricas e traces sem contaminar Domain com SDKs.

### 9.1 Sinais

| Sinal | Uso |
|---|---|
| Logs | diagnóstico contextual e registro técnico |
| Métricas | volume, latência, erro, saturação e indicadores de negócio autorizados |
| Traces | causalidade e latência entre componentes |
| Health | liveness, readiness e dependências essenciais |

### 9.2 Contexto

Correlation ID é aceito somente se válido ou gerado na entrada. Trace context segue padrão interoperável. Tenant e identidade são propagados por contexto separado, validado e minimizado; headers externos não se tornam contexto confiável automaticamente.

### 9.3 Instrumentação

- SDK e exporters ficam em Infrastructure.
- Instrumentação de framework ocorre em apps/adapters.
- Application usa abstrações somente quando spans semânticos forem necessários.
- Domain permanece livre de telemetria.
- Métricas têm nome, unidade, labels controladas e owner.
- Labels de alta cardinalidade, como IDs de usuário, são proibidas.

### 9.4 Health

Liveness indica processo funcional; readiness indica capacidade de atender. Health endpoints não revelam segredos, topologia sensível ou detalhes de falha inadequados.

### Constitution Traceability

Este capítulo implementa:

- VERO-CONST-001-CH02 § 3.10 — observabilidade;
- VERO-CONST-001-CH05 §§ 3.2 e 3.6 — serviço transversal e propriedade;
- VERO-BLP-001 §§ 4, 16 e 19 — health, deploy e conformidade.

---

## 10. Error Handling

Falhas são classificadas e traduzidas em cada fronteira. O domínio expressa significado; transportes definem representação externa.

### 10.1 Taxonomia

| Categoria | Natureza | Retry padrão |
|---|---|---|
| Domain | regra ou invariante não satisfeita | não |
| Application | pré-condição, autorização ou coordenação | não, salvo contrato |
| Validation | entrada malformada ou inválida | não |
| Conflict | concorrência ou estado incompatível | condicionado |
| Not Found | recurso ausente sem vazamento de informação | não |
| Infrastructure transient | indisponibilidade, timeout ou contenção transitória | sim, com política |
| Infrastructure permanent | configuração, schema ou operação não suportada | não |
| Unexpected | defeito ou condição não classificada | não automaticamente |

### 10.2 Forma interna

Erros classificados possuem:

- código estável;
- categoria;
- mensagem segura;
- metadados permitidos;
- causa técnica opcional;
- indicação explícita de retry quando aplicável;
- correlation ID acrescentado na fronteira, não no Domain.

### 10.3 Tradução

Presentation traduz falhas para HTTP ou mensagem. Consumers decidem ack, retry ou dead-letter conforme categoria e política. Detalhes de provider e stack trace não atravessam a fronteira pública.

### 10.4 Result e exceções

Falhas esperadas de domínio e aplicação preferem resultado explícito. Exceções representam violações de programação, falhas inesperadas ou interrupções técnicas em fronteiras apropriadas. A escolha deve ser consistente por categoria, não por preferência local.

### Constitution Traceability

Este capítulo implementa:

- VERO-CONST-001-CH05 §§ 3.1 e 3.6 — camadas e contratos;
- VERO-CONST-001-CH02 §§ 3.8–3.10 — segurança, auditabilidade e operação.

---

## 11. Validation

Validação ocorre em camadas distintas e não deve ser duplicada sem propósito.

### 11.1 Níveis

| Nível | Responsabilidade |
|---|---|
| Transporte | forma, tamanho, encoding e schema externo |
| Application | pré-condições do caso de uso e contexto requerido |
| Domain | invariantes e regras sempre verdadeiras |
| Infrastructure | limites e requisitos do provider |
| Contrato | compatibilidade de API/evento e evolução de schema |

### 11.2 Regras

1. DTO de transporte não é modelo de domínio.
2. Sanitização não altera silenciosamente significado.
3. Validação de Domain não depende de schema de transporte.
4. Falhas retornam códigos e paths estáveis quando públicos.
5. Mensagens localizadas são responsabilidade da borda.
6. Payload inválido é rejeitado antes de executar o caso de uso.
7. Eventos consumidos são validados antes do handler.

### Constitution Traceability

Este capítulo implementa:

- VERO-CONST-001-CH05 §§ 3.1, 3.4 e 3.6 — camadas, comunicação e contratos;
- VERO-CONST-001-CH06 — compatibilidade e validação de mudanças.

---

## 12. Exceptions

O catálogo de exceções técnicas deve ser pequeno e orientado a categorias, evitando uma classe por mensagem.

### 12.1 Regras

- nomes expressam categoria estável;
- causa original é preservada internamente;
- dados sensíveis não entram na mensagem;
- exceções de provider são capturadas no adapter;
- exceções não atravessam boundary sem tradução;
- `catch` vazio e conversão genérica que perde causa são proibidos;
- filtros globais são última barreira, não mecanismo normal de fluxo.

### 12.2 Exceções arquiteturais

Exceção de execução não se confunde com exceção arquitetural. Desvio temporário da arquitetura segue governança formal, prazo máximo, owner e plano de remoção definidos na Constituição.

### Constitution Traceability

Este capítulo implementa:

- VERO-CONST-001-CH03 — tratamento de exceções arquiteturais;
- VERO-CONST-001-CH06 — validade, regularização e rastreabilidade;
- VERO-CONST-001-CH05 § 3.1 — tradução por camada.

---

## 13. Contracts

Contrato é uma superfície deliberada e governada entre módulos, processos ou sistemas. Tipos internos não se tornam contratos por serem exportados.

### 13.1 Categorias

| Categoria | Owner | Localização |
|---|---|---|
| Porta de Application | módulo consumidor da capacidade | `application/ports` |
| API pública | módulo expositor | `contracts/<owner>/api` |
| Evento de integração | módulo publicador | `contracts/<owner>/events` |
| Contexto transversal | capacidade proprietária | superfície pública do owner |
| Adapter | módulo de Infrastructure/Integration | interno, implementando porta |

### 13.2 Regras de desenho

- contratos são mínimos e orientados a capacidade;
- nomes não expõem provider;
- serialização é explícita;
- opcionais têm semântica definida;
- timestamps declaram formato e timezone;
- IDs são tipados e opacos;
- enums públicos evoluem com cautela;
- contratos não expõem entidades ou schemas de persistência.

### 13.3 Ciclo de vida

Todo contrato público possui owner, versão quando aplicável, consumidores conhecidos, política de compatibilidade, status, testes e plano de depreciação. Breaking change exige ADR conforme criticidade.

### Constitution Traceability

Este capítulo implementa:

- VERO-CONST-001-CH05 §§ 3.4 e 3.6 — comunicação e contratos;
- VERO-CONST-001-CH03 — ciclo de vida de APIs e eventos;
- VERO-CONST-001-CH06 §§ 3.7–3.12 — versionamento, compatibilidade e rastreabilidade.

---

## 14. Base Classes

Base classes existem somente quando preservam invariantes comuns. Herança para reutilização acidental é proibida.

### 14.1 Candidatas autorizáveis

- Entity;
- Value Object;
- Aggregate Root;
- Domain Event base;
- Specification.

### 14.2 Restrições

1. Base class não depende de framework.
2. Não executa I/O.
3. Não lê relógio, UUID ou contexto global implicitamente.
4. Não contém hooks de persistência.
5. Não impõe campos sem semântica universal.
6. Hierarquias profundas são proibidas.
7. Composição é preferida quando não existe relação semântica “é um”.

DTOs, controllers, repositories e services não recebem base class genérica por padrão.

### Constitution Traceability

Este capítulo implementa:

- VERO-CONST-001-CH05 § 3.1 — independência do Domain;
- VERO-CONST-001-CH05 § 3.2 — Shared Kernel mínimo;
- princípios DDD e Clean Architecture formalizados na Constituição.

---

## 15. Interfaces compartilhadas

Interfaces compartilhadas devem representar contratos semânticos estáveis, não assinaturas genéricas universais.

### 15.1 Permitidas

- Clock;
- Identifier factory;
- contexto de correlação/causalidade;
- contrato mínimo de Domain Event;
- Result/Error descriptor;
- Specification;
- contracts de serialização realmente universais, se aprovados.

### 15.2 Não compartilhadas

- `IRepository<T>` universal;
- `IService<T>` genérico;
- DTO base;
- controller base;
- client HTTP genérico exposto ao Domain;
- abstrações que apenas espelham bibliotecas externas;
- interfaces com dezenas de métodos opcionais.

Repositories pertencem ao módulo e usam linguagem do agregado. Portas técnicas pertencem ao consumidor, seguindo Dependency Inversion.

### Constitution Traceability

Este capítulo implementa:

- VERO-CONST-001-CH05 §§ 3.1, 3.5 e 3.6 — dependências e contratos;
- VERO-CONST-001-CH03 — governança do Shared Kernel.

---

## 16. Utilities

Utilities são funções puras, coesas e com owner. A existência de múltiplos consumidores não justifica um diretório global.

### 16.1 Classificação

1. utilitário específico permanece no módulo;
2. utilitário técnico permanece no package técnico;
3. utilitário de testes permanece em `@vero/testing`;
4. primitiva semântica universal pode ser proposta ao Shared Kernel;
5. conveniência sem owner não é admitida.

### 16.2 Regras

- sem estado global;
- sem I/O oculto;
- sem acesso a ambiente;
- comportamento determinístico quando declarado puro;
- nome orientado ao conceito;
- testes para edge cases;
- depreciação rastreada quando público.

Pastas globais `utils`, `helpers`, `common` e `misc` permanecem proibidas.

### Constitution Traceability

Este capítulo implementa:

- VERO-CONST-001-CH05 §§ 3.2, 3.5 e 3.6;
- VERO-BLP-001 §§ 6 e 9 — Shared Kernel e convenções de diretórios.

---

## 17. Eventos base

Eventos de domínio e integração possuem propósitos diferentes e não compartilham representação por conveniência.

### 17.1 Domain Event

Representa fato ocorrido dentro do modelo. Deve conter identidade do evento, tipo semântico, instante ocorrido, versão interna quando necessária e dados imutáveis. Permanece no módulo proprietário e não depende do broker.

### 17.2 Integration Event

É contrato público serializável derivado de fato autorizado. Deve conter:

- `eventId`;
- tipo e versão do contrato;
- `occurredAt`;
- `publishedAt`;
- `correlationId`;
- `causationId`, quando aplicável;
- contexto mínimo de tenant;
- payload compatível e minimizado.

### 17.3 Regras

1. Aggregate registra Domain Events; não publica diretamente.
2. Application coordena persistência e encaminhamento.
3. Mapeamento para Integration Event ocorre fora do Domain.
4. Consumers são idempotentes.
5. Evolução preserva compatibilidade ou segue migração.
6. Metadados técnicos do RabbitMQ não entram no contrato semântico.
7. Evento descreve fato passado, não comando disfarçado.

### Constitution Traceability

Este capítulo implementa:

- VERO-CONST-001-CH05 §§ 3.4 e 3.6 — eventos e contratos públicos;
- VERO-CONST-001-CH06 — versionamento e compatibilidade;
- VERO-BLP-001 § 8.5 — mensageria.

---

## 18. Identificadores globais

Identificadores são únicos, opacos, imutáveis e tipados por conceito. “Global” descreve unicidade e formato técnico; não elimina o tipo semântico.

### 18.1 Famílias

| Identificador | Escopo |
|---|---|
| Entity/Aggregate ID | identidade persistente tipada |
| Event ID | deduplicação e rastreabilidade de evento |
| Correlation ID | fluxo lógico distribuído |
| Causation ID | relação causal imediata |
| Request ID | interação de entrada |
| Trace/Span ID | telemetria |

### 18.2 Regras

- string primitiva não substitui ID tipado dentro do domínio;
- geração ocorre por factory/porta explícita;
- formato canônico deve ser seguro para logs, URLs e storage;
- IDs não carregam dados pessoais ou significado mutável;
- ID externo é validado antes de conversão;
- IDs de contextos distintos não são intercambiáveis;
- formato concreto definitivo exige ADR se afetar persistência ou contratos públicos.

### Constitution Traceability

Este capítulo implementa:

- VERO-CONST-001-CH05 § 3.6 — propriedade e contratos;
- VERO-CONST-001-CH02 §§ 3.6, 3.8 e 3.9 — isolamento, auditabilidade e segurança.

---

## 19. Regras de dependência

Este volume especializa a matriz do Volume I para as libraries fundamentais.

| Origem | Shared Kernel | Core Domain | Core Application | Core Infrastructure | Cross-cutting contracts | Apps |
|---|---:|---:|---:|---:|---:|---:|
| Shared Kernel | — | Não | Não | Não | Não | Não |
| Core Domain | Sim | contrato aprovado | Não | Não | tipos agnósticos aprovados | Não |
| Core Application | Sim | Sim | contrato aprovado | Não | Sim | Não |
| Core Infrastructure | Sim | Sim | Sim | técnico aprovado | Sim | Não |
| Cross-cutting contracts | mínimo aprovado | Não | Não | Não | acíclico | Não |
| Apps | Sim | público | público | público | Sim | Não |

### 19.1 Restrições adicionais

- logging, telemetry e configuration SDKs não entram no Domain;
- Core não depende de módulo Business;
- Shared Kernel não depende de Core;
- contratos não dependem de adapters;
- `@vero/testing` não entra em código de produção;
- eventos não criam dependência circular oculta;
- módulo não importa schema, repository ou entity de outro.

### 19.2 Fiscalização

Nx boundaries, ESLint, aliases, testes arquiteturais, project graph e revisão devem verificar as regras. Violações bloqueiam merge.

### Constitution Traceability

Este capítulo implementa:

- VERO-CONST-001-CH05 §§ 3.1, 3.5 e regras obrigatórias 2–9;
- VERO-BLP-001 §§ 10–12 — imports, dependências e testes.

---

## 20. Convenções de implementação

### 20.1 Linguagem e nomenclatura

- nomes de código em inglês;
- documentação oficial em português, preservando termos técnicos;
- arquivos e diretórios em `kebab-case`;
- tipos em `PascalCase`;
- funções e variáveis em `camelCase`;
- eventos nomeados como fatos passados;
- portas nomeadas pela capacidade, não pelo provider.

### 20.2 Estado e tempo

- objetos de domínio preservam invariantes;
- mutação ocorre por operações nomeadas;
- data/hora usa UTC internamente;
- relógio é dependência explícita quando afeta regra/teste;
- timezone de apresentação não entra no Domain;
- aleatoriedade e geração de ID são explícitas.

### 20.3 Assincronicidade

- Promises não vazam para Domain por conveniência;
- I/O é assíncrono nas bordas;
- timeouts e cancelamento são definidos em adapters;
- retry ocorre somente em operação idempotente ou protegida;
- handlers não iniciam trabalho assíncrono sem supervisão.

### 20.4 Superfícies públicas

- exportação é deliberada;
- deep import é proibido;
- mudanças públicas exigem avaliação de compatibilidade;
- comentários explicam decisão ou invariante, não repetem código;
- TODO público deve possuir issue ou referência rastreável.

### Constitution Traceability

Este capítulo implementa:

- VERO-CONST-001-CH02 — princípios arquiteturais e qualidade;
- VERO-CONST-001-CH05 — camadas, módulos e contratos;
- VERO-BLP-001 §§ 9–10 — convenções físicas e imports.

---

## 21. Estratégia de testes

### 21.1 Shared Kernel

- testes unitários exaustivos de igualdade, identidade e invariantes;
- testes de propriedade quando adequados;
- zero dependência de infraestrutura;
- verificação de portabilidade e imports.

### 21.2 Core Platform

- Domain: invariantes, policies, events e specifications;
- Application: casos de uso, autorização contextual e portas simuladas;
- Infrastructure: integração real com recurso isolado;
- Presentation: mapeamento, validação e tradução de erro;
- Contract: schemas e compatibilidade;
- Architecture: boundaries, ciclos e superfície pública.

### 21.3 Cross-cutting

- redaction de dados sensíveis em logs;
- propagação de correlação e trace;
- cardinalidade controlada de métricas;
- falha de startup para configuração inválida;
- tradução consistente de erros;
- idempotência e retry de eventos.

### Constitution Traceability

Este capítulo implementa:

- VERO-CONST-001-CH03 §§ 3.5–3.8 — conformidade e evidências;
- VERO-CONST-001-CH06 — validação e rastreabilidade;
- VERO-BLP-001 § 12 — organização dos testes.

---

## 22. Critérios de conformidade do Volume II

Uma implementação estará aderente quando:

1. Core estiver dividido por capacidades com owner;
2. Shared Kernel for mínimo, agnóstico e governado;
3. cada library tiver superfície pública única;
4. Domain não usar DI container, framework ou I/O;
5. apps forem composition roots;
6. configuração for tipada, validada e segmentada;
7. logs forem estruturados e seguros;
8. telemetria preservar correlação sem alta cardinalidade indevida;
9. erros forem classificados e traduzidos por fronteira;
10. validação respeitar responsabilidades por camada;
11. contracts possuírem owner e ciclo de vida;
12. base classes preservarem semântica universal;
13. interfaces e utilities não criarem abstrações genéricas sem owner;
14. Domain Events e Integration Events permanecerem distintos;
15. identificadores forem opacos e tipados;
16. regras de dependência forem automatizadas;
17. testes produzirem evidência de isolamento e compatibilidade;
18. nenhuma regra de negócio ou decisão reservada for implementada informalmente.

### Constitution Traceability

Este capítulo implementa:

- VERO-CONST-001-CH03 — conformidade, evidências e governança;
- VERO-CONST-001-CH05 — regras obrigatórias do modelo;
- VERO-CONST-001-CH06 — validação e rastreabilidade.

---

## 23. Decisões reservadas e ADRs futuras

Antes da implementação correspondente, exigem decisão formal quando aplicável:

- formato concreto de identificadores globais;
- biblioteca de validação de configuração e contracts;
- biblioteca e formato operacional de logging;
- SDK, exporters e sampling de observabilidade;
- política detalhada de códigos de erro públicos;
- estratégia de Result versus exceptions por camada;
- padrão de propagação de contexto assíncrono;
- catálogo inicial efetivo do Shared Kernel;
- divisão definitiva dos módulos Core após o Canonical Domain Model;
- padrão outbox/inbox e publicação de eventos;
- estratégia de schema registry e contract testing.

Registrar uma decisão como reservada impede que dependência ou biblioteca introduzida na Sprint 0 a torne fato consumado.

### Constitution Traceability

Este capítulo implementa:

- VERO-CONST-001-CH02 — Evolução Arquitetural Controlada;
- VERO-CONST-001-CH03 — ADRs e aprovação;
- VERO-CONST-001-CH06 — gestão de mudanças e criticidade.

---

## 24. Referências normativas

### 24.1 Constituição

- [Constituição Arquitetural — índice](../00-Constituicao-Arquitetural/README.md)
- [Fundamentos e Escopo](../00-Constituicao-Arquitetural/01-FUNDAMENTOS-E-ESCOPO.md)
- [Princípios Arquiteturais](../00-Constituicao-Arquitetural/02-PRINCIPIOS-ARQUITETURAIS.md)
- [Governança e Autoridade](../00-Constituicao-Arquitetural/03-GOVERNANCA-E-AUTORIDADE.md)
- [Modelo Arquitetural](../00-Constituicao-Arquitetural/05-MODELO-ARQUITETURAL.md)
- [Evolução e Gestão de Mudanças](../00-Constituicao-Arquitetural/06-EVOLUCAO-E-GESTAO-DE-MUDANCAS.md)
- [Glossário e Consolidação](../00-Constituicao-Arquitetural/07-GLOSSARIO-E-CONSOLIDACAO.md)
- [Desdobramentos para o Blueprint](../00-Constituicao-Arquitetural/DESDOBRAMENTOS-PARA-O-BLUEPRINT.md)

### 24.2 Blueprint e documentos derivados

- [VERO-BLP-001 — Volume I](VERO-BLP-001-VOLUME-I-VISAO-GERAL-E-ESTRUTURA-FISICA.md)
- ADRs vigentes em `docs/02-ADR/`
- Canonical Domain Model em `docs/03-Domain/`
- Engineering Playbook e documentos especializados em `docs/99-Appendix/`

### Constitution Traceability

Este capítulo implementa:

- VERO-CONST-001-CH07 — referências cruzadas e interpretação;
- ordem oficial de precedência documental da Constituição.

---

## 25. Condição de aprovação

Este Volume II permanece em `Draft` até aprovação expressa do Arquiteto-Chefe. Sua aprovação:

- altera o estado documental para `Approved`;
- não altera a versão da plataforma;
- não autoriza automaticamente código ou módulos de negócio;
- permite iniciar o Volume III somente mediante missão subsequente;
- exige sincronização do histórico do Blueprint.

Nenhum conteúdo do Volume III foi produzido.

### Constitution Traceability

Este capítulo implementa:

- VERO-CONST-001-CH03 — autoridade e aprovação;
- VERO-CONST-001-CH06 — versionamento e gestão de mudanças.

## Histórico do documento

| Versão | Data | Alteração | Estado |
|---|---|---|---|
| 0.1.0 | 2026-07-27 | Primeira materialização do Volume II — Core Platform, Shared Kernel e mecanismos fundamentais compartilhados | Draft — aguardando aprovação |

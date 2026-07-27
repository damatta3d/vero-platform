# VERO Platform — Blueprint Arquitetural

# VERO-BLP-001

## Volume I — Visão Geral e Estrutura Física

## Controle do documento

| Campo | Valor |
|---|---|
| Identificador | VERO-BLP-001 |
| Documento | Blueprint Arquitetural da VERO Platform |
| Volume | I — Visão Geral e Estrutura Física |
| Versão | 0.1.0 |
| Estado | Draft — aguardando aprovação do Arquiteto-Chefe |
| Documento normativo superior | VERO-CONST-001 v1.0.0 — Approved |
| Autoridade | Arquiteto-Chefe |
| Responsável pela materialização | Engenharia Oficial |
| Data | 2026-07-27 |

## Resumo executivo

Este volume transforma o modelo conceitual da Constituição Arquitetural em uma topologia física implementável para o monorepo da VERO Platform. Ele define os limites entre aplicações implantáveis, packages reutilizáveis, módulos, contratos, adaptadores, recursos de infraestrutura e suítes de testes.

A plataforma será organizada inicialmente como um **Modular Monolith**, em um monorepo Nx gerenciado por pnpm, com TypeScript, Node.js LTS, NestJS e Fastify. O código será separado segundo Clean Architecture e Domain-Driven Design. PostgreSQL, Redis e RabbitMQ serão acessados exclusivamente por adaptadores de infraestrutura. Docker e Docker Compose formarão a baseline de empacotamento e execução reproduzível.

Este volume não cria funcionalidades de negócio, não define o Canonical Domain Model, não materializa módulos empresariais e não substitui ADRs exigidas para decisões estruturais. Seu conteúdo entra em vigor somente após aprovação.

---

## 1. Objetivos do Blueprint

O Blueprint Arquitetural tem os seguintes objetivos:

1. converter princípios e regras constitucionais em especificações técnicas verificáveis;
2. definir uma estrutura física única para o monorepo;
3. preservar as fronteiras do monólito modular;
4. estabelecer a direção permitida das dependências;
5. separar código implantável, domínio, contratos, adaptadores e recursos operacionais;
6. padronizar imports, testes, configuração, ambientes, build, deploy e versionamento;
7. permitir fiscalização por lint, Nx project graph, testes arquiteturais e pipeline;
8. reduzir decisões implícitas e variações de organização entre equipes e agentes de IA;
9. preparar a Sprint 0 sem antecipar funcionalidades de negócio;
10. criar uma base evolutiva para os volumes posteriores do Blueprint.

### 1.1 Escopo deste volume

Este volume especifica:

- a macroestrutura do repositório;
- a classificação física de apps e packages;
- a estrutura interna padrão dos módulos;
- os limites do Shared Kernel, Core Platform e Infrastructure;
- as regras de dependência e importação;
- a organização de testes;
- a estratégia de configuração e ambientes;
- os fluxos conceituais de build, empacotamento e deploy;
- a política de versionamento aplicável à estrutura física.

### 1.2 Fora do escopo

Permanecem fora deste volume:

- implementação de código;
- regras e funcionalidades de negócio;
- catálogo definitivo de bounded contexts;
- Canonical Domain Model;
- schemas Prisma e desenho físico do banco;
- contratos detalhados de APIs e eventos;
- topologia interna das engines;
- desenho detalhado de segurança, observabilidade, multi-tenancy, AI Gateway e Integration Hub;
- escolha de provedor de nuvem ou orquestrador de produção;
- pipelines concretos de CI/CD;
- dimensionamento de infraestrutura;
- critérios de extração de serviços.

Esses temas serão tratados em volumes posteriores, documentos especializados ou ADRs, conforme a precedência documental.

---

## 2. Relação com a Constituição

O VERO-BLP-001 é subordinado à Constituição Arquitetural VERO-CONST-001 v1.0.0. Ele detalha a implementação física sem alterar, flexibilizar ou reinterpretar seus princípios.

### 2.1 Precedência obrigatória

A ordem de autoridade é:

1. Constituição Arquitetural;
2. Blueprint aprovado;
3. ADRs vigentes;
4. Canonical Domain Model aprovado;
5. Engineering Playbook e documentos especializados;
6. código e implementação.

Em caso de conflito, o documento superior prevalece. Uma divergência entre este Blueprint e a Constituição bloqueia a implementação até correção ou aprovação formal de emenda constitucional.

### 2.2 Rastreabilidade constitucional

| Especificação deste volume | Origem principal |
|---|---|
| Monólito modular e monorepo | VERO-CONST-001-CH02 §§ 3.1–3.3 |
| Camadas físicas | VERO-CONST-001-CH05 § 3.1 |
| Shared Kernel e Core Platform | VERO-CONST-001-CH05 § 3.2 |
| Grupos Core, Platform, Business e Integrations | VERO-CONST-001-CH05 § 3.3 |
| Contratos públicos e comunicação | VERO-CONST-001-CH05 §§ 3.4 e 3.6 |
| Direção de dependências | VERO-CONST-001-CH05 § 3.5 |
| Testes e evidências de conformidade | VERO-CONST-001-CH03 §§ 3.5–3.8 |
| Configuração, segurança e segredos | VERO-CONST-001-CH02 § 3.9 |
| Build, deploy e observabilidade | VERO-CONST-001-CH02 § 3.10 |
| Versionamento, compatibilidade e rastreabilidade | VERO-CONST-001-CH06 §§ 3.7–3.12 |

### 2.3 Regra de alteração

Mudanças neste volume devem seguir a governança da Constituição. Alterações que modifiquem fronteiras, direção de dependências, stack, modelo de implantação ou contratos estruturais exigem avaliação arquitetural e, quando aplicável, ADR. Correções editoriais sem impacto técnico podem seguir revisão documental simplificada.

---

## 3. Estrutura física do monorepo

A estrutura-alvo do repositório é:

```text
vero-platform/
├── apps/
│   ├── api/
│   ├── worker/
│   └── scheduler/
├── packages/
│   ├── shared-kernel/
│   ├── core/
│   ├── platform/
│   ├── business/
│   ├── integrations/
│   ├── contracts/
│   ├── infrastructure/
│   └── testing/
├── infrastructure/
│   ├── docker/
│   ├── compose/
│   ├── environments/
│   ├── migrations/
│   ├── observability/
│   └── scripts/
├── tests/
│   ├── architecture/
│   ├── contract/
│   ├── integration/
│   ├── e2e/
│   ├── performance/
│   └── fixtures/
├── tools/
│   ├── generators/
│   ├── executors/
│   ├── scripts/
│   └── validation/
├── docs/
├── nx.json
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── eslint.config.*
├── prettier.config.*
├── jest.config.*
├── docker-compose.yml
└── VERSION
```

Esta árvore é normativa quanto às responsabilidades dos diretórios. A criação física ocorrerá durante a implementação autorizada da fundação.

### 3.1 Responsabilidade dos diretórios-raiz

| Diretório | Responsabilidade | Não deve conter |
|---|---|---|
| `apps/` | Entrypoints executáveis, composição e bootstrap | Regras de negócio ou adaptadores reutilizáveis |
| `packages/` | Bibliotecas, módulos, contratos e adaptadores reutilizáveis | Artefatos de deploy ou composição específica de ambiente |
| `infrastructure/` | Docker, Compose, migrations operacionais e configuração de runtime | Regras de domínio |
| `tests/` | Suítes transversais que abrangem múltiplos projetos | Testes unitários que pertencem ao código local |
| `tools/` | Geradores, executores e verificações do monorepo | Código executado em produção |
| `docs/` | Documentação oficial e evidências | Segredos ou dados operacionais sensíveis |

### 3.2 Unidade de projeto Nx

Cada app, módulo ou package publicável no grafo deve ser um projeto Nx identificável, com:

- nome único;
- raiz explícita;
- tipo `application` ou `library`;
- tags arquiteturais;
- targets aplicáveis;
- owner lógico;
- superfície pública;
- dependências visíveis no project graph.

Projetos não podem depender de caminhos relativos que atravessem a raiz de outro projeto.

### 3.3 Tags arquiteturais

O grafo Nx deve usar, no mínimo, as seguintes dimensões:

| Dimensão | Valores iniciais |
|---|---|
| `type` | `app`, `domain`, `application`, `infrastructure`, `presentation`, `contract`, `tooling`, `testing` |
| `scope` | `shared-kernel`, `core`, `platform`, `business`, `integration` |
| `runtime` | `node`, `agnostic` |
| `stability` | `internal`, `public` |

As tags devem alimentar regras automatizadas de fronteira. Novas dimensões somente devem ser adicionadas quando produzirem uma regra verificável.

---

## 4. Organização de Apps

Apps são unidades implantáveis e pontos de composição. Eles conhecem implementações concretas para conectar portas a adaptadores, mas não possuem regras de domínio.

### 4.1 Apps previstos

| App | Responsabilidade | Estado |
|---|---|---|
| `apps/api` | API HTTP NestJS com adapter Fastify, autenticação de entrada, roteamento, composição e health endpoints | Fundação |
| `apps/worker` | Consumo de mensagens RabbitMQ e execução assíncrona de handlers autorizados | Fundação |
| `apps/scheduler` | Disparo controlado de tarefas agendadas e comandos temporais | Reservado; criação condicionada à necessidade comprovada |

O `scheduler` pode permanecer ausente enquanto um processo separado não for operacionalmente necessário. Sua previsão não autoriza implementação prematura.

### 4.2 Estrutura interna de um app

```text
apps/<app>/
├── src/
│   ├── bootstrap/
│   ├── composition/
│   ├── health/
│   ├── main.ts
│   └── app.module.ts
├── test/
├── project.json
├── tsconfig.app.json
└── jest.config.*
```

- `bootstrap/`: inicialização do runtime, validação de configuração e shutdown;
- `composition/`: wiring de módulos, portas e adaptadores;
- `health/`: liveness, readiness e diagnóstico permitido;
- `main.ts`: entrada mínima do processo;
- `app.module.ts`: composição raiz do NestJS.

### 4.3 Restrições dos apps

Apps:

1. podem depender de superfícies públicas de packages;
2. podem selecionar implementações concretas de infraestrutura;
3. não podem ser importados por nenhum package;
4. não podem compartilhar código diretamente entre si;
5. não podem possuir entidades, agregados, invariantes ou casos de uso;
6. não podem expor configuração global não validada;
7. devem suportar encerramento gracioso e health checks;
8. devem propagar contexto de tenant, identidade, correlação e auditoria.

---

## 5. Organização de Packages

`packages/` contém todo código reutilizável e toda capacidade modular da plataforma.

### 5.1 Grupos oficiais

```text
packages/
├── shared-kernel/
├── core/
│   └── <module>/
├── platform/
│   └── <capability>/
├── business/
│   └── <bounded-context>/
├── integrations/
│   └── <provider-or-system>/
├── contracts/
│   └── <owner-or-capability>/
├── infrastructure/
│   └── <technical-capability>/
└── testing/
    └── <test-support>/
```

### 5.2 Estrutura padrão de módulo

Módulos Core, Platform e Business devem adotar:

```text
packages/<group>/<module>/
├── src/
│   ├── domain/
│   │   ├── aggregates/
│   │   ├── entities/
│   │   ├── value-objects/
│   │   ├── services/
│   │   ├── policies/
│   │   ├── events/
│   │   └── errors/
│   ├── application/
│   │   ├── commands/
│   │   ├── queries/
│   │   ├── handlers/
│   │   ├── ports/
│   │   ├── dto/
│   │   └── mappers/
│   ├── infrastructure/
│   │   ├── persistence/
│   │   ├── messaging/
│   │   └── adapters/
│   ├── presentation/
│   │   ├── http/
│   │   └── messaging/
│   ├── public/
│   └── public-api.ts
├── test/
├── project.json
├── tsconfig.lib.json
└── jest.config.*
```

Somente diretórios necessários devem ser materializados. Diretórios vazios de conveniência são evitados.

### 5.3 Regras por camada física

| Camada | Pode conter | Não pode depender de |
|---|---|---|
| `domain/` | Agregados, entidades, VOs, invariantes, serviços, políticas e eventos de domínio | NestJS, Prisma, Fastify, filas, cache, filesystem, rede ou providers |
| `application/` | Casos de uso, commands, queries, handlers e portas | Adaptadores concretos e detalhes de transporte |
| `infrastructure/` | Implementação de portas, repositórios, mensageria e providers | Internos de outros módulos ou decisões de domínio |
| `presentation/` | Controllers, consumers e mapeamento de transporte | Persistência direta e regras de negócio |
| `public/` | Facades, tokens, tipos e contratos autorizados | Detalhes internos |

### 5.4 Superfície pública

Cada projeto deve possuir um único ponto de entrada, `src/public-api.ts`. Nenhum consumidor externo pode importar arquivos internos por deep import.

A superfície pública deve expor somente:

- facades de aplicação autorizadas;
- tokens de injeção;
- commands/queries públicos quando necessários;
- tipos e contratos estáveis;
- eventos de integração aprovados;
- módulos de composição explicitamente públicos.

Entidades, schemas de persistência e implementações concretas permanecem internos, salvo determinação explícita em documento superior.

---

## 6. Shared Kernel

O Shared Kernel é uma biblioteca pequena, estável e governada. Seu propósito é compartilhar semântica essencial, não conveniência técnica.

### 6.1 Conteúdo permitido

Podem ingressar no Shared Kernel:

- tipos fundamentais com significado idêntico em toda a plataforma;
- abstrações de identidade e contexto amplamente invariantes;
- primitivas de domínio realmente universais;
- contratos base mínimos para erros e resultados;
- metadados essenciais de correlação e tenant, quando aprovados;
- utilitários puros inseparáveis de um conceito compartilhado.

### 6.2 Conteúdo proibido

Não pertencem ao Shared Kernel:

- DTOs específicos de módulos;
- entidades ou regras de um bounded context;
- helpers genéricos de conveniência;
- clientes de banco, cache, fila ou HTTP;
- módulos NestJS;
- schemas Prisma;
- configuração;
- bibliotecas de UI;
- código que dependa de frameworks ou providers;
- contratos usados por apenas um consumidor e um proprietário.

### 6.3 Critérios de admissão

Um item somente pode ingressar quando:

1. tiver semântica comum comprovada;
2. possuir ao menos dois consumidores legítimos;
3. não tiver proprietário mais adequado;
4. for independente de infraestrutura;
5. tiver impacto de mudança avaliado;
6. tiver testes e owner;
7. for aprovado pelo processo de governança aplicável.

O custo de mudança do Shared Kernel é considerado de plataforma. Quando houver dúvida, o conceito permanece no módulo proprietário.

### 6.4 Dependências

O Shared Kernel:

- não depende de qualquer package interno;
- pode depender apenas de bibliotecas externas agnósticas e previamente aprovadas;
- não expõe frameworks;
- não importa apps, Core, Platform, Business, Integrations ou Infrastructure.

---

## 7. Core Platform

Core Platform reúne capacidades essenciais para o funcionamento seguro e contextual da plataforma, sem incorporar regras empresariais específicas.

### 7.1 Organização física

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

Esta lista representa a classificação estrutural prevista na Constituição. A criação, fusão ou separação de módulos deve respeitar os critérios constitucionais e o Canonical Domain Model. O volume não autoriza sua implementação antecipada.

### 7.2 Responsabilidades

Core Platform deve:

- fornecer contexto de identidade e tenant;
- estabelecer capacidades estruturais de autorização;
- manter conceitos fundamentais de organização, usuário e workspace;
- oferecer contratos estáveis para Platform e Business;
- evitar dependência de regras específicas de negócio;
- preservar propriedade de dados e limites modulares.

### 7.3 Relação com outros grupos

- Core pode depender do Shared Kernel.
- Platform pode consumir contratos públicos de Core.
- Business pode consumir contratos públicos de Core.
- Core não pode depender de Platform, Business ou integrações concretas.
- Apps podem compor Core com Infrastructure.

---

## 8. Infrastructure

Existem duas formas físicas complementares de infraestrutura:

1. `packages/infrastructure/`: adaptadores técnicos reutilizáveis em TypeScript;
2. `infrastructure/`: artefatos operacionais, imagens, Compose, configuração de runtime e scripts.

Essa separação evita misturar código de adaptação com definição de ambientes.

### 8.1 Packages de infraestrutura

```text
packages/infrastructure/
├── database/
├── cache/
├── messaging/
├── http/
├── observability/
├── security/
├── files/
└── configuration/
```

Esses packages implementam portas. Eles não criam regras de negócio nem se tornam atalhos para acesso indiscriminado a recursos técnicos.

### 8.2 Infraestrutura operacional

```text
infrastructure/
├── docker/
│   ├── api/
│   └── worker/
├── compose/
│   ├── base/
│   └── overlays/
├── environments/
│   ├── local/
│   ├── development/
│   ├── staging/
│   └── production/
├── migrations/
├── observability/
└── scripts/
```

Arquivos de ambiente versionados contêm somente nomes, defaults não sensíveis e referências; nunca credenciais.

### 8.3 Persistência

- Prisma é o ORM oficial.
- PostgreSQL é a fonte persistente transacional.
- Cada módulo mantém propriedade lógica sobre seus dados.
- Acesso a tabelas de outro módulo é proibido.
- Schemas, clients e repositories ficam fora do Domain.
- Migrations são versionadas, revisadas, ordenadas e executadas como etapa controlada.
- Alterações destrutivas exigem estratégia de migração e rollback ou compensação documentada.

### 8.4 Cache

- Redis é acessado por portas explícitas.
- Cache não é fonte de verdade de domínio.
- Chaves devem incluir namespace, versão e contexto de tenant quando aplicável.
- Política de expiração e invalidação pertence ao caso de uso proprietário.

### 8.5 Mensageria

- RabbitMQ é o transporte oficial assíncrono.
- Domínio e Application não dependem da biblioteca cliente do broker.
- Exchanges, queues, bindings e retry policies são detalhes de Infrastructure.
- Contratos de eventos pertencem ao módulo publicador ou ao catálogo de contratos.
- Consumidores devem considerar idempotência, redelivery e dead-letter.

---

## 9. Convenções de diretórios

### 9.1 Nomenclatura

- diretórios e arquivos: `kebab-case`;
- classes, tipos e interfaces: `PascalCase`;
- funções e variáveis: `camelCase`;
- constantes: `UPPER_SNAKE_CASE` somente quando verdadeiramente constantes de módulo;
- testes unitários: `*.spec.ts`;
- testes de integração: `*.integration-spec.ts`;
- contratos: nomes sem referência ao provider;
- eventos: fato no passado, com versão no contrato, não no nome interno da classe.

### 9.2 Regras de localização

1. Código fica no projeto que possui a responsabilidade.
2. Um arquivo não é movido para `shared` apenas por ter múltiplos imports.
3. Código específico de provider fica em adapter ou integration.
4. Código específico de framework fica em Presentation, Infrastructure ou app.
5. Contratos públicos ficam em `public/`, `contracts/` ou no catálogo autorizado.
6. Fixtures locais ficam próximas da suíte; fixtures transversais ficam em `tests/fixtures`.
7. Scripts de desenvolvimento ficam em `tools/`; scripts operacionais ficam em `infrastructure/scripts`.
8. Barrel files internos são evitados; `public-api.ts` é a fronteira oficial.

### 9.3 Tamanho e coesão

Diretórios devem representar responsabilidade, não tipo genérico sem contexto. Pastas como `common`, `utils`, `helpers`, `misc` ou `shared` são proibidas fora de um escopo e owner claramente definidos.

---

## 10. Convenções de imports

### 10.1 Aliases oficiais

Os aliases devem seguir:

```text
@vero/shared-kernel
@vero/core/<module>
@vero/platform/<capability>
@vero/business/<bounded-context>
@vero/integrations/<integration>
@vero/contracts/<owner-or-capability>
@vero/infrastructure/<technical-capability>
@vero/testing/<capability>
```

Aliases apontam exclusivamente para a superfície pública do projeto.

### 10.2 Imports relativos

- Imports relativos são permitidos dentro do mesmo projeto.
- Imports que ultrapassem a raiz do projeto são proibidos.
- Imports entre projetos devem usar o alias oficial.
- Deep imports em outro projeto são proibidos.
- Apps nunca são alvo de import.

### 10.3 Imports de framework

Domain não pode importar:

- `@nestjs/*`;
- Fastify;
- Prisma Client;
- clientes RabbitMQ ou Redis;
- bibliotecas de transporte, filesystem ou observabilidade;
- módulos de configuração do runtime.

Application pode depender de abstrações internas e tipos agnósticos, mas não de implementações concretas.

### 10.4 Fiscalização

As convenções serão verificadas por:

- regras de module boundaries do Nx;
- ESLint;
- aliases do `tsconfig.base.json`;
- testes arquiteturais;
- análise do project graph;
- revisão obrigatória.

---

## 11. Dependências permitidas entre módulos

### 11.1 Matriz de grupos

| Origem | Shared Kernel | Core | Platform | Business | Integrations | Infrastructure | Apps |
|---|---:|---:|---:|---:|---:|---:|---:|
| Shared Kernel | — | Não | Não | Não | Não | Não | Não |
| Core | Sim | Somente contrato público autorizado | Não | Não | Não | Portas, não concretos | Não |
| Platform | Sim | Sim, público | Somente contrato público autorizado | Não | Não | Portas, não concretos | Não |
| Business | Sim | Sim, público | Sim, público | Somente contrato público autorizado | Não | Portas, não concretos | Não |
| Integrations | Sim | Sim, público | Sim, público | Somente contratos/portas autorizados | Mesmo projeto ou contrato aprovado | Sim | Não |
| Infrastructure | Sim | Portas públicas | Portas públicas | Portas públicas | Contratos públicos | Mesmo projeto ou dependência técnica aprovada | Não |
| Apps | Sim | Sim, público | Sim, público | Sim, público | Sim, público | Sim | Não |

“Sim, público” significa dependência apenas da superfície pública. A matriz não autoriza ciclos.

### 11.2 Regras entre módulos do mesmo grupo

1. Um módulo não importa internals de outro.
2. Dependência síncrona exige contrato público e direção acíclica.
3. Propagação de fatos deve preferir eventos quando não houver necessidade de resposta imediata.
4. Eventos não podem mascarar RPC.
5. Dados não são compartilhados por acesso direto à persistência.
6. Uma transação não atravessa fronteiras de propriedade modular por conveniência.
7. Dependência nova deve aparecer no grafo, possuir justificativa e passar pelas regras de boundary.

### 11.3 Ciclos

Ciclos são proibidos em:

- imports TypeScript;
- referências entre projetos Nx;
- módulos NestJS;
- chamadas síncronas entre módulos;
- contratos de eventos que criem espera circular;
- dependências operacionais de bootstrap.

Um ciclo identificado bloqueia merge e exige redesenho ou ADR quando revelar decisão estrutural não coberta.

---

## 12. Organização de testes

### 12.1 Pirâmide e categorias

| Categoria | Localização | Objetivo |
|---|---|---|
| Unitário | Colocado com o código ou `test/` do projeto | Invariantes, serviços, policies, handlers e mapeamentos isolados |
| Integração de projeto | `test/` do projeto | Adapter com PostgreSQL, Redis, RabbitMQ ou framework real |
| Arquitetural | `tests/architecture/` | Camadas, imports, tags, ciclos e superfícies públicas |
| Contrato | `tests/contract/` | APIs, eventos, schemas e compatibilidade |
| Integração transversal | `tests/integration/` | Fluxos entre projetos e recursos reais controlados |
| End-to-end | `tests/e2e/` | Comportamento pelas interfaces implantáveis |
| Performance | `tests/performance/` | Baselines e cenários aprovados |

### 12.2 Regras

- Jest é o framework oficial.
- Testes unitários não acessam rede, filesystem externo, relógio real ou infraestrutura.
- Testes de integração usam recursos isolados e reproduzíveis.
- Cada teste tenant-aware prova isolamento positivo e negativo.
- Contratos públicos relevantes possuem teste de compatibilidade.
- Migrations possuem verificação de aplicação e, quando exigido, de reversibilidade.
- Falhas assíncronas cobrem retry, idempotência e dead-letter.
- Testes e2e não substituem testes de domínio.

### 12.3 Testes arquiteturais mínimos

Devem falhar quando:

- Domain importar framework ou Infrastructure;
- um projeto realizar deep import em outro;
- um package importar app;
- Core ou Platform depender de Business;
- houver ciclo no grafo;
- um módulo acessar schema ou repository de outro;
- código de produção importar `@vero/testing`;
- uma superfície pública expuser implementação interna proibida.

### 12.4 Evidências

O pipeline deve produzir resultados de testes, cobertura, grafo e verificações arquiteturais. Cobertura numérica isolada não comprova qualidade; critérios mínimos serão definidos por risco no Engineering Playbook e em volumes posteriores.

---

## 13. Estratégia de configuração

### 13.1 Princípios

A configuração deve ser:

- externa ao código;
- validada antes do bootstrap;
- tipada;
- imutável durante o ciclo do processo, salvo capacidade explicitamente dinâmica;
- específica por app;
- segura por padrão;
- rastreável sem expor segredos.

### 13.2 Camadas de configuração

A precedência será:

1. defaults seguros versionados;
2. configuração do ambiente;
3. variáveis de ambiente;
4. secret store do ambiente;
5. override efêmero autorizado para testes.

Valores ausentes ou inválidos devem impedir o startup quando forem obrigatórios.

### 13.3 Estrutura

```text
packages/infrastructure/configuration/
├── src/
│   ├── schema/
│   ├── loaders/
│   ├── types/
│   └── public-api.ts
└── test/

apps/<app>/src/bootstrap/
└── configuration.ts
```

### 13.4 Segredos

- `.env` e variantes reais não são versionados.
- `.env.example` contém apenas nomes e exemplos não sensíveis.
- Segredos não aparecem em logs, erros, documentação, imagens ou artefatos.
- Acesso a segredo deve seguir least privilege.
- Rotação não deve exigir alteração de código.

### 13.5 Configuração por módulo

Módulos recebem apenas a configuração necessária por contrato tipado. A leitura direta e dispersa de `process.env` é proibida fora do bootstrap/configuration adapter.

---

## 14. Estrutura de ambientes

### 14.1 Ambientes oficiais

| Ambiente | Finalidade | Dados | Infraestrutura |
|---|---|---|---|
| `local` | Desenvolvimento individual | Sintéticos | Docker Compose local |
| `test` | Testes automatizados | Efêmeros e isolados | Processos ou containers controlados |
| `development` | Integração contínua da equipe | Não produtivos | Ambiente compartilhado controlado |
| `staging` | Validação pré-produção | Mascarados ou sintéticos | Paridade máxima praticável |
| `production` | Operação real | Reais e protegidos | Infraestrutura aprovada |

Ambientes efêmeros de CI são instâncias da finalidade `test` ou `development`, nunca uma nova classe sem governança.

### 14.2 Paridade

Todos os ambientes executam os mesmos artefatos imutáveis sempre que possível. Diferenças devem residir em configuração, capacidade, credenciais e integrações autorizadas, não em branches de código.

### 14.3 Isolamento

- Bancos, filas, caches e segredos são isolados por ambiente.
- Produção não é dependência de testes.
- Dados reais não são copiados para ambientes inferiores sem processo de proteção aprovado.
- Recursos devem possuir nomes e tags que identifiquem sistema, app e ambiente.

---

## 15. Build

### 15.1 Pipeline lógico

O build deve executar, em ordem compatível:

1. instalação com pnpm e lockfile congelado;
2. validação de versão e workspace;
3. lint e formatação verificável;
4. type-check;
5. testes unitários;
6. testes arquiteturais;
7. testes de integração e contrato aplicáveis;
8. build Nx dos projetos afetados;
9. geração controlada do Prisma Client quando necessária;
10. empacotamento dos apps;
11. construção das imagens;
12. geração de metadados, checksums e evidências.

### 15.2 Reprodutibilidade

- `pnpm-lock.yaml` é obrigatório.
- Versões de Node.js e pnpm devem ser fixadas por mecanismo versionado.
- O build não depende de estado local não versionado.
- Geração de código deve ser determinística.
- Artefatos são imutáveis e identificados pelo commit.
- Build de produção não contém dependências de desenvolvimento desnecessárias.

### 15.3 Nx

Nx deve:

- modelar o grafo;
- executar apenas projetos afetados quando seguro;
- manter cache sem substituir validações críticas;
- orquestrar targets padronizados;
- aplicar tags e boundaries;
- permitir build integral para releases e verificações periódicas.

---

## 16. Deploy

### 16.1 Unidade de implantação

O Modular Monolith pode gerar processos separados para API e processamento assíncrono, mas permanece uma única plataforma modular e uma única base de código governada.

Unidades iniciais:

- imagem `vero-api`;
- imagem `vero-worker`;
- job controlado de migrations.

O `scheduler` somente terá imagem própria se for materializado.

### 16.2 Regras de imagem

Imagens devem:

- ser multi-stage;
- executar como usuário não root;
- conter somente runtime necessário;
- possuir health check compatível;
- ser identificadas por versão e commit;
- não conter segredos;
- permitir shutdown gracioso;
- ser promovidas entre ambientes sem rebuild.

### 16.3 Docker Compose

Docker Compose é a baseline oficial para desenvolvimento local e validação integrada, compondo:

- apps autorizados;
- PostgreSQL;
- Redis;
- RabbitMQ;
- dependências de observabilidade quando definidas.

Compose não determina sozinho a topologia final de produção.

### 16.4 Sequência de deploy

O processo deve prever:

1. validação do artefato;
2. avaliação de compatibilidade;
3. backup ou controle equivalente quando aplicável;
4. migrations compatíveis;
5. rollout dos processos;
6. readiness;
7. smoke tests;
8. observação pós-deploy;
9. rollback ou forward fix conforme plano.

Breaking changes não podem ser introduzidas por deploy único sem coexistência e migração aprovadas.

### 16.5 Observabilidade e auditoria

Cada implantação deve registrar:

- versão da plataforma;
- commit;
- imagem;
- ambiente;
- migrations aplicadas;
- horário e responsável;
- resultado e rollback;
- referências de evidência.

---

## 17. Versionamento

### 17.1 Plataforma

A versão global permanece no arquivo `VERSION` da raiz e segue Semantic Versioning:

- `MAJOR`: incompatibilidade aprovada;
- `MINOR`: capacidade compatível;
- `PATCH`: correção compatível.

### 17.2 Monorepo

Na fase inicial, a VERO usa versionamento coordenado da plataforma. Packages internos não recebem versões independentes apenas por conveniência. Quando um contrato ou package exigir ciclo de vida autônomo, isso deverá ser aprovado e rastreado.

### 17.3 Apps e imagens

Apps implantados no mesmo release carregam:

- versão da plataforma;
- commit completo;
- identificador imutável da imagem.

Tags mutáveis podem existir apenas como ponte operacional; deploys e rollbacks devem resolver para digest ou identificador imutável.

### 17.4 APIs e eventos

Versionamento de contrato é independente da versão da plataforma:

- APIs públicas devem declarar versão segundo política específica;
- eventos publicados têm schema e versão governados;
- mudanças compatíveis preservam consumidores;
- depreciação, coexistência e retirada seguem a Constituição;
- breaking changes exigem análise, comunicação, migração e aprovação.

### 17.5 Documentos

Constituição, Blueprint, ADRs e demais documentos mantêm versões próprias. Este Volume I inicia em `0.1.0 Draft`. A aprovação promove seu estado, não a versão da plataforma.

### 17.6 Releases

Cada release deve ligar:

- versão;
- commit;
- changelog;
- artefatos;
- migrations;
- contratos afetados;
- ADRs aplicáveis;
- testes e evidências;
- plano de implantação e reversão.

---

## 18. Referências normativas

### 18.1 Constituição Arquitetural

- [Constituição Arquitetural — índice](../00-Constituicao-Arquitetural/README.md)
- [Fundamentos e Escopo](../00-Constituicao-Arquitetural/01-FUNDAMENTOS-E-ESCOPO.md)
- [Princípios Arquiteturais](../00-Constituicao-Arquitetural/02-PRINCIPIOS-ARQUITETURAIS.md)
- [Governança e Autoridade](../00-Constituicao-Arquitetural/03-GOVERNANCA-E-AUTORIDADE.md)
- [Missão, Visão e Valores](../00-Constituicao-Arquitetural/04-MISSAO-VISAO-E-VALORES.md)
- [Modelo Arquitetural](../00-Constituicao-Arquitetural/05-MODELO-ARQUITETURAL.md)
- [Evolução e Gestão de Mudanças](../00-Constituicao-Arquitetural/06-EVOLUCAO-E-GESTAO-DE-MUDANCAS.md)
- [Glossário e Consolidação](../00-Constituicao-Arquitetural/07-GLOSSARIO-E-CONSOLIDACAO.md)
- [Desdobramentos para o Blueprint](../00-Constituicao-Arquitetural/DESDOBRAMENTOS-PARA-O-BLUEPRINT.md)

### 18.2 Documentos subordinados e complementares

- [Índice geral da documentação](../README.md)
- [Manifesto do Desenvolvedor](../../DEVELOPER_MANIFEST.md)
- Architecture Decision Records em `docs/02-ADR/`
- Canonical Domain Model em `docs/03-Domain/`
- Engineering Playbook e documentos especializados em `docs/99-Appendix/`
- versão global da plataforma em `VERSION`
- changelog global em `CHANGELOG.md`

### 18.3 Tecnologias oficiais

A estrutura deste volume adota a stack aprovada:

- TypeScript;
- Node.js LTS;
- NestJS;
- Fastify;
- Nx;
- pnpm;
- Prisma ORM;
- PostgreSQL;
- Redis;
- RabbitMQ;
- Docker;
- Docker Compose;
- Jest;
- ESLint;
- Prettier.

Substituição ou introdução de tecnologia estrutural exige aprovação arquitetural e ADR quando aplicável.

---

## 19. Critérios de conformidade do Volume I

Uma implementação estará aderente quando:

1. apps forem apenas composição e entrypoints;
2. todo código reutilizável estiver em packages com owner;
3. Domain permanecer independente de frameworks;
4. dependências respeitarem a matriz;
5. imports entre projetos usarem somente superfícies públicas;
6. não existirem ciclos;
7. Shared Kernel permanecer mínimo e governado;
8. dados e adaptadores respeitarem propriedade modular;
9. configuração for tipada, validada e segura;
10. ambientes promoverem o mesmo artefato;
11. build for reproduzível;
12. deploy for rastreável e reversível;
13. testes arquiteturais fiscalizarem as fronteiras;
14. versionamento e contratos seguirem seus ciclos independentes;
15. nenhuma funcionalidade de negócio for introduzida antes da fundação autorizada.

## 20. Decisões reservadas e ADRs futuras

Este volume não fecha decisões que exigem evidência adicional. Devem ser tratadas em ADR ou volume posterior, antes da implementação correspondente:

- estratégia de organização do schema Prisma por módulo;
- mecanismo exato de transações e Unit of Work;
- padrão de outbox/inbox;
- biblioteca de schema e validação de configuração;
- estratégia de contract testing;
- política concreta de versionamento de APIs;
- observability stack;
- secret store de ambientes compartilhados;
- provedor e orquestrador de produção;
- registry e assinatura de imagens;
- ferramenta de testes arquiteturais complementar ao Nx/ESLint.

Registrar uma decisão como reservada impede que a implementação a estabeleça informalmente.

## 21. Condição de aprovação

Este Volume I permanece em `Draft` até aprovação expressa do Arquiteto-Chefe. Após aprovação:

- seu estado será atualizado para `Approved`;
- o controle de versão e o histórico do Blueprint serão sincronizados;
- eventuais correções aprovadas serão registradas;
- somente então poderá ser iniciado o Volume II.

Nenhum conteúdo do Volume II foi produzido nesta missão.

## Histórico do documento

| Versão | Data | Alteração | Estado |
|---|---|---|---|
| 0.1.0 | 2026-07-27 | Primeira materialização do Volume I — visão geral, estrutura física, dependências, testes, configuração, ambientes, build, deploy e versionamento | Draft — aguardando aprovação |

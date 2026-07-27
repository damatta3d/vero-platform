# ADR-002 — Runtime e Framework da VERO Platform

## Controle do documento

| Campo | Valor |
|---|---|
| Identificador | ADR-002 |
| Título | Runtime e Framework — Node.js, TypeScript, NestJS e Fastify |
| Versão | 1.0.0 |
| Estado | Approved |
| Data | 2026-07-27 |
| Autoridade de aprovação | Arquiteto-Chefe |
| Responsável pela materialização | Engenharia Oficial |
| Decisão estrutural | Sim |
| Depende de | ADR-001 |
| Substitui | Nenhum ADR |

## 1. Contexto

A VERO Platform precisa de uma baseline única para processos de API e processamento assíncrono. A Constituição exige separação entre Domain, Application, Infrastructure e Presentation, enquanto o Blueprint já define Node.js LTS, TypeScript, NestJS e Fastify como stack oficial. A decisão deve impedir que framework e runtime contaminem o domínio ou se tornem contratos públicos da plataforma.

## 2. Problema

Definir runtime, linguagem, framework de aplicação e adapter HTTP que ofereçam produtividade, tipagem, composição modular, testabilidade e operação previsível, preservando Clean Architecture, portability do Domain e substituibilidade das bordas.

## 3. Decisão

Se aprovado, este ADR estabelece:

1. **Node.js em linha LTS ativa e suportada** será o runtime oficial dos processos da VERO.
2. **TypeScript em modo strict** será a linguagem oficial do código de produção e testes.
3. **NestJS** será o framework de composição, Dependency Injection e adapters de aplicação.
4. **Fastify** será o adapter HTTP oficial do NestJS.
5. Versões exatas serão fixadas no workspace e lockfile; upgrades obedecerão à compatibilidade oficial entre Node.js, TypeScript, Nx, NestJS e Fastify.
6. Apps serão os composition roots e conterão bootstrap, wiring e lifecycle.
7. Domain permanecerá livre de `@nestjs/*`, Fastify, APIs de transporte, Prisma e outros providers.
8. Application poderá declarar portas e casos de uso agnósticos; decorators de framework não poderão definir sua semântica.
9. Infrastructure e Presentation conterão integrações de runtime e framework.
10. O bootstrap deverá suportar validação anterior à abertura de portas, shutdown gracioso e sinais operacionais.
11. APIs públicas não exporão tipos específicos de NestJS ou Fastify como contratos.
12. Recursos experimentais do runtime não serão usados em contratos estruturais sem decisão adicional.

## 4. Alternativas consideradas

### 4.1 Java com Spring Boot

**Vantagem:** ecossistema empresarial maduro.

**Rejeição proposta:** diverge da stack oficial e aumentaria o número de runtimes sem benefício comprovado para a fundação.

### 4.2 .NET com ASP.NET Core

**Vantagem:** tipagem e runtime robustos.

**Rejeição proposta:** mesma divergência de stack e custo de operação e capacitação adicional.

### 4.3 Node.js com JavaScript sem TypeScript

**Vantagem:** configuração inicial menor.

**Rejeição proposta:** reduz garantias estáticas, refatoração e fiscalização de contratos e boundaries.

### 4.4 Express como adapter HTTP

**Vantagem:** ecossistema amplo e familiaridade.

**Rejeição proposta:** Fastify é a escolha já estabelecida no Blueprint e oferece baseline adequada de performance e schemas; trocar exige nova evidência.

### 4.5 Fastify sem NestJS

**Vantagem:** menor abstração.

**Rejeição proposta:** perderia a composição padronizada e o modelo modular já escolhido, exigindo convenções próprias para toda a plataforma.

### 4.6 Deno ou Bun

**Vantagem:** runtimes modernos e toolchain integrado.

**Rejeição proposta:** não fazem parte da baseline aprovada e introduziriam risco de compatibilidade com Nx, NestJS e providers.

## 5. Impacto Arquitetural

A decisão padroniza execução, compilação, composição e HTTP. Ela não transfere ownership do domínio ao framework e não transforma decorators, controllers ou plugins em conceitos canônicos.

## 6. Componentes afetados

- apps de API e workers;
- bootstrap e composition roots;
- compilação TypeScript;
- modules e providers NestJS;
- adapter Fastify;
- testes unitários, integração e e2e;
- lifecycle e shutdown;
- CI, build e imagens de runtime.

## 7. Justificativa

Node.js e TypeScript formam a baseline prevista nos Blueprints. NestJS oferece composição e DI explícitas; Fastify oferece a borda HTTP. A restrição por camadas evita lock-in sem perder produtividade na infraestrutura e apresentação.

## 8. Consequências positivas

- stack única para processos iniciais;
- tipagem estrita e refatoração segura;
- composição modular e testável;
- integração consistente entre API, workers e capacidades transversais;
- bom suporte a lifecycle, testes e instrumentação;
- possibilidade de substituir adapters sem alterar o Domain.

## 9. Consequências negativas

- decorators e DI podem incentivar acoplamento ao framework;
- incompatibilidades entre versões exigem coordenação;
- TypeScript não elimina validação em runtime;
- plugins Fastify e módulos NestJS adicionam superfície de manutenção;
- runtime single-thread exige cuidado com tarefas CPU-bound.

## 10. Riscos

| Risco | Tratamento |
|---|---|
| Framework no Domain | boundaries e testes arquiteturais |
| Tipos HTTP vazarem para contratos | DTOs e mappers na borda |
| Versões incompatíveis | matriz de compatibilidade, pinning e Renovation controlada |
| Bloqueio do event loop | workers, limites e instrumentação |
| Bootstrap parcial | ordem explícita e falha fechada |
| Shutdown incompleto | lifecycle e testes de encerramento |

## 11. Impactos futuros

- Processos CPU-bound ou workloads especializados poderão exigir serviço próprio mediante ADR.
- Alteração de adapter HTTP deverá preservar contratos públicos e evidências de compatibilidade.
- Upgrade de major versions será tratado como mudança controlada.
- Outros transportes poderão usar NestJS na borda sem alterar Application e Domain.

## 12. Critérios de revisão futura

- fim de suporte da linha Node.js adotada;
- incompatibilidade de segurança ou manutenção entre componentes;
- evidência de que NestJS ou Fastify limita requisitos críticos;
- necessidade comprovada de outro runtime;
- violação recorrente de boundaries causada pelo modelo de framework.

## 13. Constitution Traceability

- VERO-CONST-001-CH02 — qualidade, modularidade e evolução controlada;
- VERO-CONST-001-CH03 — introdução e substituição de tecnologia estrutural;
- VERO-CONST-001-CH05 — Clean Architecture, inversão de dependências e contratos;
- VERO-CONST-001-CH06 — compatibilidade, migração e rastreabilidade.

## 14. Blueprint Traceability

- VERO-BLP-001 §§ 3–5 — estrutura e composition roots;
- VERO-BLP-001 §§ 9–10 — localização e imports de framework;
- VERO-BLP-001 §§ 12 e 15–16 — testes, build, runtime e deploy;
- VERO-BLP-001 § 18.3 — tecnologias oficiais;
- VERO-BLP-002 §§ 4–5 e 20 — libraries, DI, composição e convenções.

## 15. Referências

- [Constituição Arquitetural](../00-Constituicao-Arquitetural/README.md)
- [VERO-BLP-001 — Volume I](../01-Blueprint/VERO-BLP-001-VOLUME-I-VISAO-GERAL-E-ESTRUTURA-FISICA.md)
- [VERO-BLP-002 — Volume II](../01-Blueprint/VERO-BLP-002-VOLUME-II-CORE-PLATFORM-E-SHARED-KERNEL.md)
- [ADR-001](ADR-001-ARQUITETURA-GERAL.md)
- [Engineering Playbook](../99-Appendix/ENGINEERING_PLAYBOOK.md)

## 16. Histórico de revisões

| Versão | Data | Alteração | Estado |
|---|---|---|---|
| 0.1.0 | 2026-07-27 | Proposta inicial de runtime, linguagem e framework | Proposed |
| 1.0.0 | 2026-07-27 | Decisão arquitetural revisada e aprovada formalmente pelo Arquiteto-Chefe | Approved |

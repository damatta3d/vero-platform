# Status do Projeto

## Situação atual

**Versão da plataforma:** 0.1.0  
**Constituição:** VERO-CONST-001 v1.0.0 — Approved  
**Blueprint Volume I:** VERO-BLP-001 v0.1.0 — Approved  
**Blueprint Volume II:** VERO-BLP-002 v0.1.0 — Approved por autorização; materialização no PR #3  
**Canonical Domain Model:** VERO-CDM-001 v0.1.0 — Approved  
**Engineering Playbook:** VERO-ENG-001 v1.1.0 — Ativo  
**Fase:** Consolidação Arquitetural  
**Estado:** ADR-001 a ADR-006 em estado Proposed, aguardando revisão arquitetural  
**Atualizado em:** 2026-07-27

## Concluído

- Bootstrap do repositório e estrutura oficial de documentação.
- Constituição Arquitetural VERO-CONST-001 v1.0.0 consolidada e aprovada.
- Blueprint Volume I — Visão Geral e Estrutura Física — aprovado.
- Blueprint Volume II — Core Platform e Shared Kernel — elaborado e aprovado pelo Arquiteto-Chefe; promoção documental registrada no PR #3.
- Canonical Domain Model VERO-CDM-001 v0.1.0 aprovado.
- Engineering Playbook e controles de versão e mudança materializados.
- MISSÃO 002 e Sprint 0 formalmente autorizadas no PR #3.
- MISSÃO 004 oficialmente autorizada.
- ADR-001 a ADR-006 elaborados para revisão arquitetural.

## Documentos em revisão

| Documento | Escopo | Estado |
|---|---|---|
| ADR-001 | Modular Monolith, Monorepo, Nx e pnpm | Proposed |
| ADR-002 | Node.js, TypeScript, NestJS e Fastify | Proposed |
| ADR-003 | PostgreSQL, Prisma, Redis e RabbitMQ | Proposed |
| ADR-004 | Configuration, Environment, Validation, Secrets e Feature Flags | Proposed |
| ADR-005 | Logging, Metrics, Tracing, Context Propagation e Health Checks | Proposed |
| ADR-006 | Core Platform e Shared Kernel | Proposed |

## Escopo autorizado nesta fase

- consolidação das decisões arquiteturais por ADR;
- rastreabilidade com Constituição, Blueprints, Canonical Domain Model e Engineering Playbook;
- revisão arquitetural dos ADR-001 a ADR-006;
- atualização de status e changelog.

## Fora do escopo nesta fase

- implementação de código da Sprint 0;
- infraestrutura executável;
- instalação de dependências;
- configuração de Nx, NestJS, Prisma, Docker ou componentes da plataforma;
- CRM;
- Financeiro;
- Estoque;
- Compras;
- Produção;
- RH;
- Fiscal;
- Vendas;
- Workflow;
- Automation;
- Business Rules;
- IA;
- qualquer módulo ou regra de negócio.

## Bloqueios atuais

A Sprint 0 permanece bloqueada até que:

1. ADR-001 a ADR-006 sejam revisados;
2. eventuais ajustes sejam materializados;
3. os seis ADRs recebam aprovação formal do Arquiteto-Chefe;
4. os estados sejam promovidos para `Approved`;
5. a documentação seja integrada à branch `main`.

Temas explicitamente adiados, como outbox/inbox, Unit of Work, organização definitiva de schemas Prisma, schema registry, contract testing e secret store de ambientes compartilhados, continuam bloqueados até decisão própria antes da implementação correspondente.

## Observações de governança

A precedência oficial é: Constituição, Blueprint, ADRs, Canonical Domain Model, Engineering Playbook e código. Em conflito, o artefato superior prevalece. Nenhuma divergência material foi identificada durante a elaboração da MISSÃO 004.

Os diretórios legados `docs/04-UX`, `docs/05-Backlog` e `docs/06-Sprints` permanecem preservados. As localizações oficiais são `docs/10-UX`, `docs/11-Backlog` e `docs/12-Sprints`.

## Próximos marcos

1. Revisar arquiteturalmente os ADR-001 a ADR-006.
2. Corrigir apenas os pontos aprovados durante a revisão.
3. Promover os seis ADRs para `Approved` após autorização formal.
4. Integrar a documentação à `main`.
5. Atualizar e retomar `agent/sprint-0-foundation`.
6. Iniciar a fundação executável sem módulos de negócio.

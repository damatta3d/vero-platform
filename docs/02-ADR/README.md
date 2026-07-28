# Architecture Decision Records — VERO Platform

Este diretório contém as decisões arquiteturais da VERO Platform. A precedência, os estados e o processo de aprovação são definidos pela Constituição Arquitetural e pelo Engineering Playbook.

## Estados

- **Proposed:** elaborado e aguardando revisão arquitetural;
- **Approved:** aprovado formalmente pelo Arquiteto-Chefe;
- **Rejected:** analisado e rejeitado;
- **Superseded:** substituído por ADR posterior;
- **Deprecated:** mantido apenas para rastreabilidade histórica.

Um ADR aprovado não deve ter sua decisão reescrita. Mudança material exige novo ADR com referência de substituição.

## Catálogo

| ADR | Título | Versão | Estado |
|---|---|---:|---|
| [ADR-001](ADR-001-ARQUITETURA-GERAL.md) | Arquitetura Geral — Modular Monolith, Monorepo, Nx e pnpm | 1.0.0 | Approved |
| [ADR-002](ADR-002-RUNTIME-E-FRAMEWORK.md) | Runtime e Framework — Node.js, TypeScript, NestJS e Fastify | 1.0.0 | Approved |
| [ADR-003](ADR-003-PERSISTENCIA-E-MENSAGERIA.md) | Persistência e Mensageria — PostgreSQL, Prisma, Redis e RabbitMQ | 1.0.0 | Approved |
| [ADR-004](ADR-004-CONFIGURACAO-CENTRALIZADA.md) | Configuração Centralizada — Environment, Validation, Secrets e Feature Flags | 1.0.0 | Approved |
| [ADR-005](ADR-005-OBSERVABILIDADE.md) | Observabilidade — Logging, Metrics, Tracing, Context Propagation e Health Checks | 1.0.0 | Approved |
| [ADR-006](ADR-006-CORE-PLATFORM-E-SHARED-KERNEL.md) | Core Platform e Shared Kernel — Responsabilidades, Limites, Inclusão e Exclusão | 1.0.0 | Approved |
| [ADR-007](ADR-007-FUNDACAO-DE-TENANCY.md) | Fundação de Tenancy — identidade opaca, resolução confiável e contexto explícito | 0.1.0 | Proposed |

## Gate atual

Os ADR-001 a ADR-006 estão aprovados e integrados à `main`. O ADR-007 está proposto na branch `agent/core-tenancy-foundation` e bloqueia a implementação funcional da MISSÃO 005 até revisão e aprovação explícita do Arquiteto-Chefe.

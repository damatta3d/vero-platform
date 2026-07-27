# Sprint 0 — Fundação Executável

## Controle

| Campo | Valor |
|---|---|
| Missão | MISSÃO 002 |
| Estado | Ready for Approval |
| Data de autorização | 2026-07-27 |
| Autoridade | Arquiteto-Chefe |
| Branch de execução | `agent/sprint-0-foundation` |
| PR | #3 |
| Versão da plataforma | 0.1.0 |

## Base normativa

1. VERO-CONST-001 v1.0.0 — Approved;
2. VERO-BLP-001 v0.1.0 — Approved;
3. VERO-BLP-002 v0.1.0 — Approved;
4. ADR-001 a ADR-006 v1.0.0 — Approved;
5. VERO-CDM-001 v0.1.0 — Approved;
6. VERO-ENG-001 v1.1.0 — Ativo;
7. código e artefatos operacionais.

## Objetivo

Construir exclusivamente a fundação técnica executável da VERO Platform, sem implementar módulos ou regras de negócio.

## Backlog executado

| ID | Entrega | Estado |
|---|---|---|
| S0-00 | Governança, autorização e rastreabilidade | Concluído |
| S0-01 | Workspace Nx, pnpm e TypeScript | Concluído |
| S0-02 | ESLint, Prettier, Husky e Commitlint | Concluído |
| S0-03 | Aplicação NestJS com Fastify | Concluído |
| S0-04 | Configuração centralizada e validada | Concluído |
| S0-05 | Shared Kernel mínimo | Concluído |
| S0-06 | Estrutura Core Platform fundacional | Concluído |
| S0-07 | Prisma e PostgreSQL | Concluído |
| S0-08 | Redis | Concluído |
| S0-09 | RabbitMQ | Concluído |
| S0-10 | Logging estruturado | Concluído |
| S0-11 | Observabilidade básica | Concluído |
| S0-12 | Health checks | Concluído |
| S0-13 | Docker e Docker Compose | Concluído |
| S0-14 | Testes arquiteturais, unitários e integração | Concluído |
| S0-15 | CI inicial | Concluído |
| S0-16 | Documentação e relatório final | Concluído |

## Evidências de conclusão

- instalação reproduzível com lockfile congelado;
- lint, formatação, typecheck, testes, validação arquitetural e build aprovados;
- oito projetos Nx compilados;
- cinco testes unitários aprovados em quatro suítes;
- três testes de integração contra PostgreSQL, Redis e RabbitMQ no CI;
- schema Prisma técnico vazio validado;
- API inicializada e endpoints `/health/live` e `/health/ready` verificados;
- header `x-correlation-id` propagado no smoke test;
- auditoria bloqueando vulnerabilidades altas;
- relatório técnico final em `SPRINT-0-RELATORIO-FINAL.md`.

## Decisões reservadas preservadas

Permanecem fora do escopo: formato e geração de identificadores globais, outbox/inbox,
publicação transacional, Unit of Work, schemas Prisma modulares definitivos, schema
registry, contract testing, topologia definitiva de mensageria e secret store
compartilhado.

## Gate de encerramento

A implementação técnica está concluída. A Sprint 0 somente será encerrada e integrada à
`main` após aprovação final do Arquiteto-Chefe no PR #3.


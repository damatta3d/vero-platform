# Status do Projeto

## Situação atual

**Versão da plataforma:** 0.1.0  
**Constituição:** VERO-CONST-001 v1.0.0 — Approved  
**Blueprint Volume I:** VERO-BLP-001 v0.1.0 — Approved  
**Blueprint Volume II:** VERO-BLP-002 v0.1.0 — Approved  
**Canonical Domain Model:** VERO-CDM-001 v0.1.0 — Approved  
**ADRs:** ADR-001 a ADR-006 v1.0.0 — Approved  
**Engineering Playbook:** VERO-ENG-001 v1.1.0 — Ativo  
**Fase:** Sprint 0 — Fundação Executável  
**Estado:** Em andamento na branch `agent/sprint-0-foundation`  
**Baseline integrada em main:** `ab75ecf431ca6eb2f59defd7f00a40953c9d73a9`  
**Atualizado em:** 2026-07-27

## Concluído

- Bootstrap documental do repositório.
- Constituição Arquitetural VERO-CONST-001 v1.0.0 aprovada.
- Blueprint Volumes I e II aprovados.
- Canonical Domain Model VERO-CDM-001 v0.1.0 aprovado.
- ADR-001 a ADR-006 revisados, corrigidos, aprovados e integrados à `main`.
- MISSÃO 002 e Sprint 0 formalmente autorizadas.
- Branch da Sprint 0 sincronizada com a baseline arquitetural integrada.

## Decisões arquiteturais aprovadas

| Documento | Escopo | Estado |
|---|---|---|
| ADR-001 | Modular Monolith, Monorepo, Nx e pnpm | Approved |
| ADR-002 | Node.js, TypeScript, NestJS e Fastify | Approved |
| ADR-003 | PostgreSQL, Prisma, Redis e RabbitMQ | Approved |
| ADR-004 | Configuration, Environment, Validation, Secrets e Feature Flags | Approved |
| ADR-005 | Logging, Metrics, Tracing, Context Propagation e Health Checks | Approved |
| ADR-006 | Core Platform e Shared Kernel | Approved |

## Escopo autorizado da Sprint 0

- workspace Nx, pnpm e TypeScript strict;
- aplicações NestJS com Fastify para API e worker;
- configuração centralizada e validada;
- Shared Kernel mínimo e Core Platform sem regras de negócio;
- adapters técnicos para PostgreSQL/Prisma, Redis e RabbitMQ;
- logging estruturado, observabilidade básica e health checks;
- Docker e Docker Compose;
- lint, formatação, testes, validações arquiteturais e CI;
- documentação e rastreabilidade.

## Fora do escopo

- módulos e regras de negócio;
- CRM, Financeiro, Estoque, Compras, Produção, RH, Fiscal e Vendas;
- Workflow, Automation, Business Rules e IA;
- decisões explicitamente reservadas por ADR posterior.

## Restrições vigentes

Permanecem bloqueados: outbox/inbox, Unit of Work, organização definitiva de schemas Prisma por módulo, publicação transacional confiável, entrega exatamente uma vez, schema registry, contract testing, topologia definitiva de exchanges/filas, secret store compartilhado e formato/geração concreta de identificadores globais.

## Observações de governança

A precedência oficial é: Constituição, Blueprint aprovado, ADRs vigentes, Canonical Domain Model aprovado, Engineering Playbook e código. Nenhum módulo de negócio será materializado nesta Sprint.

## Próximos marcos

1. Materializar o workspace e os quality gates.
2. Implementar API, worker e packages fundacionais.
3. Implementar adapters técnicos e execução local reproduzível.
4. Executar testes, validações arquiteturais e CI.
5. Atualizar o relatório da Sprint 0 e submeter o PR #3 à revisão final.

# Sprint 0 — Fundação Executável

## Controle

| Campo | Valor |
|---|---|
| Missão | MISSÃO 002 |
| Estado | Authorized — aguardando decisões arquiteturais reservadas |
| Data de autorização | 2026-07-27 |
| Autoridade | Arquiteto-Chefe |
| Branch de execução | `agent/sprint-0-foundation` |
| Versão da plataforma | 0.1.0 |

## Base normativa

1. VERO-CONST-001 v1.0.0 — Approved;
2. VERO-BLP-001 v0.1.0 — Approved;
3. VERO-BLP-002 v0.1.0 — Approved;
4. ADRs vigentes;
5. VERO-CDM-001 v0.1.0 — Approved;
6. Engineering Playbook v1.0.0 — Ativo;
7. código e artefatos operacionais.

Em conflito, o documento superior prevalece. Código divergente deve ser corrigido. Mudança normativa ocorre somente pelo processo formal aplicável e nunca por adaptação silenciosa da documentação ao código.

## Objetivo

Construir exclusivamente a fundação técnica executável da VERO Platform, sem implementar módulos ou regras de negócio.

## Escopo autorizado

- Nx Workspace, pnpm e TypeScript;
- NestJS e Fastify;
- Prisma e PostgreSQL;
- Redis e RabbitMQ;
- Docker e Docker Compose;
- Shared Kernel mínimo e governado;
- Core Platform e Infrastructure;
- configuração centralizada;
- logging, observabilidade básica e health checks;
- ESLint, Prettier, Husky e Commitlint;
- Jest e estrutura inicial de testes;
- CI inicial;
- documentação, rastreabilidade e controles de status.

## Fora do escopo

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
- qualquer outro módulo ou regra de negócio.

## Regras de execução

1. Todo desenvolvimento ocorre em branch própria.
2. Nenhum commit é realizado diretamente em `main`.
3. Commits seguem Conventional Commits e representam uma unidade lógica.
4. Cada etapa inclui código, testes, documentação aplicável, CHANGELOG, PROJECT_STATUS e descrição técnica.
5. A Engenharia não altera Constituição, Blueprint, CDM ou ADR aprovado por iniciativa própria.
6. Decisão arquitetural não especificada bloqueia a implementação correspondente.
7. Quando houver bloqueio, a Engenharia registra contexto, alternativas, recomendação e ADR necessária, aguardando aprovação.
8. Nenhum módulo de negócio será materializado nesta Sprint.

## Backlog autorizado

| ID | Entrega | Estado |
|---|---|---|
| S0-00 | Governança, autorização e rastreabilidade | Em andamento |
| S0-01 | Workspace Nx, pnpm e TypeScript | Pendente |
| S0-02 | Qualidade: ESLint, Prettier, Husky e Commitlint | Pendente |
| S0-03 | Aplicação NestJS com Fastify | Pendente |
| S0-04 | Configuração centralizada e validada | Bloqueado por decisão reservada |
| S0-05 | Shared Kernel mínimo | Bloqueado por catálogo/ADR |
| S0-06 | Estrutura Core Platform | Pendente de decomposição aprovada |
| S0-07 | Prisma e PostgreSQL | Pendente |
| S0-08 | Redis | Pendente |
| S0-09 | RabbitMQ | Pendente |
| S0-10 | Logging estruturado | Bloqueado por decisão reservada |
| S0-11 | Observabilidade básica | Bloqueado por decisão reservada |
| S0-12 | Health checks | Pendente |
| S0-13 | Docker e Docker Compose | Pendente |
| S0-14 | Testes arquiteturais, unitários e integração | Pendente |
| S0-15 | CI inicial | Pendente |
| S0-16 | Documentação e relatório final | Pendente |

## Decisões reservadas identificadas

O VERO-BLP-002 § 23 exige decisão formal antes da implementação correspondente para, entre outros pontos:

- biblioteca de validação de configuração e contratos;
- biblioteca e formato operacional de logging;
- SDK, exporters e sampling de observabilidade;
- padrão de propagação de contexto assíncrono;
- catálogo inicial efetivo do Shared Kernel;
- divisão definitiva dos módulos Core;
- estratégia de Result versus exceptions;
- formato concreto de identificadores globais;
- outbox/inbox e publicação de eventos;
- schema registry e contract testing.

A Sprint permanece autorizada, mas a implementação técnica não pode transformar essas escolhas em decisões implícitas.

## Critérios de conclusão

- instalação reproduzível por pnpm;
- lint, testes e build aprovados;
- API NestJS/Fastify inicializada sem módulos de negócio;
- PostgreSQL, Redis e RabbitMQ executáveis via Docker Compose;
- liveness e readiness verificáveis;
- configuração inválida impedindo startup com erro seguro;
- logs estruturados e correlação conforme decisão aprovada;
- limites arquiteturais fiscalizados automaticamente;
- CI executando quality gates;
- CHANGELOG, PROJECT_STATUS e documentação sincronizados;
- relatório final com árvore, arquivos, dependências, testes, cobertura, riscos, pendências, commits, hashes e branches;
- aprovação final do Arquiteto-Chefe.

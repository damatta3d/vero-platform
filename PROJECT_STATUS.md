# Status do Projeto

## Situação atual

**Versão da plataforma:** 0.1.0  
**Constituição:** VERO-CONST-001 v1.0.0 — Approved  
**Blueprint Volume I:** VERO-BLP-001 v0.1.0 — Approved  
**Blueprint Volume II:** VERO-BLP-002 v0.1.0 — Approved  
**Canonical Domain Model:** VERO-CDM-001 v0.1.0 — Approved  
**Engineering Playbook:** v1.0.0 — Ativo  
**Fase:** Sprint 0 — Fundação Executável  
**Estado:** Autorizada; implementação técnica aguardando decisões arquiteturais reservadas  
**Atualizado em:** 2026-07-27

## Concluído

- Bootstrap do repositório e estrutura oficial de documentação.
- Constituição Arquitetural VERO-CONST-001 v1.0.0 consolidada e aprovada.
- Blueprint Volume I — Visão Geral e Estrutura Física — aprovado.
- Blueprint Volume II — Core Platform e Shared Kernel — aprovado.
- Canonical Domain Model VERO-CDM-001 v0.1.0 aprovado.
- Engineering Playbook e controles iniciais de versão e changelog materializados.
- MISSÃO 002 e Sprint 0 formalmente autorizadas.
- Branch `agent/sprint-0-foundation` criada para a execução.

## Escopo autorizado nesta fase

- Nx Workspace, pnpm e TypeScript;
- NestJS e Fastify;
- Prisma e PostgreSQL;
- Redis e RabbitMQ;
- Docker e Docker Compose;
- Shared Kernel, Core Platform e Infrastructure;
- configuração centralizada;
- logging, observabilidade básica e health checks;
- ESLint, Prettier, Husky, Commitlint e Jest;
- CI inicial;
- testes, documentação e rastreabilidade da fundação.

## Fora do escopo nesta fase

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

O VERO-BLP-002 § 23 reserva decisões que não podem ser incorporadas implicitamente ao código. Antes da implementação correspondente, são necessárias propostas e ADRs aprovadas para, no mínimo:

- validação de configuração e contratos;
- logging estruturado;
- observabilidade e propagação de contexto;
- catálogo inicial efetivo do Shared Kernel;
- decomposição definitiva do Core Platform;
- Result versus exceptions e identificadores globais.

A precedência oficial permanece a definida na Constituição: Constituição, Blueprint, ADRs, Canonical Domain Model, Engineering Playbook e código.

## Observações de estrutura

Os diretórios legados `docs/04-UX`, `docs/05-Backlog` e `docs/06-Sprints` permanecem preservados. As localizações oficiais são `docs/10-UX`, `docs/11-Backlog` e `docs/12-Sprints`.

## Próximos marcos

1. Aprovar as ADRs necessárias para as decisões reservadas da Sprint 0.
2. Inicializar o workspace Nx, pnpm e TypeScript na branch da Sprint.
3. Implementar a fundação executável em unidades lógicas com testes e documentação.
4. Abrir Pull Request para revisão arquitetural e técnica.
5. Concluir a Sprint 0 somente após aprovação do Arquiteto-Chefe.

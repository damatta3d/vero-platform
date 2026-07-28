# Status do Projeto

## Situação atual

**Versão da plataforma:** 0.1.0  
**Constituição:** VERO-CONST-001 v1.0.0 — Approved  
**Blueprint Volume I:** VERO-BLP-001 v0.1.0 — Approved  
**Blueprint Volume II:** VERO-BLP-002 v0.1.0 — Approved  
**Canonical Domain Model:** VERO-CDM-001 v0.1.0 — Approved  
**ADRs vigentes:** ADR-001 a ADR-006 v1.0.0 — Approved  
**ADR vigente na branch:** ADR-007 v1.0.0 — Approved  
**Engineering Playbook:** VERO-ENG-001 v1.1.0 — Ativo  
**Fase:** MISSÃO 005 — Core Platform: Fundação de Tenancy  
**Estado:** ADR-007 aprovado; implementação da Fundação de Tenancy autorizada  
**Branch:** `agent/core-tenancy-foundation`  
**Baseline integrada em main:** `a707a30ebbcea1b91c5dfdb801f8b21203a98a7b`  
**Atualizado em:** 2026-07-27

## Concluído

- Constituição, Blueprints I e II e CDM aprovados.
- ADR-001 a ADR-006 aprovados e integrados.
- Sprint 0 — Fundação Executável concluída, validada e integrada à `main`.
- Workspace Nx/pnpm/TypeScript strict com API, worker e oito projetos.
- Configuração, observabilidade, health, adapters técnicos, Docker e CI materializados.
- CI da Sprint 0 aprovado em quality e integration.
- Branch da MISSÃO 005 criada diretamente da baseline oficial.
- ADR-007 e controle da MISSÃO 005 elaborados para revisão.

## Estado das linhas GitHub

| Linha | Estado |
|---|---|
| `main` | Sprint 0 integrada no commit `a707a30` |
| PR #3 | Merged; Fundação Executável integrada |
| `agent/core-tenancy-foundation` | ADR-007 aprovado; implementação em andamento |
| ADR-007 | `Approved`; implementação controlada autorizada |

## Fora do escopo vigente

- Identity e autenticação;
- Access e autorização concreta;
- User, Organization e Workspace;
- persistência e ciclo de vida de Tenant;
- módulos empresariais;
- outbox/inbox e eventos de Tenant;
- estratégia física definitiva de isolamento;
- formato e geração concreta de identificadores globais.

## Próximo gate

1. Revisão técnica do ADR-007.
2. Aprovação explícita do Arquiteto-Chefe.
3. Promoção do ADR-007 para `Approved` na branch da missão.
4. Implementação e validação da fundação de Tenancy.
5. Parecer técnico e aprovação antes do merge.

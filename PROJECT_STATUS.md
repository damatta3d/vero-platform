# Status do Projeto

## Situação atual

**Versão da plataforma:** 0.1.0  
**Constituição:** VERO-CONST-001 v1.0.0 — Approved  
**Blueprint Volume I:** VERO-BLP-001 v0.1.0 — Approved  
**Blueprint Volume II:** VERO-BLP-002 v0.1.0 — Approved  
**Canonical Domain Model:** VERO-CDM-001 v0.1.0 — Approved  
**ADRs vigentes na `main`:** ADR-001 a ADR-007 v1.0.0 — Approved  
**ADR em revisão na branch:** ADR-008 v0.1.0 — Proposed  
**Engineering Playbook:** VERO-ENG-001 v1.1.0 — Ativo  
**Fase:** MISSÃO 006 — Core Platform: Fundação de Identity e Autenticação  
**Estado:** Gate arquitetural em revisão; implementação não autorizada  
**Branch:** `agent/core-identity-foundation`  
**Baseline oficial da `main`:** `addb8d7a8e5bd50007ae323d446c197230202502`  
**Atualizado em:** 2026-07-27

## Concluído

- Constituição, Blueprints I e II e CDM aprovados.
- ADR-001 a ADR-007 aprovados e integrados à `main`.
- Sprint 0 — Fundação Executável concluída, validada e integrada.
- MISSÃO 005 — Fundação de Tenancy concluída, validada e integrada pelo PR #5.
- Projeto Nx `core-tenancy` com identidade opaca, candidato não confiável, contexto resolvido, porta e erros semânticos.
- Dezesseis testes de Tenancy aprovados e cobertura de 100% nas quatro métricas.
- CI final da MISSÃO 005 aprovado nos jobs `quality` e `integration`.
- Nova `main` confirmada no commit `addb8d7a`.
- Nenhum PR permanecia aberto após o merge da MISSÃO 005.
- Dependência seguinte confirmada pela hierarquia documental: Identity antes de Access.
- ADR-008 e controle da MISSÃO 006 elaborados para revisão, sem código funcional.

## Estado das linhas GitHub

| Linha | Estado |
|---|---|
| `main` | Sprint 0 e MISSÃO 005 integradas no commit `addb8d7a` |
| PR #3 | Merged; Fundação Executável integrada |
| PR #4 | Merged; ADR-001 a ADR-006 integrados |
| PR #5 | Merged; Fundação de Tenancy integrada |
| `agent/core-tenancy-foundation` | Linha histórica da MISSÃO 005 |
| `agent/core-identity-foundation` | Trabalho atual; gate documental da MISSÃO 006 |
| ADR-008 | `Proposed`; implementação bloqueada até aprovação |

## Escopo proposto da MISSÃO 006

- evidência de autenticação tratada como não confiável;
- principal humano ou de serviço autenticado;
- identidade e contexto explícitos e imutáveis;
- porta de autenticação agnóstica de protocolo e framework;
- separação formal entre autenticação, autorização, User e Tenancy;
- superfície pública mínima e testável.

## Fora do escopo vigente

- Access, Role, Permission e autorização concreta;
- User e gestão de credenciais;
- JWT, OIDC, OAuth, IdP, sessões, MFA e adapters concretos;
- controllers, guards, middleware e transporte;
- associação entre principal e Tenant;
- persistência, Prisma, migrations ou cache;
- Organization e Workspace;
- módulos empresariais;
- outbox/inbox;
- estratégia física definitiva de isolamento;
- formato e geração concreta de identificadores globais.

## Próximo gate

1. Revisão técnica completa do ADR-008.
2. Correção de eventuais achados na branch `agent/core-identity-foundation`.
3. Aprovação explícita do Arquiteto-Chefe.
4. Promoção do ADR-008 para `Approved`.
5. Somente então implementação e validação da Fundação de Identity.
6. Parecer técnico e aprovação antes do merge.

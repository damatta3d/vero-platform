# Status do Projeto

## Situação atual

**Versão da plataforma:** 0.1.0  
**Constituição:** VERO-CONST-001 v1.0.0 — Approved  
**Blueprint Volumes I e II:** v0.1.0 — Approved  
**Canonical Domain Model:** VERO-CDM-001 v0.1.0 — Approved  
**ADRs vigentes na `main`:** ADR-001 a ADR-008 v1.0.0 — Approved  
**ADR vigente na branch:** ADR-009 v1.0.0 — Approved
**Engineering Playbook:** VERO-ENG-001 v1.1.0 — Ativo  
**Fase:** MISSÃO 007 — Core Platform: Fundação de Access e Autorização  
**Estado:** Segurança essencial implementada; quality gates e CI pendentes
**Branch:** `agent/core-access-foundation`  
**Baseline oficial da `main`:** `1553b8ea6186788e8ed1632d008c8c8a361b9e50`  
**Atualizado em:** 2026-07-28

## Concluído

- Constituição, Blueprints I e II e CDM aprovados.
- ADR-001 a ADR-008 aprovados e integrados à `main`.
- Sprint 0 — Fundação Executável concluída, validada e integrada.
- MISSÃO 005 — Fundação de Tenancy concluída e integrada pelo PR #5.
- MISSÃO 006 — Fundação de Identity e Autenticação concluída e integrada pelo PR #6.
- Projetos `core-tenancy` e `core-identity` implementados, testados e protegidos por contratos.
- CI das MISSÕES 005 e 006 aprovado nos jobs `quality` e `integration`.
- `main` confirmada no commit `1553b8ea`.
- Access confirmado como próxima dependência arquitetural.
- ADR-009 aprovado e `core-access` mínimo implementado.
- `ResolvedTenantContext` endurecido contra objetos forjados.
- Estratégia alterada para desenvolvimento vertical do MVP do Santo Parma após a MISSÃO 007.
- Quality gates locais da MISSÃO 007 aprovados; 49 testes, arquitetura e build dos 11 projetos validados.

## Estado das linhas GitHub

| Linha | Estado |
|---|---|
| `main` | Sprint 0, Tenancy e Identity integradas no commit `1553b8ea` |
| PR #3 | Merged; Fundação Executável integrada |
| PR #4 | Merged; ADR-001 a ADR-006 integrados |
| PR #5 | Merged; Fundação de Tenancy integrada |
| PR #6 | Merged; Fundação de Identity integrada |
| `agent/core-access-foundation` | Segurança essencial implementada; validação em andamento |
| ADR-009 | `Approved`; escopo mínimo materializado |

## Escopo da MISSÃO 007

- pedido de autorização contextual;
- ação e recurso opacos;
- composição segura de `IdentityContext` e `ResolvedTenantContext`;
- decisão explícita `allow/deny`;
- negação por padrão;
- contexto autorizado vinculado ao pedido;
- porta agnóstica de avaliação;
- superfície pública e fronteira de confiança testáveis.

## Fora do escopo vigente

- autenticação concreta, JWT ou OIDC;
- controllers, guards, middleware e transporte;
- User, Organization e Workspace;
- persistência e administração de Role/Permission;
- RBAC/ABAC completo ou provider de políticas;
- políticas específicas de módulos empresariais;
- licenciamento, entitlements e auditoria persistente;
- APIs tenant-aware funcionais;
- módulos empresariais.

## Próximo gate

1. Validar o CI do PR nº 7.
2. Apresentar parecer técnico.
3. Aguardar autorização explícita antes do merge.
4. Após o merge, iniciar a MISSÃO 008 — MVP Santo Parma: Catálogo, Ficha Técnica, Estoque e CMV.

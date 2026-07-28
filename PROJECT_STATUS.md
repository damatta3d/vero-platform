# Status do Projeto

## Situação atual

**Versão da plataforma:** 0.1.0  
**Constituição:** VERO-CONST-001 v1.0.0 — Approved  
**Blueprint Volumes I e II:** v0.1.0 — Approved  
**Canonical Domain Model:** VERO-CDM-001 v0.1.0 — Approved  
**ADRs vigentes na `main`:** ADR-001 a ADR-009 v1.0.0 — Approved  
**Engineering Playbook:** VERO-ENG-001 v1.1.0 — Ativo  
**Fase:** MISSÃO 008 — MVP Santo Parma  
**Estado:** M008-A implementada e validada localmente; aguardando CI do PR #8
**Branch:** `agent/missao-008-santo-parma-mvp`  
**Baseline oficial da `main`:** `ca066dd6966d55bb1699c2643079a538fce097e1`  
**Atualizado em:** 2026-07-28

## Concluído

- Constituição, Blueprints I e II e CDM aprovados.
- ADR-001 a ADR-009 aprovados e integrados.
- Sprint 0 — Fundação Executável concluída.
- MISSÃO 005 — Fundação de Tenancy concluída e integrada.
- MISSÃO 006 — Fundação de Identity concluída e integrada.
- MISSÃO 007 — Segurança essencial de Access concluída e integrada pelo PR #7.
- Isolamento de Tenant, contextos confiáveis de Identity e autorização com negação por padrão disponíveis.
- CI da MISSÃO 007 aprovado no run `30367799955`.
- Sequência de fundações genéricas encerrada.
- Estratégia alterada para desenvolvimento vertical do MVP do Santo Parma.
- M008-A implementada com catálogo, ficha técnica, custo, margem, PostgreSQL, API e interface responsiva.
- Parmegiana de Alcatra validada como cenário real inicial.

## Estado das linhas GitHub

| Linha | Estado |
|---|---|
| `main` | Segurança essencial integrada no commit `ca066dd` |
| PR #3 | Merged; Fundação Executável |
| PR #4 | Merged; ADR-001 a ADR-006 |
| PR #5 | Merged; Tenancy |
| PR #6 | Merged; Identity |
| PR #7 | Merged; Access e segurança essencial |
| `agent/missao-008-santo-parma-mvp` | M008-A implementada; aguardando CI |
| ADR-009 | `Approved` e integrado |

## Escopo da MISSÃO 008

- produtos e insumos;
- unidades e fichas técnicas;
- compras e entradas;
- movimentações e posição de estoque;
- custo médio, CMV e margem;
- produção ou venda simplificada;
- API e interface web responsiva;
- isolamento por Tenant, autorização essencial e trilha mínima.

## Entrega atual — M008-A

- domínio de catálogo e ficha técnica;
- persistência PostgreSQL com migrations;
- API protegida;
- cálculo determinístico de custo;
- testes de regras e isolamento entre tenants;
- validação com um prato real do Santo Parma.

## Fora do escopo vigente

- integrações automáticas com iFood e Anote Aí;
- fiscal, contabilidade e conciliação;
- aprovação avançada de compras;
- produção avançada;
- RBAC/ABAC granular;
- CRM, RH, white-label e IA;
- fundações genéricas sem necessidade demonstrada.

## Próximo gate

1. Publicar M008-A e validar os jobs `quality` e `integration` no PR #8.
2. Confirmar migration, persistência e isolamento em PostgreSQL real no CI.
3. Avançar para M008-B — Compras e Estoque após o CI verde.
4. Manter o PR em rascunho até o fluxo completo e o parecer final da MISSÃO 008.

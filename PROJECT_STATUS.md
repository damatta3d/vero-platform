# Status do Projeto

## Situação atual

**Versão da plataforma:** 0.1.0  
**Constituição:** VERO-CONST-001 v1.0.0 — Approved  
**Blueprint Volumes I e II:** v0.1.0 — Approved  
**Canonical Domain Model:** VERO-CDM-001 v0.1.0 — Approved  
**ADRs vigentes na `main`:** ADR-001 a ADR-009 v1.0.0 — Approved  
**Engineering Playbook:** VERO-ENG-001 v1.1.0 — Ativo  
**Fase:** MISSÃO 008 — MVP Santo Parma  
**Estado:** M008-D em validação; embalagens integradas localmente ao estoque e ao CMV
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
- M008-B implementada com entradas de compra, ledger imutável, consumo, ajustes, saldo e custo médio móvel.
- Compra de 25 kg de batata por R$ 100 validada com custo normalizado de R$ 4/kg.
- CI da M008-B aprovado no run `30399611181`, incluindo migration e integração PostgreSQL.
- M008-C implementada com produção e venda nativas, snapshots históricos, baixa transacional, CMV
  realizado e margem de venda.
- CI `30401419715` aprovou vendas, migrations e integração PostgreSQL.
- CI `30402690997` aprovou produção, migration, integração PostgreSQL e `verify` integral.
- 106 testes e build dos 15 projetos aprovados.
- M008-D iniciada com distinção entre insumos e embalagens.
- Embalagens incluídas na ficha técnica e na baixa transacional de produção/venda.
- Validação local atualizada para 107 testes e build dos 15 projetos.

## Estado das linhas GitHub

| Linha | Estado |
|---|---|
| `main` | Segurança essencial integrada no commit `ca066dd` |
| PR #3 | Merged; Fundação Executável |
| PR #4 | Merged; ADR-001 a ADR-006 |
| PR #5 | Merged; Tenancy |
| PR #6 | Merged; Identity |
| PR #7 | Merged; Access e segurança essencial |
| `agent/missao-008-santo-parma-mvp` | M008-D com embalagens implementada localmente; aguardando CI |
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

## Entrega atual — M008-B

- domínio de compras e estoque sem dependência de framework;
- ledger de movimentações imutável no PostgreSQL;
- entradas, consumos e ajustes rastreados por motivo e autor;
- saldo e custo médio móvel calculados com precisão fixa;
- prevenção de estoque negativo;
- persistência serializável e atômica;
- API e interface responsiva para operação;
- isolamento por Tenant em consultas, chaves e relacionamentos;
- 79 testes aprovados localmente e build dos 13 projetos.

## Entrega atual — M008-C

- produção manual nativa independente de integrações externas;
- venda manual nativa independente de integrações externas;
- idempotência para impedir produção, venda e baixas duplicadas;
- snapshot imutável do produto, ficha, preço e custos utilizados;
- consumo dos insumos pelo rendimento da ficha;
- CMV estimado e realizado nas duas operações, com faturamento e margem apenas na venda;
- persistência da operação e baixa no ledger na mesma transação serializável;
- APIs, históricos e resumos operacionais na interface responsiva;
- 106 testes e build dos 15 projetos aprovados localmente e no CI.

## Entrega atual — M008-D

- classificação explícita de item como insumo ou embalagem;
- cadastro e estoque de embalagens por unidade;
- embalagens incluídas nas fichas técnicas versionadas;
- baixa conjunta de alimentos e embalagens na produção ou venda direta;
- custo estimado e realizado incluindo embalagens;
- interface responsiva com contadores, identificação e compra de embalagens;
- migration retrocompatível: cadastros existentes permanecem como insumos;
- 107 testes, arquitetura, lint e build dos 15 projetos aprovados localmente.

## Fora do escopo vigente

- integrações automáticas com iFood e Anote Aí;
- fiscal, contabilidade e conciliação;
- aprovação avançada de compras;
- produção avançada;
- RBAC/ABAC granular;
- CRM, RH, white-label e IA;
- fundações genéricas sem necessidade demonstrada.

## Próximo gate

1. Validar a migration e o cenário transacional de embalagens no CI do PR #8.
2. Preencher os custos reais de HM05F, MC500 e MO100-4.
3. Executar a validação guiada da Parmegiana de Alcatra individual.

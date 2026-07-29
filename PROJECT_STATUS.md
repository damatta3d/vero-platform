# Status do Projeto

## Situação atual

**Versão da plataforma:** 0.1.0  
**Constituição:** VERO-CONST-001 v1.0.0 — Approved  
**Blueprint Volumes I e II:** v0.1.0 — Approved  
**Canonical Domain Model:** VERO-CDM-001 v0.1.0 — Approved  
**ADRs vigentes na `main`:** ADR-001 a ADR-009 v1.0.0 — Approved; ADR-010 v1.0.0 — Approved no PR #10  
**Engineering Playbook:** VERO-ENG-001 v1.1.0 — Ativo  
**Fase:** MISSÃO 009 — Connector Anota AI

**Estado:** PR #9 integrado; smoke read-only aprovado; Gate A arquitetural aprovado no PR #10

**Branch:** `agent/missao-009-anota-ai-governance`

**Baseline oficial da `main`:** `bac02c7aa561f62fb582381fd0b710e948fc3d2a`

**Atualizado em:** 2026-07-29

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
- CI `30417176073` aprovou migration, persistência de embalagens, 107 testes e 15 builds.
- Custos reais de HM05F, MC500, MO100-4 e TPMO100 incorporados à validação.
- CI final `30461716408` aprovou `quality` e `integration` com PostgreSQL real.
- Validação guiada da Parmegiana de Alcatra individual concluída.
- Parecer técnico final da MISSÃO 008 favorável à aprovação do PR #8.
- PR #8 integrado à `main` no commit `34fdcf4`.
- MISSÃO 009 implementada no PR #9 e integrada concorrentemente durante a revisão arquitetural.
- `VERO-INT-001` v1.0.0 aprovado no Gate A da MISSÃO 009.
- ADR-010 v1.0.0 aprovado para Integration Hub e fronteira do Connector Anota AI.
- Identificado que pedido externo não pode ser convertido diretamente na venda simplificada atual.
- PR #9 integrado com cliente OAuth, ACL e vínculos de catálogo multitenant.
- Smoke read-only `30471438277` autenticou, listou 30 categorias e traduziu 1 pedido real.
- CI `30471437674` aprovou quality, migrations e integração PostgreSQL.
- Timeout próprio e erro sanitizado adicionados à autenticação e às chamadas do conector.

## Estado das linhas GitHub

| Linha | Estado |
|---|---|
| `main` | Connector Anota AI do PR #9 integrado no commit `bac02c7` |
| PR #3 | Merged; Fundação Executável |
| PR #4 | Merged; ADR-001 a ADR-006 |
| PR #5 | Merged; Tenancy |
| PR #6 | Merged; Identity |
| PR #7 | Merged; Access e segurança essencial |
| PR #8 | Merged; MVP Santo Parma |
| PR #9 | Merged; Connector Anota AI read-only e vínculos homologados |
| PR #10 | Gate A aprovado; Design, ADR e timeout em validação final |
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
- 107 testes, arquitetura, lint e build dos 15 projetos aprovados localmente e no CI;
- migration e baixa transacional das embalagens aprovadas com PostgreSQL real no CI
  `30417176073`.
- compra real de 300 HM05F por R$ 242,06 e 400 MC500 por R$ 475,34 validada;
- venda de duas Parmegianas baixou duas unidades de cada embalagem atomicamente;
- CMV estimado preciso de duas vendas validado em R$ 19,89;
- CI final `30461716408` aprovou `quality`, migrations e integração PostgreSQL.

## Escopo da MISSÃO 009

- pesquisa dos contratos oficiais da Anota AI;
- Integration Hub provider-neutral;
- Connector Anota AI com Anti-Corruption Layer;
- conexão por tenant e estabelecimento;
- inbox, deduplicação, resiliência e observabilidade;
- Order Intake antes de qualquer venda automática;
- homologação progressiva iniciando por read-only.

## Fora do escopo vigente

- integração com iFood;
- fiscal, contabilidade e conciliação;
- aprovação avançada de compras;
- produção avançada;
- RBAC/ABAC granular;
- CRM, RH, white-label e IA;
- fundações genéricas sem necessidade demonstrada.

## Próximo gate

1. Concluir os gates do PR #10 e submetê-lo à decisão de merge.
2. Fechar lifecycle, health e governança de conexão.
3. Confirmar com a Anota AI os contratos operacionais pendentes.
4. Definir SecretProvider para ambiente compartilhado.
5. Manter webhooks, venda e estoque bloqueados até o próximo gate.

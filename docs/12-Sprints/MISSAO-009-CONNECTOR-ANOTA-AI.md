# MISSÃO 009 — Connector Anota AI

## Estado

**Status:** Implementação read-only integrada; Gate A arquitetural aprovado
**Tenant piloto:** O Santo Parma
**Branch:** `agent/missao-009-anota-ai-governance`
**Baseline:** `main` em `bac02c7aa561f62fb582381fd0b710e948fc3d2a`

## Objetivo

Integrar pedidos da Anota AI à VERO por uma fronteira segura, multitenant, idempotente e
independente do fornecedor, começando por conectividade read-only e avançando somente após os
contratos oficiais e o desenho arquitetural serem aprovados.

## Entregas

### M009-A — Pesquisa e desenho

- inventário da documentação oficial;
- cliente OAuth e smoke read-only;
- tradução estrutural de pedido real;
- Design Document `VERO-INT-001`;
- ADR-010;
- matriz de contratos confirmados e pendentes;
- perguntas formais para homologação;
- gate explícito antes de código.

### M009-B — Fundação read-only

- Integration Hub mínimo e provider-neutral;
- conexão por tenant e estabelecimento;
- referência segura de credencial;
- cliente Anota AI conforme contrato oficial;
- health, telemetria e auditoria;
- fixtures e contract tests;
- smoke test read-only.

### M009-C — Captura e Order Intake

- polling ou webhook conforme documentação;
- inbox, deduplicação, replay e quarentena;
- Anti-Corruption Layer;
- mapeamento de produtos e adicionais;
- contrato público Business de Order Intake;
- nenhum efeito de estoque com mapeamento incompleto.

### M009-D — Ações e homologação

- ações externas oficialmente suportadas;
- autorização e auditoria;
- transição terminal idempotente para venda;
- validação controlada com O Santo Parma;
- parecer técnico final.

## Invariantes

- DTOs externos não atravessam a fronteira Integrations;
- toda execução possui tenant e conexão resolvidos;
- segredos nunca entram no repositório, logs, documentação ou banco em texto aberto;
- redelivery não duplica efeito empresarial;
- pedido recebido não é tratado automaticamente como venda concluída;
- estoque não é baixado antes do estado terminal aprovado;
- a VERO opera com o conector desligado;
- nenhuma mutação externa ocorre sem contrato e autorização.

## Fora do escopo inicial

- sincronização completa de cardápio;
- importação histórica;
- conciliação financeira;
- logística;
- CRM e marketing;
- iFood;
- exactly-once.

## Quality gates

- Design Document e ADR aprovados;
- contratos oficiais rastreáveis;
- TypeScript strict, lint, formatação e arquitetura;
- unit, contract, integration e tenant isolation tests;
- testes de timeout, retry, duplicata, replay e redaction;
- CI `quality` e `integration`;
- smoke test read-only antes de qualquer mutação;
- parecer técnico antes do merge.

## Gate atual

Integrar o PR #10 após os gates finais e autorização. Em seguida, fechar lifecycle, health,
governança de conexão e os contratos operacionais pendentes com a Anota AI. Ativação operacional,
webhooks, venda e estoque continuam bloqueados.

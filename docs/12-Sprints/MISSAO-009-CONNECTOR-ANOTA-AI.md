# MISSÃO 009 — Connector Anota AI

## Estado

**Status:** Gate A — prova read-only concluída; desenho em revisão  
**Tenant piloto:** O Santo Parma  
**Branch:** `agent/missao-009-anota-ai-design`  
**Baseline:** `main` em `34fdcf456c551bcd580299effde6d500fc5b405d`

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

Submeter `VERO-INT-001` e ADR-010 à revisão do Arquiteto-Chefe. O cliente read-only permanece no PR
Draft; ativação operacional, webhooks, venda e estoque continuam bloqueados.

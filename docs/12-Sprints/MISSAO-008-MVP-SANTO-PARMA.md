# MISSÃO 008 — MVP Santo Parma

## Estado

**Status:** Em execução  
**Estratégia:** desenvolvimento vertical orientado ao uso real  
**Tenant piloto:** Santo Parma  
**Branch:** `agent/missao-008-santo-parma-mvp`

## Objetivo

Entregar o menor fluxo completo que permita ao Santo Parma controlar produtos, insumos, fichas técnicas, compras, estoque, CMV e margem sem depender de planilha paralela.

A missão não criará novas fundações genéricas. Cada incremento deve atravessar domínio, persistência, API e interface quando necessário ao fluxo utilizável.

## Critério de sucesso

Christian consegue:

1. cadastrar um insumo com unidade e custo;
2. registrar uma entrada de compra;
3. cadastrar um produto vendido;
4. montar a ficha técnica com quantidades;
5. consultar custo atual, CMV estimado e margem;
6. registrar produção ou venda simplificada;
7. conferir a baixa e a posição de estoque.

## Entregas verticais

### M008-A — Catálogo e ficha técnica

- cadastro tenant-aware de insumos e produtos;
- unidades mínimas: unidade, grama, quilograma, mililitro e litro;
- ficha técnica versionada por produto;
- cálculo determinístico do custo da ficha;
- trilha mínima de autoria e alteração;
- API protegida pela segurança essencial;
- testes de domínio, contrato e isolamento entre tenants.

### M008-B — Compras e estoque

- entrada de compra;
- movimentações imutáveis de entrada, consumo e ajuste;
- saldo por insumo;
- custo médio móvel;
- prevenção de estoque negativo onde a operação exigir;
- consulta de posição de estoque.

### M008-C — Produção, venda, CMV e margem

- produção ou venda simplificada;
- consumo calculado pela ficha técnica vigente;
- CMV realizado e estimado;
- preço de venda e margem em valor e percentual;
- painel operacional mínimo.

### M008-D — Interface utilizável

- interface web responsiva;
- fluxo guiado de cadastro e operação;
- estados de carregamento, vazio e erro;
- validação com um prato real do Santo Parma.

## Regras invariantes

- todo dado empresarial carrega `tenantId`;
- nenhuma consulta ou alteração cruza tenants;
- valores monetários usam representação inteira de centavos;
- quantidades usam precisão decimal explícita e unidade compatível;
- movimentações de estoque são rastreáveis e não são sobrescritas;
- custo histórico de uma operação não muda quando o preço atual do insumo muda;
- autorização é negada por padrão;
- regras de domínio não dependem de NestJS, Prisma ou transporte.

## Fora do escopo

- integração automática com iFood ou Anote Aí;
- fiscal, contabilidade e conciliação;
- compras com aprovação;
- produção avançada e planejamento;
- RBAC/ABAC granular;
- mensageria, cache, white-label, CRM, RH e IA sem necessidade demonstrada.

## Quality gates

- TypeScript strict;
- lint e formatação;
- testes unitários das regras de custo e estoque;
- testes de persistência e isolamento entre tenants;
- validação arquitetural;
- build integral;
- auditoria sem vulnerabilidade alta;
- CI `quality` e `integration`.

## Gate de merge

O PR permanece em rascunho durante a implementação. O merge só poderá ocorrer após fluxo utilizável demonstrado, CI integral aprovado e novo parecer técnico.

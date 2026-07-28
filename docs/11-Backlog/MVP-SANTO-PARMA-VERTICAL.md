# MVP Santo Parma — desenvolvimento vertical

## Objetivo

Colocar a VERO em uso real no Santo Parma com o menor fluxo completo que gere controle operacional e financeiro, preservando isolamento por Tenant e autorização essencial.

## Estratégia

Cada missão entrega banco, regra de negócio, API e interface do mesmo fluxo. Não serão criadas novas fundações genéricas sem necessidade demonstrada pelo MVP.

## Fatia 1 — Catálogo, ficha técnica, estoque e CMV

Fluxo utilizável:

1. cadastrar insumos com unidade e custo;
2. registrar entrada de compra;
3. cadastrar produto vendido;
4. montar ficha técnica com quantidades;
5. calcular custo atual e CMV estimado;
6. registrar produção ou venda simplificada;
7. baixar estoque;
8. visualizar posição de estoque, custo e margem.

### Escopo mínimo

- único Tenant piloto: Santo Parma, mantendo `tenantId` em todos os dados;
- perfis simples: administrador e funcionário;
- produtos, insumos, unidades e fichas técnicas;
- movimentações de entrada, consumo e ajuste;
- custo médio e CMV estimado;
- API e interface web responsiva;
- trilha mínima de quem criou ou alterou registros;
- testes das regras de estoque, custo e isolamento entre tenants.

### Fora da primeira fatia

- integrações automáticas com iFood ou Anote Aí;
- fiscal, contabilidade e conciliação bancária;
- compras com workflow de aprovação;
- produção avançada e planejamento;
- CRM, RH, white-label e IA;
- RBAC/ABAC granular;
- mensageria e cache sem necessidade medida.

## Critério de sucesso

Christian consegue cadastrar um prato real do Santo Parma, informar seus insumos e uma compra, registrar produção ou venda e visualizar estoque, custo e margem sem usar planilha paralela.

## Próxima missão proposta

**MISSÃO 008 — MVP Santo Parma: Catálogo, Ficha Técnica, Estoque e CMV.**

Ela só será iniciada após a integração da segurança essencial da MISSÃO 007.

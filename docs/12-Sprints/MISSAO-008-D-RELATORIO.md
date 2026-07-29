# MISSÃO 008-D — Interface, embalagens e validação operacional

## Resultado

**Estado:** custos reais incorporados; aguardando CI final da validação guiada
**Branch:** `agent/missao-008-santo-parma-mvp`  
**PR:** #8 — permanece em rascunho  
**CI:** run `30417176073` — `quality` e `integration` aprovados

## Fluxo entregue

- itens de catálogo classificados como `INGREDIENT` ou `PACKAGING`;
- embalagens compradas e controladas por unidade no mesmo ledger imutável;
- ficha técnica versionada composta por alimentos e embalagens;
- custo estimado inclui as embalagens selecionadas;
- produção ou venda direta baixa alimentos e embalagens na mesma transação;
- custo médio realizado das embalagens preservado no snapshot da operação;
- interface separa visualmente insumos e embalagens.

## Primeiro cenário Santo Parma

- HM05F — parmegiana individual, recipiente de proteína/molho/queijo;
- MC500 — arroz e batata rústica da parmegiana individual;
- MO100-4 — marmitex de quatro divisórias do Monte seu Prato.
- TPMO100 — tampa compatível da MO100-4.

HM05F e MC500 devem compor a ficha da Parmegiana de Alcatra individual, uma unidade de cada por
porção. MO100-4 e TPMO100 devem compor as fichas dos produtos da categoria Monte seu Prato, uma
unidade de cada porção.

## Compra real de 28/07/2026

| Código | Conteúdo por caixa | Caixas | Quantidade total | Total dos produtos | Custo unitário exato |
| --- | ---: | ---: | ---: | ---: | ---: |
| HM05F | 150 un. | 2 | 300 un. | R$ 242,06 | R$ 0,806866... |
| MC500 com tampa | 200 un. | 2 | 400 un. | R$ 475,34 | R$ 1,18835 |
| MO100-4 | 100 un. | 2 | 200 un. | R$ 225,40 | R$ 1,127 |
| TPMO100 | 100 un. | 2 | 200 un. | R$ 171,04 | R$ 0,8552 |

O custo combinado de embalagem da Parmegiana individual é R$ 1,995216... e arredonda para
**R$ 2,00 por pedido**. O custo combinado do Monte seu Prato é R$ 1,9822 e arredonda para
**R$ 1,98 por pedido**.

Os produtos somam R$ 1.113,84. A diferença para o total da nota, R$ 1.117,84, corresponde a
R$ 4,00 de outras despesas acessórias e não foi rateada nos itens nesta validação.

## Evidências locais

- migration Prisma criada com padrão retrocompatível `INGREDIENT`;
- teste de domínio prova a inclusão da HM05F no custo da receita;
- teste de aplicação preserva a classificação `PACKAGING`;
- teste PostgreSQL preparado para persistir a HM05F e sua relação com a ficha;
- 107 testes unitários aprovados;
- lint, TypeScript strict e arquitetura aprovados;
- build dos 15 projetos aprovado.

## Evidências do CI

- migration aplicada com sucesso;
- HM05F persistida como embalagem;
- venda de duas porções baixou duas embalagens e os alimentos na mesma transação;
- CMV e margem realizados incluíram o custo médio das embalagens;
- 107 testes, arquitetura, lint e 15 builds aprovados.

## Validação guiada

- catálogo usa o preço e a quantidade por caixa, preservando precisão no cálculo unitário;
- ficha da Parmegiana individual consome uma HM05F e uma MC500 por porção;
- entrada real registra 300 HM05F por R$ 242,06 e 400 MC500 por R$ 475,34;
- venda de duas porções baixa duas unidades de cada embalagem na mesma transação;
- CMV estimado e realizado incluem ambas as embalagens e preservam o custo histórico.

O fechamento depende somente do CI final desta validação e do parecer técnico da MISSÃO 008.

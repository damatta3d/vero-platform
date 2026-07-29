# MISSÃO 008-D — Interface, embalagens e validação operacional

## Resultado

**Estado:** implementação aprovada no CI; aguardando custos reais e validação guiada  
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

HM05F e MC500 devem compor a ficha da Parmegiana de Alcatra individual, uma unidade de cada por
porção. MO100-4 será usada nas fichas dos produtos da categoria Monte seu Prato.

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

## Gate pendente

Os valores definitivos das embalagens serão cadastrados após confirmação do preço e da quantidade
por pacote. Em seguida será executado o teste guiado da Parmegiana de Alcatra individual.

# VERO Intelligence — matriz oficial de capacidades do iFood

## Controle

| Campo | Valor |
|---|---|
| Estado | Discovery |
| Branch | `agent/vero-intelligence-discovery` |
| Data da verificação | 2026-07-29 |
| Critério | Somente documentação oficial pública do iFood |
| Uso | Gate de integração e desenho do modelo canônico |

Este documento não concede acesso à VERO, não substitui homologação e não aprova implementação.
A existência de um módulo na documentação pública não significa que todos os escopos estejam liberados
para uma aplicação ou estabelecimento.

## Legenda de acesso

| Código | Significado |
|---|---|
| API-R | Leitura por API oficial documentada |
| API-W | Escrita/operação por API oficial documentada |
| EVT | Evento por webhook ou polling |
| FILE | Arquivo oficial disponibilizado para integração ou conciliação |
| PORTAL | Informação confirmada no Portal do Parceiro |
| GATE | Depende de consentimento, escopo, produto contratado ou homologação |
| NC | Acesso programático público não comprovado |

## Matriz por módulo

| Módulo | Capacidades oficialmente documentadas | Via | Valor para o Intelligence | Limites e gates |
|---|---|---|---|---|
| Authentication | OAuth 2.0; modelos centralizado e distribuído; Bearer token | API-R, GATE | Identificar aplicação, consentimento e estabelecimentos autorizados | Credenciais, escopos e onboarding são controlados pelo iFood; não registrar token em logs |
| Merchant | Descoberta/listagem de lojas; dados da loja; status por operação; horários; interrupções temporárias | API-R, API-W, GATE | Dimensão de estabelecimento, disponibilidade e contexto operacional | Escritas operacionais não pertencem ao Intelligence; escopo Merchant deve estar liberado |
| Catalog v2 | Categorias, itens, produtos, grupos de opções, opções, preço, disponibilidade e contextos do cardápio | API-R, API-W, GATE | Dimensões de produto/categoria/complemento, preço e disponibilidade | A VERO deve preservar IDs externos e reconciliar com `CatalogProduct`; leitura histórica de preço não foi comprovada |
| Order | Detalhe de pedido, itens, complementos, valores, pagamentos, benefícios/descontos, entrega/retirada e ciclo operacional | API-R, API-W, EVT, GATE | Fatos de pedido e item, canal, descontos e tempos operacionais | É API operacional orientada a eventos; não deve ser presumida como consulta histórica ilimitada |
| Events | Recepção por webhook ou polling; confirmação de recebimento no polling | EVT, API-R, API-W | Ingestão incremental e atualização do ciclo do pedido | Polling documenta `GET /events:polling` e acknowledgement em `POST /events/acknowledgment`; exige idempotência, retry e observabilidade |
| Promotion v2 | Criação e gestão de promoções de produtos; regras e descontos | API-R, API-W, GATE | Dimensão de promoção e vínculo com itens | A documentação confirma gestão, não uma API pública completa de performance/ROI; descontos acima do limite documentado são rejeitados |
| Financial — Sales | Status e identificadores de pedido, meios de pagamento, valores pagos, recebedores e detalhamento financeiro por pedido | API-R, GATE | Receita líquida, taxas, descontos, recebedores e conciliação por pedido | Módulo financeiro exige homologação; campos efetivos dependem do contrato e versão |
| Financial — Financial Events | Eventos/lançamentos financeiros associados ao fluxo do parceiro | API-R, GATE | Ledger externo de ajustes, taxas e ocorrências financeiras | Catálogo completo de campos e janela devem ser confirmados na homologação |
| Financial — Reconciliation | Arquivos CSV de conciliação mensal, atualizados semanalmente com novos lançamentos | FILE, GATE | Reconciliação financeira reproduzível e fechamento | Não é streaming; requer versionamento do arquivo, checksum, competência e reprocessamento seguro |
| Financial — Reconciliation On-Demand | Solicitação/obtenção de conciliação sob demanda | API-R, FILE, GATE | Backfill e recuperação controlada | Disponibilidade e limites dependem do produto/homologação |
| Financial — Settlement | Informações de repasses/liquidações | API-R, GATE | Previsão e confirmação de repasse | Acesso não deve ser presumido antes do escopo financeiro ser concedido |
| Financial — Anticipation | Antecipações via iFood Pago, incluindo valores e datas para planos elegíveis | API-R, GATE | Custo e efeito de antecipação no caixa | Apenas lojas/produtos elegíveis; não é componente de margem do prato sem vínculo financeiro comprovado |
| Reviews v2 | Lista paginada de avaliações por estabelecimento, filtros de data e ordenação | API-R, GATE | Nota, volume, temas e relação com produto/operação quando houver evidência | Limite público confirmado para a API de avaliações: 10 requisições por segundo por token |
| Shipping | Operações de entrega e acompanhamento logístico conforme modalidade | API-R, API-W, EVT, GATE | Tempos e contexto de entrega quando associados ao pedido | Fora do primeiro corte analítico; não ativar efeitos operacionais pelo Intelligence |

## Campos canônicos mínimos comprováveis

A matriz abaixo define grupos de dados que podem alimentar o modelo analítico. Ela não fixa ainda
nomes finais de entidades ou tabelas.

| Grupo | Fonte preferencial | Situação | Observação de modelagem |
|---|---|---|---|
| Estabelecimento e operação | Merchant | Comprovado | Chave externa por provedor e estabelecimento; nunca substituir `company_id` |
| Categoria, item, opção e preço atual | Catalog v2 | Comprovado | Reconciliar com catálogo VERO; preservar identidade e payload de origem |
| Pedido e item | Order + Events | Comprovado | Persistir fato externo idempotente antes da reconciliação |
| Status e tempos do pedido | Events + Order | Comprovado | Ordenar por tempo da fonte e tempo de ingestão |
| Desconto/benefício observado no pedido | Order | Comprovado | Separar financiador somente quando o payload o demonstrar |
| Promoção cadastrada | Promotion v2 | Comprovado com gate | Não inferir ROI pela existência da promoção |
| Valores financeiros por pedido | Financial Sales | Comprovado com homologação | Fonte preferencial para margem de contribuição após reconciliação |
| Lançamentos e ajustes | Financial Events/Reconciliation | Comprovado com homologação | Manter natureza, competência, repasse e referência de pedido quando disponíveis |
| Avaliações | Reviews v2 | Comprovado com gate | Minimização de dados pessoais e retenção própria |
| Visitas, visualizações e funil | Portal do Parceiro | API pública não comprovada | Ingestão somente por exportação oficial comprovada ou integração futura |
| Ranking, benchmarking e posicionamento | Portal/produtos do iFood | API pública não comprovada | Não estimar como fato oficial |
| ROI consolidado de campanha | Portal | API pública não comprovada | Calcular na VERO apenas com custos, vendas incrementais e baseline documentados |
| Cashback e cupons fora do pedido/financeiro | Portal/contratos específicos | Parcial | Não criar campos obrigatórios sem payload ou arquivo comprovado |
| Histórico de preço do catálogo | VERO + snapshots futuros | Não fornecido como série histórica comprovada | Criar histórico próprio a partir de mudanças observadas, com procedência |

## Autenticação, autorização e tenancy

1. Uma conexão iFood pertence a uma `company_id` e a um estabelecimento VERO explícitos.
2. O identificador do estabelecimento externo nunca será aceito como Tenant confiável.
3. O fluxo distribuído é o candidato natural para SaaS multi-tenant, mas a escolha depende do
   programa oficial de integração e será submetida ao gate.
4. Tokens e segredos ficam fora do domínio, dos logs, dos payloads analíticos e dos documentos.
5. Cada chamada deve aplicar o menor escopo liberado e auditar aplicação, conexão, estabelecimento,
   operação, correlação e resultado sem expor credenciais.

## Eventos, polling e consistência

- Webhook é preferível para baixa latência quando oficialmente habilitado.
- Polling é alternativa oficial; eventos só podem ser confirmados depois de persistência durável.
- Redelivery não é erro de negócio: consumers devem ser idempotentes.
- O detalhe do pedido deve ser buscado e versionado quando o evento não contiver todos os dados.
- A ordem de chegada não é garantia de ordem de negócio; preservar timestamps da fonte e da VERO.
- Uma indisponibilidade do iFood não pode bloquear vendas, estoque ou demais módulos nativos.

## Rate limits

| Área | Limite público verificado | Política VERO |
|---|---|---|
| Reviews | 10 requests/s por token | Limiter por conexão, backoff com jitter e tratamento de 429 |
| Demais módulos | Valor numérico não consolidado nesta verificação pública | Não inventar limite; adotar limiter configurável por módulo e confirmar na homologação |
| Financial | Homologação exige comportamento resiliente a rate limiting | Backoff, retry limitado, circuit breaker e checkpoints sem duplicação |

Qualquer número não confirmado deve permanecer configuração externa e conservadora. A VERO não
codificará um limite presumido como regra de domínio.

## Impacto no primeiro corte vertical

O primeiro corte deve usar somente dados com origem comprovada:

1. estabelecimentos autorizados via Authentication/Merchant;
2. pedidos e eventos via Order/Events;
3. catálogo atual via Catalog v2;
4. valores financeiros por pedido via Financial Sales, se o escopo for homologado;
5. arquivo de conciliação como fonte posterior de validação;
6. CMV da VERO, já existente;
7. margem de contribuição calculada de forma determinística e rastreável.

Sem Financial Sales homologada, o MVP poderá exibir faturamento bruto, descontos observados e CMV,
mas deverá rotular taxas, receita líquida e margem de contribuição como incompletas — nunca estimá-las
como valores oficiais.

## Itens deliberadamente não aprovados

- scraping autenticado do Portal;
- alteração automática de preço ou promoção;
- ativação de ações operacionais de pedido pelo Intelligence;
- armazenamento indiscriminado de dados pessoais;
- inferência de escopos, endpoints ou campos ausentes;
- novo data warehouse no MVP;
- qualquer ADR em estado `Accepted` antes do gate arquitetural.

## Fontes oficiais verificadas

- https://developer.ifood.com.br/docs/guides/modules/authentication/intro
- https://developer.ifood.com.br/docs/guides/modules/authentication/centralized
- https://developer.ifood.com.br/docs/guides/modules/authentication/distributed
- https://developer.ifood.com.br/docs/guides/modules/merchant/workflow
- https://developer.ifood.com.br/docs/guides/modules/merchant/endpoints
- https://developer.ifood.com.br/en-US/docs/guides/modules/catalog/introduction
- https://developer.ifood.com.br/docs/guides/modules/catalog/definitions
- https://developer.ifood.com.br/en-US/docs/guides/modules/order/fundamentals
- https://developer.ifood.com.br/docs/guides/modules/order/homologation
- https://developer.ifood.com.br/docs/guides/modules/events/intro
- https://developer.ifood.com.br/en-US/docs/guides/modules/events/webhook-overview
- https://developer.ifood.com.br/en-US/docs/guides/modules/events/polling-overview
- https://developer.ifood.com.br/docs/guides/modules/promotion/general
- https://developer.ifood.com.br/docs/guides/modules/promotion/endpoints
- https://developer.ifood.com.br/docs/guides/modules/financial/intro
- https://developer.ifood.com.br/docs/guides/modules/financial/api-sales
- https://developer.ifood.com.br/docs/guides/modules/financial/api-reconciliation
- https://developer.ifood.com.br/docs/guides/modules/financial/api-antecipation
- https://developer.ifood.com.br/docs/guides/modules/financial/homologation
- https://developer.ifood.com.br/docs/guides/modules/review/v1
- https://developer.ifood.com.br/docs/guides/modules/review/endpoints/

## Resultado do gate D1

A documentação oficial é suficiente para afirmar que pedidos, catálogo, promoções cadastradas,
financeiro por pedido, conciliação e avaliações possuem caminhos oficiais. Ela não é suficiente para
afirmar que visitas, conversão, benchmarking, performance consolidada de campanhas ou todo o conteúdo
do Portal estejam disponíveis por API.

O D1 fica concluído em nível de discovery público, com pendências operacionais de escopos,
homologação, payloads reais e limites por módulo. Essas pendências bloqueiam implementação produtiva,
mas não bloqueiam o desenho do modelo canônico mínimo.

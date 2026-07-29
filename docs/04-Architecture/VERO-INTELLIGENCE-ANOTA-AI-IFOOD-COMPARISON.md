# VERO Intelligence — matriz comparativa Anota AI × iFood

## Controle

| Campo | Valor |
|---|---|
| Estado | Discovery |
| Data | 2026-07-29 |
| Escopo | Capacidades úteis ao VERO Intelligence |
| Evidência Anota AI | Código integrado, smoke read-only e payload real sanitizado dos PRs #9 e #10 |
| Evidência iFood | Documentação oficial pública consolidada na matriz D1 |
| Regra | Ausência de evidência permanece como não comprovada |

Este documento compara a cobertura disponível para a VERO. Ele não afirma que uma capacidade
documentada está liberada para a aplicação, nem autoriza mutações, webhooks, vendas ou baixas de
estoque.

## 1. Conclusão executiva

A Anota AI possui hoje a integração mais madura dentro da VERO: autenticação, estabelecimento,
pedido, itens, adicionais, descontos, pagamento, cliente, entrega e cardápio foram observados em
homologação read-only e traduzidos para o contrato provider-neutral `ExternalOrder`.

O iFood possui a superfície oficial mais ampla para inteligência comercial: além de pedido e
catálogo, documenta promoções, vendas financeiras por pedido, eventos financeiros, conciliação,
repasses, antecipações e avaliações. Essa amplitude ainda depende de cadastro, escopos,
homologação e payloads reais.

Portanto:

- **Anota AI é a melhor primeira fonte para validar a ingestão canônica de pedidos**, porque já está
  conectada e homologada em leitura;
- **iFood é a fonte estratégica para ampliar financeiro, promoções e avaliações**, após acesso
  oficial;
- nenhuma das duas fontes possui hoje evidência suficiente para abastecer funil, visitas,
  conversão, benchmarking ou ROI completo de campanhas por API;
- dados mais ricos não significam dados mais confiáveis: cada campo precisa registrar origem,
  instante, versão, qualidade e reconciliação.

## 2. Matriz comparativa

| Capacidade | Anota AI na VERO | iFood oficial | Decisão |
|---|---|---|---|
| Autenticação | OAuth 2.0 `client_credentials` homologado | Fluxos centralizado e distribuído documentados | Reutilizar `IntegrationConnection`; adapters privados |
| Estabelecimento | `x-page-id` homologado | Merchant e autorização por merchant documentados | Resolver sempre para Tenant e estabelecimento VERO |
| Lista de pedidos | Homologada em leitura | Order API documentada | Ingestão incremental somente após contrato de janela/checkpoint |
| Detalhe do pedido | Homologado com pedido real sanitizado | Documentado | Traduzir ambos para contrato provider-neutral versionado |
| Eventos de pedido | Callbacks documentados, não ativados | Polling e webhook documentados | Inbox durável antes de qualquer efeito Business |
| Estados e transições | Operações existem no adapter; catálogo formal pendente | Ciclo oficial documentado; homologação necessária | Intelligence é somente leitura e não executa transições |
| Identidade do pedido | Provider, página, ID, referência e chave idempotente | IDs/eventos documentados | Chave natural por Tenant + conexão + pedido + revisão |
| Itens | ID, referências opcionais, nome, quantidade, preço e total homologados | Itens documentados | Persistir snapshot e reconciliar por vínculo explícito |
| Adicionais/complementos | Subitens com pai, quantidade, preço e total homologados | Catálogo e pedido cobrem complementos | Não transformar complemento em produto silenciosamente |
| Descontos | Valor e tag observados | Benefícios/descontos no pedido e financeiro | Financiador e campanha permanecem desconhecidos sem evidência |
| Taxa de entrega | Observada no pedido | Pedido/financeiro documentados | Preservar componente separado |
| Outras taxas | Payload não vazio ainda bloqueado | Financial Sales/Events documentados | Tipar por natureza somente após payload homologado |
| Pagamentos | Código, nome, cartão, pré-pago, troco e valor observados | Pedido/financeiro documentados | Minimizar detalhes; não usar como identidade de cliente |
| Cliente | Nome e telefone opcionais observados | Dados limitados podem existir no pedido | Não copiar para analytics; pseudonimizar apenas se necessário |
| Endereço | Endereço e coordenadas observados | Dados de entrega podem existir | Excluir do fato analítico padrão; geografia somente agregada |
| Catálogo atual | Exportação com 30 categorias observada; partes ainda genéricas | Catalog v2 documentado | Catálogo VERO é mestre; snapshots externos não viram agregado interno |
| Histórico de preço | Não comprovado como série oficial | Não comprovado como série oficial | Histórico pertence ao Catálogo VERO a partir de mudanças observadas |
| Promoções | API pública específica não comprovada nesta homologação | Promotion v2 documentada | Cadastro não prova performance ou ROI |
| Financeiro por pedido | Não comprovado | Financial Sales documentada | Fonte preferencial de receita líquida e componentes após homologação |
| Conciliação | Não comprovada | Reconciliation oficial documentada | Fonte de fechamento, com checksum e competência |
| Repasses/antecipações | Não comprovados | Settlement/Anticipation documentados | Não ratear por produto sem regra rastreável |
| Avaliações | API pública não comprovada | Reviews v2 documentada | Módulo posterior, com retenção e minimização |
| Estoque do provider | Não comprovado | Não é fonte mestre proposta | Estoque VERO permanece soberano |
| Funil/visitas/conversão | Não comprovado | Portal exibe; API pública não comprovada | Bloqueado até API ou exportação oficial |
| ROI de campanha | Não comprovado | Analytics completo não comprovado | Calcular apenas com custo, baseline e atribuição documentados |

## 3. Campos já homologados no contrato comum

O contrato `ExternalOrder` já preserva:

- `currency = BRL`;
- identidade do provider, estabelecimento, pedido, referência e idempotência;
- merchant e origem do pedido;
- criação e atualização;
- itens e modificadores com quantidade, preço unitário e total;
- descontos;
- taxa de entrega e posição reservada para taxas adicionais;
- pagamentos;
- total;
- cliente opcional;
- endereço opcional.

Esse contrato é uma fronteira de entrada em memória. Ele **não** representa venda concluída, fato
financeiro reconciliado, estoque, cliente mestre ou registro analítico persistido.

## 4. Lacunas do contrato comum para analytics

A evolução deve ser aditiva e versionada. Os seguintes dados não podem ser inventados a partir do
contrato atual:

- `connectionId` e Tenant resolvido pelo Integration Hub;
- revisão/versão do pedido e estado operacional;
- instante do evento externo, recebimento e processamento;
- cancelamento, motivo e responsável;
- natureza e financiador de desconto, cupom ou benefício;
- classificação de taxa, comissão, subsídio e ajuste;
- valor líquido, repasse e competência financeira;
- vínculo de promoção/campanha;
- estado de reconciliação de cada item;
- procedência do campo e qualidade;
- hash/schema do payload sanitizado.

Esses elementos pertencem ao envelope de ingestão e aos fatos reconciliados, não aos DTOs dos
providers.

## 5. O que a Anota AI fornece de mais útil hoje

Comparada ao acesso iFood ainda não homologado, a Anota AI fornece para a VERO:

- evidência operacional real de conectividade;
- payload real de pedido já traduzido;
- itens e adicionais já preparados para vínculo explícito;
- pagamento, cliente e entrega já validados estruturalmente;
- exportação de cardápio já observada;
- ambiente seguro para provar o primeiro pipeline de fatos sem ativar efeitos empresariais.

Isso é uma vantagem de maturidade da integração, não uma afirmação de superioridade geral da API.

## 6. O que o iFood acrescenta

Com os módulos e escopos homologados, o iFood pode acrescentar:

- eventos de pedido padronizados;
- catálogo e promoções oficiais;
- detalhamento financeiro por pedido;
- eventos, ajustes, comissões e conciliação;
- repasses e antecipações;
- avaliações.

Essas fontes permitem avançar de faturamento bruto para margem de contribuição e fechamento
financeiro. Sem Financial Sales/Reconciliation, taxas e líquido serão marcados como incompletos.

## 7. Política de ativação

| Fonte/capacidade | Estado |
|---|---|
| Anota AI read-only | Permitida para homologação controlada |
| Persistência automática de pedidos Anota AI | Bloqueada até inbox e modelo canônico aprovados |
| Webhooks e mutações Anota AI | Bloqueados pelo Gate C/D da MISSÃO 009 |
| iFood público/documental | Permitido para desenho |
| iFood produtivo | Bloqueado até onboarding, escopos e homologação |
| Scraping do Portal | Proibido |
| Criação automática de produto/vínculo | Proibida |
| Alteração automática de preço/promoção | Proibida |
| IA alterando fatos ou ledger | Proibida |

## 8. Resultado do gate D3

O D3 fica concluído para o escopo de comparação baseado nas evidências atuais.

Permanecem pendentes:

1. respostas formais da Anota AI sobre scopes, rate limits, incremental, webhooks e
   `additionalFees`;
2. comprovação oficial de clientes, financeiro, estoque e relatórios além do pedido/cardápio;
3. payloads homologados do iFood;
4. tipagem adicional somente quando houver contrato ou amostra sanitizada.

Nenhuma dessas pendências bloqueia o desenho do modelo canônico mínimo. Todas bloqueiam ativação
produtiva da capacidade correspondente.

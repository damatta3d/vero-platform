# VERO Intelligence — matriz do Portal do Parceiro iFood

## Controle

| Campo | Valor |
|---|---|
| Estado | Discovery público |
| Branch | `agent/vero-intelligence-discovery` |
| Data da verificação | 2026-07-29 |
| Fontes | Conteúdo oficial iFood para parceiros e documentação oficial de APIs |
| Validação autenticada | Pendente em sessão autorizada do O Santo Parma |
| Scraping | Proibido como arquitetura principal |

Este inventário distingue o que o Portal exibe do que possui exportação ou API oficial comprovada.
Uma tela visível ao restaurante não autoriza coleta automatizada.

## Legenda

| Estado | Significado |
|---|---|
| Confirmado no Portal | Conteúdo oficial descreve a informação/tela |
| Exportação confirmada | Formato de arquivo descrito oficialmente |
| API correspondente | Há módulo oficial documentado que cobre o dado total ou parcialmente |
| NC | Exportação ou acesso programático público não comprovado |
| Validar | Deve ser conferido em sessão autorizada, sem automação de captura |

## Matriz de informações e relatórios

| Área | Informação/relatório | Finalidade | Portal | Exportação pública comprovada | API oficial correspondente | Atualização/janela pública | Decisão para a VERO |
|---|---|---|---|---|---|---|---|
| Pedidos | Relatório de Pedidos | Analisar pedidos e valores por loja/período | Confirmado | XLS | Order cobre operação/detalhe; Financial Sales cobre financeiro por pedido | Frequência e janela do XLS devem ser validadas | Importador versionado de XLS como backfill; API para incremental quando homologada |
| Pedidos | Histórico e detalhe de pedido | Operação e auditoria de cada pedido | Confirmado | NC | Order API | Eventos próximos do tempo real; janela histórica não presumida | Fonte operacional; persistir eventos e detalhes autorizados |
| Desempenho | Visão geral | Acompanhar resultados da loja | Confirmado | NC | Parcial: Order/Financial | Validar | Dashboard da VERO deve recalcular métricas a partir de fatos sempre que possível |
| Desempenho | Funil do cardápio/jornada | Entender descoberta, visita, navegação, sacola e pedido | Confirmado | NC | API pública específica não comprovada | Validar | Manter `Visit` e `Conversion` opcionais até fonte oficial comprovada |
| Desempenho | Produtos mais vendidos | Priorizar itens com maior saída | Confirmado por material oficial | NC | Derivável de Order | Conforme período selecionado; validar | Calcular na VERO por itens de pedido reconciliados |
| Desempenho | Produtos menos vendidos | Identificar baixa saída | Confirmado por material oficial | NC | Derivável de Order | Conforme período selecionado; validar | Calcular na VERO, distinguindo indisponibilidade e tempo em cardápio |
| Desempenho | Ticket médio | Medir valor médio dos pedidos | Confirmado | NC | Derivável de Order/Financial Sales | Validar | Fórmula VERO versionada; declarar base bruta ou líquida |
| Desempenho | Receita/vendas | Medir resultado comercial | Confirmado | Parcial via XLS de pedidos/conciliação | Financial Sales/Reconciliation | Conforme fonte | Preferir financeiro oficial para líquido; não misturar receita, repasse e faturamento |
| Desempenho | Visitas/visualizações | Medir alcance do cardápio/loja | Confirmado no funil | NC | API pública não comprovada | Validar | Não estimar a partir de pedidos |
| Desempenho | Conversão | Medir avanço no funil | Confirmado no funil | NC | API pública não comprovada | Validar | Persistir apenas com fonte/exportação oficial |
| Desempenho | Horários/dias | Identificar picos e ociosidade | Confirmado como análise derivável | NC | Derivável de Order | Conforme período | Calcular na VERO por timestamp, fuso e estado do pedido |
| Clientes | Novos e recorrentes/fidelização | Entender aquisição e retenção | Conteúdo do Portal deve ser validado | NC | Order pode trazer dados limitados; API pública de CRM não comprovada | Validar | Usar identificador pseudonimizado somente quando permitido; não inventar identidade estável |
| Avaliações | Nota e evolução | Acompanhar satisfação | Confirmado | NC | Reviews API v2 | Reviews aceita filtro por data; janela deve seguir API | Ingerir pela API homologada e minimizar texto/dados pessoais |
| Avaliações | Comentários e respostas | Diagnóstico qualitativo e relacionamento | Confirmado | NC | Reviews API cobre avaliações; capacidade de resposta deve ser confirmada por versão | Validar | Separar análise de sentimento de fato; resposta automática proibida |
| Cancelamentos | Motivos e ocorrências | Reduzir perda operacional | Confirmado em pedidos/operação | Parcial no pedido/relatório; validar XLS | Order/Events | Incremental por eventos | Modelar motivo da fonte, responsável e impacto financeiro separadamente |
| Operação | Tempo de preparo/entrega e SLA | Medir eficiência | Confirmado em áreas operacionais; campos exatos devem ser validados | NC | Order/Events/Shipping cobrem parcialmente | Próximo do tempo real por eventos | Derivar apenas de timestamps e marcos presentes |
| Promoções | Central de Crescimento | Gerenciar alavancas promocionais | Confirmado | NC | Promotion v2 cobre gestão de promoções de produto | Validar | Cadastro da promoção não equivale a performance |
| Promoções | Campanha Inteligente | Atrair clientes e incentivar recorrência | Confirmado | NC | API pública de analytics da campanha não comprovada | Validar | Custo e resultado entram somente por arquivo/API oficial ou lançamento comprovado |
| Promoções | Cupons | Configurar/acompanhar descontos | Confirmado | NC | Parcial: benefícios observados no Order/Financial; gestão pública ampla não comprovada | Validar | Registrar cupom observado sem presumir financiador |
| Promoções | Cashback | Acompanhar incentivo | Deve ser validado por produto/contrato | NC | API pública geral não comprovada | Validar | Entidade opcional e provider-specific até evidência |
| Promoções | ROI/impacto | Avaliar aumento de vendas e custo | Portal pode exibir indicadores por campanha; campos exatos devem ser validados | NC | API pública completa não comprovada | Validar | VERO calcula ROI apenas com custo, baseline, janela e venda atribuída rastreáveis |
| Financeiro | Relatório de conciliação | Comparar lançamentos iFood e loja | Confirmado | CSV pela Reconciliation API/fluxo oficial; formato do Portal deve ser validado | Financial Reconciliation | Arquivo mensal atualizado semanalmente | Fonte de fechamento; arquivo imutável, checksum e reprocessamento |
| Financeiro | Vendas por pedido | Explicar valores pagos, recebedores e componentes | Confirmado | Parcial via relatórios | Financial Sales | Próximo do tempo real, sujeito a homologação | Fonte preferencial por pedido para receita líquida e taxas |
| Financeiro | Repasses/liquidações | Conferir pagamentos ao parceiro | Confirmado | NC nesta pesquisa do Portal | Settlement API | Conforme calendário financeiro | Separar competência, previsão e liquidação |
| Financeiro | Antecipações | Conferir valores e datas antecipados | Conforme elegibilidade | NC | Anticipation API | Conforme plano D+1/D+7 documentado | Não atribuir automaticamente ao CMV/produto |
| Financeiro | Taxas e comissões | Explicar diferenças entre venda e repasse | Confirmado | Parcial em pedidos/conciliação | Financial Sales/Events/Reconciliation | Conforme fonte | Preservar natureza e financiador; não ratear sem regra explícita |
| Cardápio | Categorias, produtos, complementos e disponibilidade | Gerir oferta | Confirmado | NC | Catalog v2 | Estado atual; histórico não comprovado | Snapshots próprios e reconciliação com catálogo VERO |
| Cardápio | Conversão por produto | Avaliar eficiência de apresentação | Deve ser validado na tela autenticada | NC | API pública específica não comprovada | Validar | Não confundir participação em pedidos com conversão de visualização |
| Posicionamento | Ranking/benchmarking | Comparar desempenho/visibilidade | Conteúdos de orientação existem; indicador por loja deve ser validado | NC | API pública não comprovada | Validar | Não criar fato oficial por estimativa |

## Correspondência Portal × fonte sustentável

| Necessidade | Fonte sustentável preferencial | Fallback autorizado | Não permitido |
|---|---|---|---|
| Pedidos incrementais | Order + Events | XLS oficial importado manualmente | Captura de tela como pipeline |
| Catálogo atual | Catalog v2 | Exportação oficial futura | Scraping do editor |
| Financeiro por pedido | Financial Sales | XLS/CSV oficial | Inferir taxa por diferença sem classificação |
| Fechamento financeiro | Reconciliation | Arquivo oficial do Portal, se confirmado | Copiar números sem competência e procedência |
| Avaliações | Reviews v2 | Exportação oficial futura | Coleta automatizada da tela |
| Funil/visitas | API ou exportação oficial futura | Entrada manual estruturada e rotulada | Automação de navegador recorrente |
| Promoções/campanhas | Promotion para cadastro + fonte oficial de performance | Arquivo oficial/manual comprovado | Inferir ROI apenas por correlação temporal |
| Clientes/retorno | Fonte oficial com base legal | Métrica agregada sem identificação | Montar perfil pessoal a partir de dados desnecessários |

## Frequência e procedência

Cada ingestão deve registrar:

- `company_id`, estabelecimento VERO e conexão de origem;
- relatório/fonte e versão do schema;
- período solicitado e competência;
- instante de geração, obtenção e ingestão;
- hash do arquivo ou identificador do evento;
- timezone da loja;
- filtros aplicados no Portal;
- quantidade de linhas aceitas, rejeitadas e duplicadas;
- status de reconciliação;
- referência ao consentimento e à política de retenção.

Quando a frequência pública não estiver documentada, a coluna permanece `Validar`. A VERO não
transformará suposição operacional em SLA.

## Validação autenticada pendente

A sessão autorizada do Portal do O Santo Parma deve conferir, sem scraping e sem registrar
credenciais:

1. nomes atuais das abas e subabas;
2. filtros de loja e período;
3. quais telas exibem botão de exportação;
4. formato real de cada arquivo;
5. cabeçalhos e tipos de coluna;
6. janela histórica máxima;
7. latência de atualização;
8. diferença entre pedido, venda, receita, repasse e competência;
9. indicadores de promoção, cupom, cashback e financiador;
10. granularidade do funil, visitas e conversão;
11. dados pessoais presentes e possibilidade de minimização.

Essa validação produzirá amostras sanitizadas e dicionários de dados, nunca credenciais, cookies ou
uma rotina de navegação automatizada.

## Resultado do gate D2

Com evidência pública, a VERO pode planejar de forma sustentável:

- pedidos por API e XLS;
- catálogo por API;
- valores financeiros por pedido e conciliação por APIs/arquivos financeiros;
- avaliações por API;
- métricas derivadas de vendas, horários, produtos, cancelamentos e valores.

Permanecem bloqueados como fonte programática:

- funil, visitas e conversão;
- performance consolidada de campanhas;
- indicadores completos de clientes/recorrência;
- benchmarking/ranking;
- exportações adicionais não confirmadas.

Esses dados só entram no roadmap de implementação após API, webhook ou exportação oficial
comprovados.

## Fontes oficiais verificadas

- https://blog-parceiros.ifood.com.br/relatorio-de-pedidos/
- https://blog-parceiros.ifood.com.br/relatorio-de-conciliacao/
- https://blog-parceiros.ifood.com.br/tela-de-desempenho/
- https://blog-parceiros.ifood.com.br/portal-do-parceiro/
- https://blog-parceiros.ifood.com.br/central-de-crescimento/
- https://blog-parceiros.ifood.com.br/campanha-inteligente/
- https://blog-parceiros.ifood.com.br/como-fazer-promocao-no-ifood/
- https://blog-parceiros.ifood.com.br/wp-content/uploads/2022/03/Funil-de-vendas-no-iFood.pdf
- https://developer.ifood.com.br/docs/guides/modules/financial/api-sales
- https://developer.ifood.com.br/docs/guides/modules/financial/api-reconciliation
- https://developer.ifood.com.br/docs/guides/modules/review/endpoints/

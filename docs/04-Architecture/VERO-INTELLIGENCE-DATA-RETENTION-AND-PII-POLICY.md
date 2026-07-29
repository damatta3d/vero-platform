# VERO Intelligence — política inicial de retenção e PII

## Controle

| Campo | Valor |
|---|---|
| Estado | Approved — Gate C de governança de dados |
| Versão | 1.0.0 |
| Data | 2026-07-29 |
| Escopo | VERO Intelligence MVP e dados recebidos para fins analíticos |
| ADR relacionado | ADR-011 v1.0.0 — Approved |
| Implementação | Corte vertical read-only autorizado; ainda não iniciado |
| Autoridade de aprovação | Arquiteto-Chefe |
| Natureza | Política técnica inicial; não substitui validação jurídica, contrato ou registro de operações |

## 1. Decisão executiva

O VERO Intelligence adotará minimização por desenho. O fato analítico padrão não conterá nome,
telefone, e-mail, endereço, coordenadas, documento, dados de cartão, instruções livres ou qualquer
identificador direto de cliente.

Payloads de provider com PII serão transformados em memória. A persistência de payload bruto fica
desabilitada por padrão. Chaves externas necessárias à idempotência serão pseudonimizadas por
Tenant e conexão antes de entrar no business/intelligence.

Nenhum prazo é infinito. Todo dataset terá finalidade, owner, classificação, prazo, evento inicial,
ação terminal e evidência de expurgo registrados antes da ativação.

## 2. Princípios obrigatórios

1. **Finalidade e necessidade:** persistir apenas o campo indispensável à métrica aprovada.
2. **Separação de responsabilidades:** Integration Hub recebe e sanitiza; Intelligence persiste
   somente fatos provider-neutral.
3. **Pseudonimização não é anonimização:** tokens e hashes vinculáveis continuam protegidos como
   dados pessoais quando permitirem reidentificação indireta.
4. **Sem identidade global:** não existe chave de cliente compartilhada entre tenants.
5. **Imutabilidade com expiração:** append-only não significa retenção permanente; o expurgo elimina
   todas as revisões vencidas como uma unidade.
6. **Transparência e auditabilidade:** cada número informa fonte, período, fórmula, completude e
   política de retenção aplicável.
7. **Menor privilégio:** acesso operacional a dados de origem não concede acesso analítico.
8. **Legal hold explícito:** qualquer suspensão de expurgo exige motivo, owner, escopo e término.

## 3. Classificação de dados

| Classe | Exemplos | Regra do MVP |
|---|---|---|
| P0 — segredo | token OAuth, client secret, chave de criptografia | somente secret manager por referência; nunca em fato, log, documento ou fixture |
| P1 — PII direta | nome, telefone, endereço, coordenada, documento, e-mail | proibida no armazenamento analítico |
| P2 — PII pseudonimizada | chave HMAC de pedido/cliente, referência reversível | permitida apenas quando indispensável, tenant-scoped e com acesso restrito |
| B1 — dado comercial detalhado | item, quantidade, preço, desconto, horário, status | permitido com retenção definida e sem P1 |
| B2 — financeiro reconciliado | taxa, comissão, subsídio, repasse, competência | permitido somente de fonte oficial e com base de retenção registrada |
| A1 — agregado anônimo | total mensal por produto sem chave individual | retenção ampliada permitida após teste de não reidentificação |
| T1 — telemetria sanitizada | duração, contagens, códigos de erro controlados | sem IDs de pedido, telefone, endereço, token ou texto livre |

Dados pessoais sensíveis e dados de crianças não fazem parte da finalidade do MVP. Se forem
detectados, o registro é rejeitado ou sanitizado; não são promovidos a fato analítico.

## 4. Identificadores e pseudonimização

- externalOrderId no modelo lógico do Intelligence será persistido como chave HMAC determinística,
  usando chave versionada, escopo tenantId + connectionId e separação por domínio.
- O valor bruto só poderá existir no adapter durante a chamada e, quando indispensável a nova
  consulta ao provider, em referência operacional criptografada de acesso restrito no Integration
  Hub; nunca no fato analítico.
- Telefone, e-mail ou endereço não serão usados para gerar o token do pedido.
- Rotação de chave terá versão e procedimento de migração/reprocessamento auditado.
- Hash sem chave de telefone, e-mail ou documento é proibido por permitir ataques de dicionário.
- IDs de produto externos podem permanecer quando não identificarem pessoa natural e forem
  necessários à reconciliação de catálogo.

## 5. Matriz inicial de retenção

Os prazos abaixo são tetos técnicos iniciais. Prazo maior exige registro de finalidade, base
aplicável, aprovação de governança e teste automatizado atualizado.

| Dataset | Conteúdo permitido | Prazo inicial | Ação terminal |
|---|---|---:|---|
| Payload de provider em memória | payload necessário à transformação | duração da operação, máximo 15 minutos | descarte imediato |
| Quarentena excepcional de payload | payload criptografado para falha não reproduzível | desabilitada; quando autorizada, 24 horas, máximo 7 dias | exclusão criptográfica e física |
| ExternalMessageReceipt | metadados sanitizados, hash, status e correlação | 180 dias | exclusão; preservar apenas contagem agregada |
| Rejeições de importação | código de erro e linha sanitizada | 30 dias | exclusão |
| IngestionRun | janela, contagens, status, checksum e autoria | 180 dias | exclusão; preservar agregado operacional |
| IngestionCheckpoint | cursor técnico da conexão | enquanto a conexão estiver ativa + 30 dias | exclusão |
| Fatos de pedido detalhados | revisões, linhas, ajustes e chaves P2 | 24 meses | agregar quando elegível e excluir detalhe em até 30 dias |
| Fatos financeiros reconciliados | componentes B2 por competência | 60 meses somente quando habilitados e justificados pelo tenant | exclusão ou anonimização irreversível |
| MetricObservation detalhada | valor, fórmula, completude e referências | 24 meses | excluir referências detalhadas e manter agregado elegível |
| Agregados mensais A1 | produto/categoria/período sem chave individual | conta ativa + 24 meses | exclusão |
| Logs de acesso e auditoria sanitizados | ator, ação, dataset, resultado e correlação | 180 dias | exclusão |
| Backups | cópia criptografada dos datasets vigentes | janela móvel máxima de 35 dias | expiração automática |
| Evidência de expurgo | dataset, tenant, janela, contagens e resultado, sem IDs de origem | 60 meses | exclusão |

A retenção financeira de 60 meses não é ativada automaticamente pelo ADR-011. Ela depende de fonte
financeira oficial, finalidade documentada e validação aplicável ao papel da VERO e do tenant.

## 6. Expurgo e direitos do titular

O runtime deverá oferecer:

- registro versionado de políticas por dataset;
- job de expurgo idempotente e tenant-aware;
- modo dry-run com contagem e amostra somente de IDs internos;
- exclusão em lotes com limite e checkpoint;
- propagação do vencimento para materializações, caches, índices, arquivos e backups;
- trilha mínima da execução sem preservar o dado eliminado;
- mecanismo de busca por referência operacional autorizada para atender solicitação do titular;
- bloqueio, correção, portabilidade, anonimização ou exclusão conforme instrução válida do
  controlador e restrições aplicáveis;
- relatório de exceções, legal holds e falhas de propagação.

O dashboard não pode considerar expurgo como falha de completude. Métricas devem declarar a janela
histórica disponível.

## 7. Segurança e observabilidade

- criptografia em trânsito e em repouso;
- segredo por referência e rotação;
- autorização por Tenant, estabelecimento, dataset e finalidade;
- isolamento de banco testado com dois tenants e tentativa negativa;
- redaction antes de log, tracing, dead-letter e captura de erro;
- nenhum valor P1/P2 em labels de métricas;
- texto livre de provider não entra no MVP;
- exportações com expiração, autenticação e trilha de acesso;
- backup criptografado e restauração testada sem ressuscitar dados já vencidos além da janela;
- kill switch por conexão e dataset.

## 8. Registro de tratamento por dataset

Antes de ativar um dataset, o catálogo de governança deverá registrar:

- owner de negócio e owner técnico;
- controlador, operador e suboperadores aplicáveis;
- finalidade específica;
- categorias de dados e titulares;
- fonte, região e fluxo;
- base e obrigação aplicáveis, validadas fora do código;
- destinatários e compartilhamentos;
- prazo e evento de início;
- mecanismo de expurgo;
- riscos, controles e necessidade de RIPD;
- procedimento de incidente e contato responsável.

A arquitetura não escolherá uma base legal genérica para todos os tenants. Essa decisão depende da
finalidade, dos contratos e dos papéis efetivos de tratamento.

## 9. Primeiro dataset aprovado

A primeira fonte aprovada no Gate C é **Anota AI read-only**, limitada a pedidos já homologados.
O recorte inicial autorizado permite:

- Tenant, estabelecimento, conexão e provider;
- chave pseudonimizada do pedido;
- revisão, estado e timestamps de negócio;
- item/complemento, quantidade e valores;
- desconto e entrega observados;
- vínculo explícito com catálogo;
- qualidade, procedência e completude.

Ficam excluídos: cliente, telefone, endereço, coordenadas, observações livres, detalhes de cartão,
troco individualizável e payload bruto.

A aprovação autoriza somente o desenvolvimento do corte vertical read-only descrito nesta política.
Não autoriza ingestão produtiva, webhooks, mutações externas, venda automática, baixa de estoque ou
ações automáticas de IA.

## 10. Critérios de aceite do Gate C

- política aprovada e versionada;
- primeira fonte e escopos aprovados;
- catálogo de datasets criado;
- P1 ausente dos schemas analíticos;
- HMAC tenant-scoped definido e testável;
- prazos convertidos em testes de arquitetura e integração;
- expurgo dry-run, execução, retry e evidência definidos;
- restauração de backup respeita tombstones/vencimentos;
- solicitações de titular e legal hold possuem fluxo;
- incidentes e acessos ficam auditáveis sem PII;
- nenhuma mutação de provider, Sales ou Inventory;
- nenhuma ação automática de IA.

## 11. Limitações e validações pendentes

- confirmar contratualmente os papéis de controlador e operador por integração;
- validar os prazos legais/fiscais aplicáveis a cada oferta e tenant;
- definir provedor de chaves e estratégia de rotação;
- definir região de processamento, suboperadores e transferência internacional, se houver;
- executar RIPD quando a avaliação de risco indicar alto risco;
- obter respostas da Anota AI sobre retenção, escopos, incremental, webhooks e campos adicionais.

Essas pendências impedem ativação produtiva do dataset correspondente. Não invalidam a aprovação
técnica desta política nem a autorização para desenvolver e testar o corte read-only fora de
produção.

## 12. Histórico

| Versão | Data | Alteração | Estado |
|---|---|---|---|
| 0.1.0 | 2026-07-29 | Política inicial submetida ao Gate C | Proposed |
| 1.0.0 | 2026-07-29 | Política, primeira fonte e recorte read-only aprovados formalmente | Approved |

## 13. Referências oficiais

- Lei Geral de Proteção de Dados Pessoais — Lei nº 13.709/2018:
  https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm
- ANPD — Relatório de Impacto à Proteção de Dados Pessoais:
  https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/relatorio-de-impacto-a-protecao-de-dados-pessoais-ripd
- ANPD — Guia orientativo sobre segurança da informação:
  https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-sobre-seguranca-da-informacao-para-agentes-de-tratamento-de-pequeno-porte
- ANPD — Comunicação de incidente de segurança:
  https://www.gov.br/anpd/pt-br/assuntos/comunicacao-de-incidentes-de-seguranca-cis
- ANPD — Resolução CD/ANPD nº 2/2022:
  https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022

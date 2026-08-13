# MISSÃO 012 — VERO Commerce

## Objetivo

Entregar o canal próprio de pedidos da VERO Platform, iniciando pelo Santo Parma como tenant piloto, sem criar um sistema paralelo e reutilizando Catalog, Sales, Integration Hub e o contrato canônico de pedidos.

## Princípios

- provider-neutral e multi-tenant;
- VERO continua operacional sem iFood ou Anota AI;
- catálogo interno é a fonte canônica; importações externas são adaptadores;
- valores monetários em centavos;
- idempotência obrigatória no checkout e intake;
- efeitos em venda, estoque e financeiro somente após confirmação operacional definida;
- nenhuma credencial ou regra específica do Santo Parma no domínio compartilhado;
- interface pública mobile-first/PWA e painel operacional responsivo.

## Escopo MVP

### VERO Menu
- cardápio público por tenant/estabelecimento;
- categorias ordenadas;
- produtos, fotos, descrições, preços e disponibilidade;
- grupos de adicionais/opções;
- destaques e busca simples;
- horários de funcionamento.

### VERO Cart
- carrinho persistente no cliente;
- quantidade, adicionais e observações;
- cálculo determinístico de subtotal e total;
- validação de disponibilidade/preço no servidor antes da criação do pedido.

### VERO Checkout
- identificação mínima do cliente;
- entrega ou retirada;
- endereço e referência quando aplicável;
- taxa de entrega configurável;
- pagamento online e pagamento na entrega por contratos desacoplados;
- criação idempotente de pedido `VERO_NATIVE`.

### VERO Orders / Manager
- reutilizar o contrato canônico e a fila operacional da Issue #40 / PR #41;
- estados: recebido, confirmado, em preparo, pronto, saiu para entrega, concluído e cancelado;
- filtros, detalhe, origem, pagamento e ações operacionais;
- histórico de transições e auditoria.

### VERO Kitchen
- ticket de produção independente do layout administrativo;
- fila de impressão idempotente;
- preparar porta para Print Agent local e impressora térmica;
- falha de impressão não pode duplicar pedido.

### Integrações
- Anota AI e iFood continuam conectores opcionais;
- importar/mapeiar catálogo externo sem torná-lo fonte de verdade;
- pedidos externos e VERO Native convergem para o mesmo Order Intake.

## Fora do escopo do primeiro corte

- PDV fiscal completo;
- estoque avançado novo (reutilizar o existente);
- app de entregador;
- programa de fidelidade/cashback;
- CRM avançado;
- chatbot/WhatsApp automatizado;
- conciliação bancária;
- replicação integral das funcionalidades do Anota AI.

## Sequência de entrega

1. Consolidar PRs pendentes que são pré-requisitos, mantendo CI e Docker verdes.
2. Integrar o External Order Inbox em baseline atualizada.
3. Expor leitura pública segura do catálogo por tenant/estabelecimento.
4. Implementar Menu + Cart.
5. Implementar Checkout e `VERO_NATIVE` no Order Intake.
6. Implementar pagamento por porta/adaptador e webhook idempotente.
7. Implementar ticket e fila de impressão.
8. Homologar ponta a ponta no Santo Parma.

## Primeiro marco operacional

No celular, o cliente deve conseguir abrir um link público do Santo Parma, navegar por categorias, selecionar produto e adicionais, montar carrinho, escolher entrega/retirada e finalizar um pedido. O pedido deve aparecer uma única vez na fila operacional da VERO, identificado como `VERO_NATIVE`, pronto para confirmação pelo restaurante.

## Gates

- `pnpm prisma:generate`;
- `pnpm prisma:validate`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test`;
- `pnpm test:integration`;
- `pnpm build`;
- Docker aprovado;
- isolamento entre tenants comprovado;
- idempotência de checkout/intake comprovada;
- nenhum segredo versionado;
- fluxo mobile homologado no tenant Santo Parma.

## Rastreabilidade

Relaciona-se a:

- Issue #40 — MVP de pedidos externos/multicanal;
- PR #41 — provider-neutral external order inbox;
- PR #44 — estabilização do catálogo operacional;
- MISSÃO 008 — MVP Santo Parma;
- MISSÃO 009 — Connector Anota AI;
- Canonical Domain Model e ADRs vigentes.

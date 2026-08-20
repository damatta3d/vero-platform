# Santo Parma RC1 — Relatório de Homologação

Data: 2026-08-14

Status: **RC1 — NO-GO**

O código foi endurecido e os gates independentes de infraestrutura passaram. A classificação permanece NO-GO porque o ambiente desta execução não possui Docker, navegador controlável, PostgreSQL, Redis ou RabbitMQ. Portanto, não foi possível comprovar os gates manuais nem a integração completa exigida para GO.

## Identificação

1. HEAD inicial da `main`: `6b84972c9dd4bbf76d0d7d1caab65151f239e8c9`.
2. Branch: `release/santo-parma-rc1`.
3. PR Draft: `#58` — `fix(release): harden Santo Parma RC1`.
4. Commits remotos: `537a423` (código) e `7fb273b` (relatório inicial).
5. Ambiente: API compilada executada localmente; dependências externas ausentes; nenhuma publicação para clientes.

## Plataforma

6. Health live: **PASS**, HTTP 200.
7. Health ready: **BLOCKED**, HTTP 503 estruturado com PostgreSQL, Redis e RabbitMQ `down` quando habilitados.
8. PostgreSQL: **BLOCKED**, serviço indisponível em `localhost:5432`.
9. Redis: **BLOCKED**, serviço indisponível em `localhost:6379`.
10. RabbitMQ: **BLOCKED**, serviço indisponível em `localhost:5672`.

## Produto

11. Desktop: **NOT EXECUTED**, navegador visual não disponível nesta sessão.
12. Mobile: **NOT EXECUTED**, navegador visual não disponível nesta sessão.
13. Carrinho: regressões automatizadas aprovadas para adicionar, aumentar, diminuir, remover, observar, totalizar e persistir; homologação visual pendente.
14. Checkout: falha P0 corrigida — a validação não é mais chamada sem cliente; fluxo RC restrito com segurança a retirada.
15. PAY_ON_DELIVERY: contrato e regressões unitárias aprovados; execução completa bloqueada pelo banco ausente.
16. PIX: **NOT EXECUTED — REQUIRES SANDBOX**; removido das opções do RC público para impedir cobrança externa acidental.
17. Pedido VERO_NATIVE: cobertura existente preservada; execução completa bloqueada pelo banco ausente.
18. Operação: Manager agora é servido pela API/imagem e possui entrada de chave e tenant; operação real bloqueada pelo banco e navegador ausentes.
19. Transições: cobertura existente `RECEIVED -> CONFIRMED -> PREPARING -> READY` preservada; execução prática pendente.
20. Tracking: página de cliente adicionada com polling e mensagem genérica para token inválido; execução com pedido real pendente.
21. Ticket: Manager mostra id amigável, horário, cliente, retirada/entrega, itens, quantidades, observações, total, pagamento e histórico; impressão física permanece fora do escopo.
22. Segurança/tenant: preços continuam calculados no servidor; Manager usa endpoints protegidos; CSP corrigida e restrita por rota; isolamento E2E depende do banco e ficou bloqueado.

## Bugs e dívidas

23. Bugs encontrados:
    - P0: menu chamava checkout sem os dados obrigatórios do cliente;
    - P0: CSP bloqueava o JavaScript inline do menu e do tracking;
    - P1: carrinho não permitia reduzir, remover nem incluir observação;
    - P1: Manager compilado não era servido pela API/Docker;
    - P1: Manager não possuía fluxo utilizável de chave e tenant;
    - P1: link de acompanhamento abria JSON cru, sem tela de cliente;
    - P1: readiness convertia indisponibilidade de dependência em HTTP 500;
    - P2: ticket não exibia horário.
24. Bugs corrigidos: todos os itens listados acima.
25. Dívidas restantes:
    - homologação visual desktop/mobile/tablet;
    - persistência completa de endereço antes de liberar entrega;
    - PIX somente com credenciais explícitas de sandbox;
    - integração com impressora em missão posterior;
    - repetir toda a homologação com a stack obrigatória disponível.

## Gates

26. Testes: formato, lint da API, lint/sintaxe do Manager, tipagem, 17 projetos de testes, arquitetura e 18 builds passaram. API: 8 suítes e 37 testes aprovados.
27. CI: baseline `main` confirmado — CI #368, run `31841549442`, sucesso. CI da branch deve ser registrado após o PR.
28. Docker: **BLOCKED**, executável `docker` não está instalado nesta sessão; Dockerfile atualizado para compilar API e Manager juntos.
29. Evidências principais:
    - `/health/live`: 200;
    - `/health/ready`: 503 com `postgres`, `redis` e `rabbitmq` `down`;
    - `/manager`, `/manager/styles.css`, `/manager/main.js`: 200;
    - `/menu/:slug`: 200 com CSP pública restrita à rota;
    - `/pedido/:orderId`: 200;
    - `prisma generate`: PASS;
    - `prisma validate`: PASS;
    - `prisma migrate deploy`: BLOCKED pela ausência do PostgreSQL;
    - `test:integration`: BLOCKED pela ausência das três dependências.
30. Status final: **RC1 — NO-GO**.

## Próxima ação obrigatória

Reexecutar o runbook em um Work com Docker e navegador controlável disponíveis. Somente após PostgreSQL, Redis, RabbitMQ, integration, Docker e todos os gates manuais desktop/mobile ficarem verdes o RC1 poderá ser reclassificado como GO. Não iniciar impressão física antes disso.

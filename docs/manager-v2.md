# VERO Manager v2

## Objetivo

Evoluir o MVP operacional do Manager para o shell administrativo do restaurante sem regressão do board de pedidos já validado.

## Incrementos

1. Shell responsivo e navegação principal.
2. Dashboard operacional derivado da fila ativa.
3. Pedidos preservando workflow canônico e polling incremental.
4. Gestão de cardápio conectada ao catálogo existente.
5. Configurações do estabelecimento e operação.
6. Autenticação e contexto de estabelecimento adequados para uso administrativo.

## Critérios de fechamento

- isolamento multi-tenant preservado;
- nenhuma regra de negócio crítica confiada ao navegador;
- UI não inventa transições de pedido;
- conteúdo dinâmico tratado antes de renderização HTML;
- build do Manager integrado ao Nx;
- `pnpm verify` verde;
- testes de integração verdes;
- Docker verde quando aplicável;
- PR auditado e mergeável.

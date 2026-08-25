# VERO Platform — Deploy em VPS Hostinger

## Objetivo

Publicar e atualizar a VERO Platform em VPS com Docker, PostgreSQL persistente e Caddy, mantendo validações de release para banco, pagamentos, entrega e aplicação.

## Fluxo de deploy

O deploy oficial usa `infrastructure/hostinger/deploy.sh`. O script preserva a configuração local de produção, valida o Docker Compose, faz backup do PostgreSQL quando aplicável, constrói a API, aplica migrations, executa preflight das integrações e roda o smoke test antes de considerar a publicação concluída.

A árvore Git deve permanecer limpa. Configurações específicas do servidor devem ficar em `.env.production`, nunca em alterações locais de arquivos versionados.

## Endereço público

O endereço servido pelo Caddy é configurado por:

```text
VERO_PUBLIC_SITE=:80
```

Quando a variável estiver ausente, o Compose mantém compatibilidade usando `:80`.

Para homologação por IP, mantenha `:80`. Para domínio com HTTPS automático do Caddy, configure apenas o hostname no ambiente de produção, por exemplo:

```text
VERO_PUBLIC_SITE=api.veroplatform.cloud
```

O `Caddyfile` é versionado e não deve ser editado diretamente na VPS. Dessa forma, habilitar domínio/HTTPS não deixa a árvore Git suja nem bloqueia o próximo `git pull --ff-only`.

O Caddy também mantém `http://127.0.0.1` para health checks e smoke tests executados dentro da VPS. Assim, a validação local do deploy não depende de resolução DNS externa.

Antes de habilitar o domínio, confirme que o DNS aponta para a VPS e que as portas 80 e 443 estão liberadas. O webhook do Mercado Pago deve usar o mesmo domínio HTTPS público.

## Mercado Pago / PIX

A release reconhece:

```text
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_WEBHOOK_SECRET=
MERCADO_PAGO_PAYER_EMAIL=
```

Configuração parcial é bloqueada. Se PIX estiver habilitado nas configurações persistidas da loja, o preflight exige que a integração esteja completamente configurada antes de publicar a nova API.

## Google Maps / entrega por rota

A release reconhece:

```text
VERO_MAPS_PROVIDER=GOOGLE
GOOGLE_MAPS_API_KEY=
```

Entrega por rota exige provider suportado, chave configurada e endereço de origem suficiente. O preflight cruza essas condições com a configuração persistida da loja antes do `compose up` final.

## Smoke test

`infrastructure/hostinger/smoke-test.sh` é side-effect free. Ele valida saúde, Manager, cardápio público, módulos operacionais, RBAC de entregas, rotas de pagamento e webhook sem criar pedido, iniciar cobrança PIX ou chamar Google Maps com uma cotação válida.

Por padrão, o smoke usa `VERO_MVP_TENANT_ID` como slug público. Um slug diferente pode ser configurado por `VERO_SMOKE_MENU_SLUG` apenas no ambiente do servidor.

## Segurança e recuperação

- `.env.production` permanece fora do Git e deve ter acesso restrito;
- PostgreSQL e API não publicam suas portas diretamente no host;
- somente o Caddy publica as portas web;
- backups pré-deploy ficam em `.runtime/backups`;
- não registre credenciais reais em documentação, issues, PRs ou commits;
- nunca remova volumes persistentes durante uma atualização normal.

A restauração de backup deve ser feita de forma controlada, com a API parada e o arquivo de backup previamente conferido.

# VERO Platform — Deploy em VPS Hostinger

## Objetivo

Publicar e atualizar a VERO Platform em VPS com Docker, PostgreSQL persistente e Caddy, mantendo validações de release para banco, pagamentos, entrega, DNS/HTTPS e aplicação.

## Fluxo de deploy

O deploy oficial usa `infrastructure/hostinger/deploy.sh`. O script preserva a configuração local de produção, valida o Docker Compose, faz backup do PostgreSQL quando aplicável, constrói a API, aplica migrations, executa preflight das integrações e roda os smoke tests antes de considerar a publicação concluída.

A árvore Git deve permanecer limpa. Configurações específicas do servidor devem ficar em `.env.production`, nunca em alterações locais de arquivos versionados.

## Automação de acesso à VPS

O workflow `.github/workflows/deploy-production.yml` automatiza apenas o transporte SSH até a VPS e sempre reutiliza `infrastructure/hostinger/deploy.sh` no servidor. Ele não substitui o backup, migrations, preflight ou smoke test do script oficial.

O workflow pode ser executado manualmente ou por atualização da branch `deploy/production`. Em ambos os casos, ele bloqueia qualquer SHA que não seja exatamente o HEAD atual de `main`.

Antes do primeiro uso, configure estes GitHub Actions Secrets no repositório:

```text
VERO_VPS_HOST
VERO_VPS_USER
VERO_VPS_SSH_KEY
VERO_VPS_HOST_FINGERPRINT
```

`VERO_VPS_SSH_KEY` deve ser uma chave privada dedicada ao deploy, sem ser versionada. `VERO_VPS_HOST_FINGERPRINT` deve conter a fingerprint SHA256 da chave pública SSH do servidor, no formato `SHA256:...`, para impedir conexão com host não autenticado.

O workflow usa a porta SSH 22 e o diretório de aplicação `/opt/vero/platform`. O usuário configurado deve conseguir atualizar o repositório e executar Docker Compose sem interação. O segredo `.env.production` continua existindo somente dentro da VPS.

A action SSH externa é fixada por SHA de commit, evitando que uma tag mutável altere o código executado durante um deploy.

## Endereço público

`VERO_PUBLIC_SITE` é obrigatório no ambiente de produção. Use explicitamente:

```text
VERO_PUBLIC_SITE=:80
```

para homologação HTTP por IP, ou apenas o hostname para produção com HTTPS automático do Caddy, por exemplo:

```text
VERO_PUBLIC_SITE=api.veroplatform.cloud
```

Não inclua protocolo, porta ou caminho quando usar hostname. O preflight valida o formato e exige que o hostname resolva no DNS antes de iniciar a atualização.

O `Caddyfile` é versionado e não deve ser editado diretamente na VPS. O Caddy também mantém `http://127.0.0.1` para health checks e smoke tests locais.

Quando um hostname é configurado, o deploy somente termina depois que `https://<hostname>/health/ready` estiver acessível com TLS válido. Assim, DNS/certificado/proxy público fazem parte do gate de release e não apenas os checks locais.

## Mercado Pago / PIX

A release reconhece:

```text
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_WEBHOOK_SECRET=
MERCADO_PAGO_PAYER_EMAIL=
```

Configuração parcial é bloqueada. Se PIX estiver habilitado nas configurações persistidas da loja, o preflight exige configuração completa e realiza uma consulta autenticada e sem efeito colateral na Orders API do Mercado Pago. Respostas de autorização `401` ou `403`, falha de rede ou resposta inesperada bloqueiam a publicação antes do `compose up` final.

O token nunca é impresso pelo script. O webhook do Mercado Pago deve usar o mesmo domínio HTTPS público configurado em `VERO_PUBLIC_SITE`.

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
- o token Mercado Pago e demais segredos não são impressos pelo preflight;
- credenciais SSH ficam somente em GitHub Actions Secrets;
- o workflow valida fingerprint do host SSH antes de executar comandos;
- não registre credenciais reais em documentação, issues, PRs ou commits;
- nunca remova volumes persistentes durante uma atualização normal.

A restauração de backup deve ser feita de forma controlada, com a API parada e o arquivo de backup previamente conferido.

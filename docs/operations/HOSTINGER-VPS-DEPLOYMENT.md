# VERO Platform — Deploy automatizado em VPS Hostinger

## Objetivo

Publicar e atualizar a VERO Platform em um VPS Ubuntu 24.04 com Docker, PostgreSQL persistente e Caddy como proxy reverso, bloqueando configurações parciais que fariam PIX ou entrega por rota falharem somente em tempo de uso.

## Pré-requisitos

- Docker Engine e Docker Compose instalados;
- portas 80 e 443 liberadas no firewall;
- repositório clonado em `/opt/vero/platform`;
- usuário executor pertencente ao grupo `docker` ou execução via `sudo`;
- `git`, `curl`, `openssl` e `gzip` instalados.

## Primeiro deploy e atualizações

No servidor:

```bash
cd /opt/vero/platform
git pull --ff-only
sudo bash infrastructure/hostinger/deploy.sh
```

O script:

1. atualiza a branch atual por fast-forward;
2. preserva um `.env.production` existente ou cria uma base segura com credenciais locais aleatórias no primeiro deploy;
3. valida as variáveis obrigatórias e a consistência das integrações opcionais;
4. valida o Docker Compose;
5. gera backup do PostgreSQL antes da atualização, quando o banco já está em execução;
6. inicia e valida o PostgreSQL;
7. constrói a imagem da API;
8. aplica as migrations antes de publicar a nova API;
9. valida pré-requisitos de PIX e entrega por rota contra a configuração persistida da loja;
10. publica API e Caddy;
11. testa saúde, Manager, cardápio público, RBAC, pagamentos, webhook, entregas e módulos legados sem criar pedidos nem cobrar pagamentos;
12. mostra o estado final dos containers e as URLs públicas.

## Variáveis de produção

O `.env.production` é local ao servidor, recebe permissão `600` e nunca deve ser versionado.

Além das variáveis centrais de banco e autenticação MVP, a release atual reconhece:

```text
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_WEBHOOK_SECRET=
MERCADO_PAGO_PAYER_EMAIL=
VERO_MAPS_PROVIDER=GOOGLE
GOOGLE_MAPS_API_KEY=
```

### Mercado Pago / PIX

O PIX pode permanecer indisponível deixando as três variáveis do Mercado Pago vazias **desde que `pixEnabled` esteja desligado nas configurações da loja**. Se `pixEnabled` estiver ligado, o deploy exige configuração completa e interrompe a publicação antes de substituir a API em execução.

Quando a integração for usada, as três variáveis devem estar preenchidas em conjunto:

- `MERCADO_PAGO_ACCESS_TOKEN` — credencial server-to-server da aplicação;
- `MERCADO_PAGO_WEBHOOK_SECRET` — segredo usado para validar `x-signature`;
- `MERCADO_PAGO_PAYER_EMAIL` — e-mail técnico de fallback quando o cliente não informar e-mail.

Configuração parcial é bloqueada pelo preflight, e o e-mail técnico também é validado. O script nunca imprime os valores desses segredos.

O webhook deve ser configurado no aplicativo do Mercado Pago apontando para o host público da VERO:

```text
https://SEU-DOMINIO/v1/payments/webhooks/mercado-pago
```

A URL do webhook não é enviada no corpo da Orders API.

### Google Maps / entrega por rota

O único provider suportado atualmente é:

```text
VERO_MAPS_PROVIDER=GOOGLE
```

`GOOGLE_MAPS_API_KEY` pode permanecer vazio enquanto a operação usar somente o frete legado sem raio/faixas por distância. Antes de habilitar preço por rota — por raio, faixas de distância ou configuração explícita do Google Maps — é obrigatório:

- preencher `GOOGLE_MAPS_API_KEY`;
- manter `VERO_MAPS_PROVIDER=GOOGLE`;
- configurar endereço, cidade e UF da loja no VERO Manager.

Após as migrations, o deploy lê a configuração persistida de `VERO_MVP_TENANT_ID`. Se entrega por rota estiver habilitada sem esses pré-requisitos, a publicação da nova API é interrompida antes do `compose up` final.

## Smoke test de produção

`infrastructure/hostinger/smoke-test.sh` é side-effect free. Ele não cria pedido, não inicia um PIX real e não consulta Google Maps. A varredura comprova que os principais contratos estão registrados e protegidos:

- `/`, `/inicio`, `/mvp`, `/operacao` e `/financeiro`;
- `/manager`, `/manager/styles.css` e `/manager/main.js`;
- `/menu/:slug` e `/v1/menu/:slug`;
- `/health/live` e `/health/ready`;
- endpoints financeiros autenticados;
- configuração, entregadores e central de entregas com RBAC;
- `POST /v1/payments` com payload inválido retorna `400` antes de qualquer chamada ao provedor;
- `POST /v1/checkout/delivery-quote` com payload inválido retorna `400` antes de qualquer chamada de mapas;
- webhook Mercado Pago sem assinatura retorna `401` antes de consultar o provedor.

Por padrão, o smoke usa `VERO_MVP_TENANT_ID` como slug do cardápio. Se o slug público for diferente, defina apenas no ambiente do servidor:

```text
VERO_SMOKE_MENU_SLUG=slug-publico-do-cardapio
```

## Segurança

- `.env.production` permanece fora do Git e recebe permissão `600`;
- PostgreSQL não publica a porta 5432 no host;
- API não publica a porta 3000 no host;
- somente o Caddy publica 80 e 443;
- backups locais ficam em `.runtime/backups`, também ignorado pelo Git;
- o script nunca imprime senha do banco, chave MVP, token Mercado Pago, segredo de webhook ou chave Google Maps;
- não use valores reais de segredos em documentação, issues, PRs ou commits.

## Consultar a chave do MVP

Somente dentro do servidor e sem compartilhar em capturas públicas:

```bash
grep '^VERO_MVP_API_KEY=' .env.production
```

## Diagnóstico

```bash
docker compose \
  --env-file .env.production \
  -f infrastructure/hostinger/docker-compose.production.yml \
  ps
```

```bash
docker compose \
  --env-file .env.production \
  -f infrastructure/hostinger/docker-compose.production.yml \
  logs --tail=150 api
```

## Domínio e HTTPS

O `Caddyfile` inicial atende por HTTP na porta 80 para homologação por IP. Antes do uso comercial, substitua o endereço `:80` por um domínio apontado ao VPS. O Caddy então poderá emitir e renovar HTTPS automaticamente.

Exemplo:

```caddy
vero.exemplo.com {
    encode zstd gzip
    reverse_proxy api:3000
}
```

Depois da alteração, execute novamente o script de deploy e configure o webhook Mercado Pago com o mesmo domínio HTTPS.

## Recuperação

Os backups pré-deploy ficam em:

```text
.runtime/backups/
```

A restauração deve ser feita de forma controlada, após parar a API e confirmar o arquivo correto. Nunca execute `docker compose down -v` em produção, pois a opção `-v` remove os volumes persistentes.

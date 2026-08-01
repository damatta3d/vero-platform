# VERO Platform — Deploy automatizado em VPS Hostinger

## Objetivo

Publicar e atualizar a VERO Platform em um VPS Ubuntu 24.04 com Docker, PostgreSQL persistente e Caddy como proxy reverso.

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

1. atualiza a branch por fast-forward;
2. preserva um `.env.production` existente ou cria credenciais aleatórias no primeiro deploy;
3. valida todas as variáveis obrigatórias;
4. valida o Docker Compose;
5. gera backup do PostgreSQL antes de atualizar, quando o banco já está em execução;
6. constrói e sobe PostgreSQL, API e Caddy;
7. aplica as migrations pelo processo de inicialização da API;
8. testa `/health/live`, `/health/ready`, `/operacao` e `/financeiro`;
9. mostra o estado final dos containers e as URLs públicas.

## Segurança

- `.env.production` permanece fora do Git e recebe permissão `600`;
- PostgreSQL não publica a porta 5432 no host;
- API não publica a porta 3000 no host;
- somente o Caddy publica 80 e 443;
- backups locais ficam em `.runtime/backups`, também ignorado pelo Git;
- o script nunca imprime a senha do banco nem a chave do MVP.

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

O `Caddyfile` inicial atende por HTTP na porta 80 para homologação por IP. Antes do uso comercial, substituir o endereço `:80` por um domínio apontado ao VPS. O Caddy então poderá emitir e renovar HTTPS automaticamente.

Exemplo:

```caddy
vero.exemplo.com {
    encode zstd gzip
    reverse_proxy api:3000
}
```

Depois da alteração, executar novamente o script de deploy.

## Recuperação

Os backups pré-deploy ficam em:

```text
.runtime/backups/
```

A restauração deve ser feita de forma controlada, após parar a API e confirmar o arquivo correto. Nunca executar `docker compose down -v` em produção, pois a opção `-v` remove os volumes persistentes.

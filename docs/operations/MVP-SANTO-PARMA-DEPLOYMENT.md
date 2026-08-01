# MVP Santo Parma — Implantação

## Objetivo

Publicar a API da VERO e a tela `/operacao` em ambiente HTTPS com PostgreSQL persistente, sem versionar segredos.

## Plataforma de referência

O repositório inclui `render.yaml` para criação de:

- serviço web Docker;
- banco PostgreSQL persistente;
- health check em `/health`;
- variáveis públicas de produção;
- geração automática da chave `VERO_MVP_API_KEY`.

A implantação permanece portável para outro provedor compatível com Docker e PostgreSQL.

## Variáveis obrigatórias

| Variável | Finalidade |
|---|---|
| `VERO_ENVIRONMENT=production` | Ativa o perfil de produção. |
| `VERO_HTTP_HOST=0.0.0.0` | Permite acesso pelo proxy do provedor. |
| `VERO_HTTP_PORT=3000` | Porta interna do contêiner. |
| `VERO_POSTGRES_ENABLED=true` | Habilita persistência PostgreSQL. |
| `VERO_DATABASE_URL` | URL privada do banco. |
| `VERO_MVP_ENABLED=true` | Habilita o MVP operacional. |
| `VERO_MVP_API_KEY` | Segredo Bearer com no mínimo 24 caracteres. |
| `VERO_MVP_TENANT_ID=santo-parma` | Tenant operacional inicial. |

Redis, RabbitMQ e OpenTelemetry ficam desabilitados neste MVP para reduzir custo e superfície operacional.

## Processo de inicialização

O contêiner:

1. instala dependências de forma determinística;
2. gera o Prisma Client;
3. compila a API;
4. aplica `prisma migrate deploy`;
5. inicia `dist/apps/api/main.cjs`.

## Validação pós-implantação

1. Abrir `/health` e confirmar resposta HTTP 200.
2. Abrir `/operacao` no computador e no celular.
3. Informar a chave de acesso gerada pelo provedor.
4. Manter `santo-parma` como empresa.
5. Criar um lançamento de teste.
6. Editar o lançamento.
7. Confirmar atualização da listagem e do resumo.
8. Reiniciar o serviço e confirmar que o lançamento permanece no banco.

## Segurança mínima

- nunca registrar `VERO_MVP_API_KEY` no GitHub;
- nunca registrar `VERO_DATABASE_URL` no GitHub;
- usar exclusivamente HTTPS público do provedor;
- limitar o compartilhamento da chave do MVP;
- rotacionar a chave em caso de exposição;
- manter `autoDeploy: false` até a validação operacional inicial.

## Rollback

1. Selecionar no provedor a imagem/deploy anterior que estava saudável.
2. Não executar rollback destrutivo de migration automaticamente.
3. Preservar o banco e restaurar backup apenas se houver corrupção confirmada.
4. Validar `/health` e `/operacao` após o rollback.

## Backup

O banco deve usar o mecanismo de backup do provedor. Antes de alterações de schema em produção, confirmar a existência de backup recuperável.

## Critério de liberação

A implantação só é considerada concluída após:

- `/health` disponível por HTTPS;
- `/operacao` acessível por computador e celular;
- criação e edição validadas;
- persistência confirmada após reinício;
- segredos ausentes do repositório;
- CI aprovado na branch de implantação.

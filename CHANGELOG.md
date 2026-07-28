# Changelog

Todas as alterações relevantes da VERO Platform serão registradas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Added

- M008-C com venda nativa idempotente, snapshot da ficha e custos, baixa automática de estoque, CMV realizado e margem.
- Histórico imutável de vendas e custos por insumo, persistido na mesma transação serializável do ledger.
- API e painel responsivo para registrar vendas e consultar faturamento, CMV e margem realizados.
- Testes de domínio e integração para rendimento, estoque insuficiente, idempotência, isolamento e imutabilidade.
- M008-B com entradas de compra, consumo, ajustes, ledger imutável, posição de estoque e custo médio móvel.
- Persistência transacional serializável de estoque com relações compostas por Tenant e proteção do ledger contra alteração ou exclusão.
- API e interface responsiva para registrar compras e movimentações e consultar saldos.
- Testes de domínio e integração para estoque negativo, custo histórico, imutabilidade e isolamento entre Tenants.
- M008-A com catálogo tenant-aware de insumos e produtos, ficha técnica versionada e cálculo determinístico de custo e margem.
- Persistência Prisma/PostgreSQL do catálogo com relações compostas por Tenant e migration validada.
- API MVP protegida por chave, identidade verificada, Tenant resolvido e autorização de uso único.
- Interface web responsiva para cadastrar insumos, produtos, fichas técnicas e consultar custos.
- Testes de domínio, aplicação, segurança e integração de persistência do catálogo.
- ADR-009 proposto para a Fundação de Access e autorização contextual.
- ADR-009 v0.1.1 com promoção interna, namespaces de ação/recurso e ciclo antirreplay.
- Controle e backlog da MISSÃO 007, com implementação bloqueada até aprovação arquitetural.
- ADR-009 v1.0.0 aprovado e Fundação mínima de Access implementada.
- Proteção de `ResolvedTenantContext` contra identificadores e contextos forjados.
- Backlog vertical do MVP Santo Parma para catálogo, ficha técnica, estoque e CMV.
- Relatório técnico da MISSÃO 007 com 54 testes e build dos 11 projetos aprovados localmente.

- ADR-008 proposto para a Fundação de Identity e autenticação.
- ADR-008 v0.1.1 com capability interna de promoção, sujeito qualificado por autoridade e ciclo seguro da evidência.
- ADR-008 v1.0.0 aprovado e Fundação de Identity implementada com API pública protegida, contratos e testes de segurança.
- Controle e backlog da MISSÃO 006, com implementação bloqueada até aprovação arquitetural.

- Fundação de Tenancy com `TenantId` opaco, candidato não confiável, contexto resolvido explícito, porta de resolução e erros semânticos.
- Testes unitários, de superfície e contratos de compilação do `core-tenancy`, com cobertura integral.
- ADR-007 proposto para identidade opaca, resolução confiável e contexto explícito de Tenant.
- Controle da MISSÃO 005 — Core Platform: Fundação de Tenancy, com gate arquitetural, ameaças e critérios de aceite.

- Fundação executável da Sprint 0 com workspace Nx/pnpm, API NestJS/Fastify, worker e oito projetos.
- Configuração Zod, logging Pino, OpenTelemetry, health checks e propagação de correlação.
- Adapters de saúde para PostgreSQL, Redis e RabbitMQ, schema Prisma técnico vazio e execução Docker.
- Quality gates, testes arquiteturais/unitários/de integração, auditoria de dependências e GitHub Actions.
- Relatório técnico final da Sprint 0 em `docs/12-Sprints/SPRINT-0-RELATORIO-FINAL.md`.

- Registro oficial da MISSÃO 002 e da Sprint 0 — Fundação Executável em `docs/12-Sprints/SPRINT-0-FUNDACAO-EXECUTAVEL.md`.
- Backlog, critérios de conclusão e decisões reservadas da Sprint 0.
- ADR-001 a ADR-006 v1.0.0 aprovados, cobrindo arquitetura geral, runtime, persistência, configuração, observabilidade, Core Platform e Shared Kernel.
- Índice de Architecture Decision Records em `docs/02-ADR/README.md`, com estado e gate de aprovação.

- Pacote 7 da Constituição Arquitetural com glossário oficial, siglas, índice consolidado, matriz de referências cruzadas e critérios objetivos para a versão 1.0.0.
- Política operacional de validade máxima e renovação de exceções arquiteturais temporárias.
- Indicadores mínimos de governança arquitetural e referências para sua operacionalização no Blueprint.
- Pacote 6 da Constituição Arquitetural com evolução contínua controlada, fluxo de mudanças, avaliação de impacto, versionamento, compatibilidade, depreciação, migração e rastreabilidade.
- Níveis de criticidade Crítica, Estratégica, Tática e Local para decisões e ADRs.
- Política constitucional de backward compatibility, breaking changes, comunicação, coexistência e retirada.
- Referências para workflow operacional, testes de compatibilidade, padrões de migração e rastreabilidade técnica no Blueprint.
- Pacote 5 da Constituição Arquitetural com papéis, processo decisório, critérios de ADR, conformidade, exceções, governança documental e qualidade arquitetural.
- Governança constitucional do Shared Kernel, criação e depreciação de módulos e ciclo de vida de APIs e eventos.
- Referências para operating model, evidências, métricas, catálogo do Shared Kernel e ciclo de módulos no Blueprint.
- Pacote 4 da Constituição Arquitetural com modelo conceitual de camadas, núcleo, módulos, comunicação, contratos e dependências.
- Diagramas conceituais de camadas e organização do núcleo arquitetural.
- Referências rastreáveis para o detalhamento técnico do Modelo Arquitetural no Blueprint.
- Modelo editorial obrigatório para capítulos da Constituição em `MODELO-DE-CAPITULO.md`.
- Pacote 3 da Constituição Arquitetural com princípios completos de domínio, modularidade, multi-tenancy, eventos, engines, IA, integrações, segurança e observabilidade.
- Referências cruzadas granulares para os tópicos a detalhar posteriormente no Blueprint.
- Pacote 2 da Constituição Arquitetural com Missão, Visão e Valores.
- Registro rastreável dos tópicos constitucionais a detalhar no Blueprint.
- Controle de versão independente da Constituição em `docs/00-Constituicao-Arquitetural/VERSION.md`.
- Política de ciclo de vida, estado documental, identificador único, histórico próprio e rastreabilidade para documentos normativos.

### Changed

- Estratégia de execução alterada: após a segurança essencial, novas fundações genéricas deixam de bloquear o desenvolvimento vertical do Santo Parma.
- Execução de lint serializada para evitar ciclo transitório do Nx no CI.

- Status pós-merge da MISSÃO 006 corrigido e próxima dependência formalizada como Access.

- Status pós-merge da MISSÃO 005 corrigido e próxima dependência formalizada como Identity antes de Access.

- Status do projeto corrigido para registrar a Sprint 0 integrada à `main` e o início controlado da MISSÃO 005.

- Branch `agent/sprint-0-foundation` sincronizada com a baseline arquitetural aprovada na `main`.
- Bloqueios cobertos pelos ADR-001 a ADR-006 removidos do backlog da Sprint 0.
- ADRs corrigidos após revisão técnica: topologia física, limites da baseline de dados, escopo de secrets, criticidade de readiness, dependências e ownership do Shared Kernel.
- VERO-BLP-002 v0.1.0 materializado como `Approved` nesta linha de integração.
- `PROJECT_STATUS.md` atualizado para registrar os seis ADRs em estado `Approved` e o próximo gate da Sprint 0.

- Constituição Arquitetural `VERO-CONST-001` promovida para `1.0.0 — Approved` em commit exclusivo, sem alteração normativa.
- Pacote 7 registrado como aprovado pelo Arquiteto-Chefe.
- Revisão Final de Consistência concluída, com links internos e controles documentais validados.
- Ordem de precedência sincronizada para Constituição, Blueprint, ADRs, Canonical Domain Model, Engineering Playbook e código.
- Constituição `VERO-CONST-001` evoluída editorialmente para `0.7.1`, mantendo estado Draft até o commit exclusivo de promoção.
- Pacote 6 registrado como aprovado pelo Arquiteto-Chefe.
- Constituição `VERO-CONST-001` evoluída para `0.7.0`, mantendo estado Draft e o Pacote 7 para revisão final.
- Pacote 5 registrado como aprovado pelo Arquiteto-Chefe.
- Constituição `VERO-CONST-001` evoluída para `0.6.0`, mantendo estado Draft e o Pacote 6 para revisão.
- Pacote 4 registrado como aprovado pelo Arquiteto-Chefe.
- Capítulo de Governança e Autoridade ampliado e reorganizado segundo o modelo normativo obrigatório, preservando o conteúdo aprovado no Pacote 1.
- Constituição `VERO-CONST-001` evoluída para `0.5.0`, mantendo estado Draft e o Pacote 5 para revisão.
- Pacote 3 registrado como aprovado pelo Arquiteto-Chefe.
- Princípio de Evolução Arquitetural Controlada incorporado à Constituição.
- Constituição `VERO-CONST-001` evoluída para `0.4.0`, mantendo estado Draft e o Pacote 4 para revisão.
- Pacote 2 registrado como aprovado pelo Arquiteto-Chefe.
- Constituição `VERO-CONST-001` evoluída para `0.3.0`, mantendo estado Draft e o Pacote 3 para revisão.
- Capítulo de Princípios Arquiteturais reorganizado segundo o modelo normativo único, preservando o histórico do Pacote 1.
- Separação explícita entre a versão global da plataforma e a versão da Constituição Arquitetural.
- Baseline de `VERO-CONST-001` normalizada para `0.1.0`, em estado Draft, com o Pacote 1 aprovado.

## [0.1.0] - 2026-07-27

### Added

- Bootstrap inicial do repositório.
- Estrutura-base de aplicações, pacotes, serviços, infraestrutura, testes e ferramentas.
- Estrutura oficial expandida de documentação e índice central.
- Pacote 1 da Constituição Arquitetural, com fundamentos, princípios, governança e histórico de revisões.
- Engineering Playbook para desenvolvedores e assistentes de IA.
- Arquivo `VERSION`.

### Changed

- Status do projeto alinhado à fase de consolidação documental.
- Diretórios legados de UX, Backlog e Sprints preservados e documentados; novos documentos passam a usar a numeração oficial.

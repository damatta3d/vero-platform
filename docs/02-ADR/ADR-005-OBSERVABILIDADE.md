# ADR-005 — Observabilidade da VERO Platform

## Controle do documento

| Campo | Valor |
|---|---|
| Identificador | ADR-005 |
| Título | Observabilidade — Logging, Metrics, Tracing, Context Propagation e Health Checks |
| Versão | 0.2.0 |
| Estado | Proposed — aguardando revisão arquitetural |
| Data | 2026-07-27 |
| Autoridade de aprovação | Arquiteto-Chefe |
| Responsável pela materialização | Engenharia Oficial |
| Decisão estrutural | Sim |
| Depende de | ADR-001, ADR-002, ADR-003 e ADR-004 |
| Substitui | Nenhum ADR |

## 1. Contexto

A Constituição torna observabilidade, auditabilidade e segurança preocupações transversais. Os Blueprints exigem logs estruturados, correlação, métricas de cardinalidade controlada, tracing interoperável, health checks seguros e Domain livre de SDKs. A Sprint 0 precisa selecionar bibliotecas e estabelecer propagação de contexto sem confundir logs, eventos de domínio e auditoria.

## 2. Problema

Definir uma baseline coerente para logs, métricas, traces, contexto e health que permita diagnosticar processos e dependências desde a fundação, sem expor dados sensíveis, contaminar o Domain ou criar dependência de backend proprietário.

## 3. Decisão

Se aprovado, este ADR estabelece:

1. **Pino** será a biblioteca oficial de logging estruturado.
2. A integração com NestJS será feita por adapter compatível, preferencialmente `nestjs-pino`, restrito a apps, Presentation e Infrastructure.
3. Logs serão JSON estruturado em ambientes executáveis; apresentação amigável local será apenas transformação de saída.
4. **OpenTelemetry** será o padrão e SDK oficial para traces e métricas, com exportação por **OTLP**.
5. Instrumentação de framework, HTTP, database, cache e messaging ocorrerá nas bordas e adapters.
6. Domain não dependerá de logger, meter, tracer, SDK, exporter ou contexto de runtime.
7. **W3C Trace Context** será o formato interoperável de propagação de trace em HTTP e mensageria quando aplicável.
8. **AsyncLocalStorage** do Node.js sustentará o contexto interno por fluxo assíncrono, encapsulado por uma porta da plataforma.
9. O schema de contexto poderá conter `correlationId`, `traceId`, `spanId`, `requestId`, `causationId`, `tenantId`, `workspaceId`, `userId`, `module` e `operation`; cada campo será opcional e somente será propagado quando validado, necessário e permitido. O contexto mínimo efetivo de cada fluxo será o menor conjunto requerido.
10. IDs técnicos recebidos externamente serão validados por formato, tamanho e conjunto de caracteres; valores ausentes ou inválidos serão gerados na borda. Headers externos nunca serão considerados identidade ou tenant confiáveis sem autenticação e resolução próprias.
11. Campos mínimos de log seguirão o VERO-BLP-002: timestamp, level, message, service, environment e version, mais contexto aplicável.
12. Tokens, credenciais, segredos, payloads sensíveis e dados pessoais desnecessários serão removidos ou mascarados.
13. Métricas terão owner, nome, unidade e labels controladas. IDs de tenant, workspace e user serão proibidos como labels por padrão.
14. Liveness verificará somente a capacidade do processo de executar.
15. Readiness verificará a capacidade de atender apenas com as dependências essenciais ao processo e à capability exposta. PostgreSQL, Redis e RabbitMQ serão incluídos somente onde a indisponibilidade de cada recurso impedir atendimento correto; dependências opcionais serão sinalizadas por telemetria sem derrubar readiness.
16. **`@nestjs/terminus`** será a integração oficial de health checks, com indicadores próprios quando necessário.
17. Endpoints de health não revelarão credenciais, topologia sensível, stack traces ou detalhes internos.
18. Logging não substituirá audit log, Domain Event, Integration Event ou métrica.
19. Exporters e sampling serão configuráveis. Na Sprint 0, console/OTLP e sampling simples poderão compor a baseline; política de produção será definida operacionalmente antes do ambiente produtivo.

## 4. Alternativas consideradas

### 4.1 Winston para logging

**Vantagem:** ecossistema amplo.

**Rejeição proposta:** Pino oferece baseline JSON de baixo overhead e integração direta com o ecossistema Fastify.

### 4.2 Console sem contrato estruturado

**Vantagem:** nenhuma dependência adicional.

**Rejeição proposta:** não garante schema, contexto, redaction ou processamento consistente.

### 4.3 SDK proprietário de observabilidade

**Vantagem:** integração profunda com um backend.

**Rejeição proposta:** cria lock-in antes da definição operacional; OpenTelemetry preserva interoperabilidade.

### 4.4 Propagação manual de contexto em todos os parâmetros

**Vantagem:** dependências totalmente explícitas.

**Rejeição proposta:** para contexto técnico transversal nas bordas, aumenta ruído e risco de perda; AsyncLocalStorage será encapsulado e não acessado pelo Domain.

### 4.5 Correlation ID sem tracing

**Vantagem:** implementação inicial menor.

**Rejeição proposta:** não fornece causalidade e latência entre componentes e não satisfaz a baseline de observabilidade aprovada.

### 4.6 Um único endpoint de health

**Vantagem:** simplicidade.

**Rejeição proposta:** mistura processo vivo com capacidade de atender e pode provocar reinicializações indevidas.

## 5. Impacto Arquitetural

A decisão cria uma plataforma de observabilidade provider-neutral nas bordas, com contexto técnico propagado sem invadir o Domain. Health se torna contrato operacional separado da telemetria e da auditoria.

## 6. Componentes afetados

- bootstrap e composition roots;
- logging adapter;
- observability package;
- HTTP hooks e interceptors;
- consumers e publishers;
- database, Redis e RabbitMQ adapters;
- health endpoints;
- Docker e orquestração;
- testes de redaction, propagação e cardinalidade;
- CI e operação.

## 7. Justificativa

Pino alinha logging ao Fastify. OpenTelemetry e OTLP mantêm portabilidade de backend. AsyncLocalStorage resolve continuidade dentro do processo quando encapsulado. Terminus fornece integração de lifecycle e health no NestJS.

## 8. Consequências positivas

- diagnóstico estruturado desde a Sprint 0;
- correlação entre logs e traces;
- backend de telemetria substituível;
- redaction e contexto padronizados;
- readiness e liveness semanticamente distintos;
- Domain livre de dependências operacionais;
- base para SLOs e alertas futuros.

## 9. Consequências negativas

- instrumentação acrescenta overhead e configuração;
- AsyncLocalStorage exige testes em fluxos assíncronos;
- labels e logs precisam de governança contínua;
- múltiplos sinais aumentam custo operacional;
- sampling pode ocultar traces se configurado incorretamente;
- health de dependências pode gerar instabilidade se mal interpretado pelo orquestrador.

## 10. Riscos

| Risco | Tratamento |
|---|---|
| Vazamento de dados | allowlist de campos, redaction e testes |
| Alta cardinalidade | proibição de IDs em labels e revisão |
| Contexto perdido | adapters, testes HTTP e messaging |
| Contexto externo forjado | validação e resolução confiável na borda |
| Telemetria derrubar aplicação | exportação assíncrona, limites e falha não bloqueante |
| Readiness virar liveness | endpoints e semânticas separadas |
| Vendor lock-in | OpenTelemetry e OTLP |

## 11. Impactos futuros

- Backend de logs, traces e métricas poderá mudar sem alterar contratos internos.
- Sampling, retenção, dashboards, alertas e SLOs exigirão política operacional própria.
- Auditoria será capacidade separada com retenção e integridade próprias.
- Propagação por novos transportes deverá mapear W3C e metadados canônicos.
- Métricas de negócio somente serão criadas pelos owners autorizados.

## 12. Critérios de revisão futura

- mudança de runtime ou transporte;
- limitações de performance mensuradas;
- requisitos regulatórios de observabilidade ou auditoria;
- mudança do padrão interoperável;
- adoção de backend que exija extensão incompatível;
- falhas recorrentes de contexto ou cardinalidade;
- definição de SLOs e produção em escala.

## 13. Constitution Traceability

- VERO-CONST-001-CH02 — observabilidade, segurança e auditabilidade;
- VERO-CONST-001-CH03 — estratégia de observabilidade e evidências;
- VERO-CONST-001-CH05 — Cross-Cutting Services, contratos e dependências;
- VERO-CONST-001-CH06 — evolução, compatibilidade e rastreabilidade.

## 14. Blueprint Traceability

- VERO-BLP-001 §§ 4, 7.3, 12, 15–16 e 20 — apps, observabilidade, testes, deploy e decisão reservada;
- VERO-BLP-002 §§ 5, 8–9, 17, 19, 21–23 — lifecycle, logging, sinais, contexto, health, eventos, testes e escolhas reservadas.

## 15. Referências

- [Constituição Arquitetural](../00-Constituicao-Arquitetural/README.md)
- [VERO-BLP-001 — Volume I](../01-Blueprint/VERO-BLP-001-VOLUME-I-VISAO-GERAL-E-ESTRUTURA-FISICA.md)
- [VERO-BLP-002 — Volume II](../01-Blueprint/VERO-BLP-002-VOLUME-II-CORE-PLATFORM-E-SHARED-KERNEL.md)
- [ADR-002](ADR-002-RUNTIME-E-FRAMEWORK.md)
- [ADR-004](ADR-004-CONFIGURACAO-CENTRALIZADA.md)

## 16. Histórico de revisões

| Versão | Data | Alteração | Estado |
|---|---|---|---|
| 0.1.0 | 2026-07-27 | Proposta inicial da baseline de observabilidade | Proposed |
| 0.2.0 | 2026-07-27 | Dependências, contexto mínimo e readiness refinados por criticidade | Proposed |

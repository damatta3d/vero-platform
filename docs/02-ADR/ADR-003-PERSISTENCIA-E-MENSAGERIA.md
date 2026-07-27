# ADR-003 — Persistência e Mensageria da VERO Platform

## Controle do documento

| Campo | Valor |
|---|---|
| Identificador | ADR-003 |
| Título | Persistência e Mensageria — PostgreSQL, Prisma, Redis e RabbitMQ |
| Versão | 0.1.0 |
| Estado | Proposed — aguardando revisão arquitetural |
| Data | 2026-07-27 |
| Autoridade de aprovação | Arquiteto-Chefe |
| Responsável pela materialização | Engenharia Oficial |
| Decisão estrutural | Sim |
| Depende de | ADR-001 e ADR-002 |
| Substitui | Nenhum ADR |

## 1. Contexto

A fundação precisa de persistência transacional, cache e mensageria assíncrona sem permitir que providers definam o domínio. O Blueprint estabelece PostgreSQL, Prisma, Redis e RabbitMQ, propriedade lógica de dados por módulo, adapters em Infrastructure e distinção entre Domain Event e Integration Event. Estratégias completas de schema modular, Unit of Work, outbox/inbox e schema registry permanecem decisões reservadas.

## 2. Problema

Definir as tecnologias estruturais e seus papéis, limites e dependências para que a Sprint 0 possa materializar conexões, adapters e health checks sem antecipar modelagem de negócio, contratos de eventos ou garantias distribuídas ainda não aprovadas.

## 3. Decisão

Se aprovado, este ADR estabelece:

1. **PostgreSQL** será a fonte persistente transacional oficial.
2. **Prisma ORM** será o toolkit oficial de schema, migrations e acesso técnico ao PostgreSQL.
3. **Redis** será o recurso oficial para cache e capacidades efêmeras explicitamente autorizadas; nunca será fonte de verdade do domínio.
4. **RabbitMQ** será o transporte oficial de mensageria assíncrona.
5. Domain e Application dependerão de portas próprias, não de Prisma Client, drivers PostgreSQL, clientes Redis ou RabbitMQ.
6. Implementações concretas residirão em Infrastructure e serão conectadas nos composition roots.
7. Cada módulo manterá ownership lógico de seus dados; acesso direto a tabelas, schemas, repositories ou internals de outro módulo será proibido.
8. Migrations serão versionadas, revisadas e executadas como etapa controlada.
9. Chaves Redis terão namespace, versão e contexto de tenant quando aplicável; expiração e invalidação terão owner.
10. Exchanges, queues, bindings, retries e dead-letter serão detalhes operacionais de Infrastructure.
11. Contratos de integração pertencerão ao publicador e permanecerão agnósticos do RabbitMQ.
12. Idempotência e redelivery serão considerados desde o desenho dos consumers.
13. A Sprint 0 poderá criar somente baseline técnica, adapters, configuração, conectividade e health checks, sem schemas ou mensagens de negócio.
14. Este ADR **não decide**:
    - organização definitiva de schemas Prisma por módulo;
    - transações entre módulos ou Unit of Work;
    - outbox/inbox;
    - entrega exatamente uma vez;
    - schema registry e contract testing;
    - topologia definitiva de exchanges e filas.
   Esses temas exigirão ADR antes da implementação correspondente.

## 4. Alternativas consideradas

### 4.1 MySQL/MariaDB

**Vantagem:** ampla adoção.

**Rejeição proposta:** PostgreSQL já é a fonte oficial no Blueprint e atende melhor à baseline sem introduzir segundo banco relacional.

### 4.2 MongoDB como fonte principal

**Vantagem:** flexibilidade documental.

**Rejeição proposta:** não há requisito que justifique abandonar o modelo transacional relacional; introduziria estratégia de dados não aprovada.

### 4.3 TypeORM ou Sequelize

**Vantagem:** integração conhecida com NestJS.

**Rejeição proposta:** Prisma é o ORM oficial do Blueprint; múltiplos ORMs fragmentariam migrations e padrões.

### 4.4 Cache somente em memória

**Vantagem:** operação local simples.

**Rejeição proposta:** não oferece coordenação entre processos e não representa a baseline distribuída prevista; pode ser usado apenas como detalhe local não semântico.

### 4.5 Kafka, NATS ou serviços gerenciados proprietários

**Vantagem:** diferentes perfis de throughput ou operação.

**Rejeição proposta:** RabbitMQ satisfaz a baseline aprovada; não existe evidência para outra tecnologia estrutural.

### 4.6 Comunicação somente síncrona

**Vantagem:** fluxo inicial mais simples.

**Rejeição proposta:** impediria desacoplamento temporal e contraria a Event Platform prevista, embora chamadas síncronas continuem válidas quando resposta imediata for necessária.

## 5. Impacto Arquitetural

A decisão fixa providers da baseline e a obrigação de adapters, ownership e isolamento. Ela não define modelos de domínio, tabelas de negócio, eventos concretos nem consistência distribuída.

## 6. Componentes afetados

- packages de database, cache e messaging;
- Prisma schema e migrations técnicas;
- composition roots;
- configuração e secrets;
- health/readiness;
- testes de integração;
- Docker Compose;
- CI;
- futuros publishers e consumers.

## 7. Justificativa

A combinação fornece persistência ACID, acesso tipado, cache compartilhado e mensageria confiável, mantendo providers atrás de portas. Os limites evitam que a escolha técnica contamine contratos e preservam evolução posterior.

## 8. Consequências positivas

- stack de dados única e explícita;
- migrations e schema versionados;
- domínio independente de provider;
- cache distribuído sem virar fonte de verdade;
- mensageria desacoplada de contratos semânticos;
- health checks e testes de integração reproduzíveis;
- caminho claro para evolução de eventos.

## 9. Consequências negativas

- quatro componentes operacionais aumentam setup e monitoramento;
- Prisma possui limitações específicas que podem exigir SQL controlado;
- invalidação de cache continua complexa;
- RabbitMQ exige políticas de retry, DLQ e idempotência;
- consistência entre banco e broker não é resolvida por esta decisão.

## 10. Riscos

| Risco | Tratamento |
|---|---|
| Vazamento do Prisma para Domain/Application | portas, mappers e boundaries |
| Acesso cruzado a dados | ownership, testes e revisão de migrations |
| Cache obsoleto | TTL e invalidação com owner |
| Redelivery duplicar efeitos | handlers idempotentes e identificadores de mensagem |
| Perda entre commit e publish | bloquear publicação transacional até ADR de outbox/inbox |
| Credenciais expostas | ADR-004, secret stores e redaction |
| Health revelar topologia | respostas sanitizadas |

## 11. Impactos futuros

- Outbox/inbox será obrigatório antes de prometer publicação transacional confiável.
- Estratégia de schemas e Unit of Work deverá ser decidida antes de dados modulares reais.
- Mudança de provider exigirá adapters, migração e ADR substitutiva.
- Serviços gerenciados poderão implementar os mesmos contratos sem alterar Domain.
- Contratos públicos de eventos terão versionamento independente.

## 12. Critérios de revisão futura

- limitações comprovadas de escala, consistência ou segurança;
- mudança de topologia para serviços independentes;
- necessidade de armazenamento especializado;
- fim de suporte ou risco crítico de provider;
- requisitos de entrega e replay não atendidos pelo RabbitMQ;
- evolução da estratégia de tenancy e propriedade de dados.

## 13. Constitution Traceability

- VERO-CONST-001-CH02 — multi-tenancy, eventos, segurança e evolução controlada;
- VERO-CONST-001-CH03 — tecnologias estruturais, contratos e conformidade;
- VERO-CONST-001-CH05 — ownership, adapters, eventos e dependências;
- VERO-CONST-001-CH06 — migrations, compatibilidade e mudança;
- VERO-CONST-001-CH07 — Event, Contract, Provider e Adapter.

## 14. Blueprint Traceability

- VERO-BLP-001 §§ 7–8 — infraestrutura, persistência, cache e mensageria;
- VERO-BLP-001 §§ 11–12 — dependências e testes;
- VERO-BLP-001 §§ 13–16 — configuração, build e deploy;
- VERO-BLP-001 §§ 18.3 e 20 — stack oficial e decisões reservadas;
- VERO-BLP-002 §§ 4–5, 13, 17, 19 e 23 — adapters, DI, contratos, eventos, boundaries e ADRs futuras.

## 15. Referências

- [Constituição Arquitetural](../00-Constituicao-Arquitetural/README.md)
- [VERO-BLP-001 — Volume I](../01-Blueprint/VERO-BLP-001-VOLUME-I-VISAO-GERAL-E-ESTRUTURA-FISICA.md)
- [VERO-BLP-002 — Volume II](../01-Blueprint/VERO-BLP-002-VOLUME-II-CORE-PLATFORM-E-SHARED-KERNEL.md)
- [Canonical Domain Model](../03-Domain/VERO-CDM-001-CANONICAL-DOMAIN-MODEL.md)
- [ADR-001](ADR-001-ARQUITETURA-GERAL.md)
- [ADR-002](ADR-002-RUNTIME-E-FRAMEWORK.md)

## 16. Histórico de revisões

| Versão | Data | Alteração | Estado |
|---|---|---|---|
| 0.1.0 | 2026-07-27 | Proposta inicial de persistência, cache e mensageria | Proposed |

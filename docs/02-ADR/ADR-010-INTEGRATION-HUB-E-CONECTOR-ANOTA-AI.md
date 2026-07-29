# ADR-010 — Integration Hub e fronteira do Connector Anota AI

## Controle

| Campo | Valor |
|---|---|
| Identificador | ADR-010 |
| Versão | 0.1.0 |
| Estado | Proposed |
| Data | 2026-07-29 |
| Missão | MISSÃO 009 |

## Contexto

A MISSÃO 009 introduz a primeira dependência operacional externa da VERO. A Constituição exige que
integrações atravessem o Integration Hub, adapters explícitos e Anti-Corruption Layer. O Blueprint
define grupos `Platform` e `Integrations`, contratos públicos, eventos versionados e consumidores
idempotentes. O ADR-003 reserva outbox/inbox como requisito antes de prometer publicação
transacional confiável.

A baseline possui catálogo, estoque, produção e venda simplificada. O módulo de venda representa
uma venda concluída de um único produto e não modela o ciclo de um pedido externo. A API oficial da
Anota AI ainda possui contratos que precisam ser confirmados antes do cliente real.

Sem uma decisão explícita, há risco de:

- acoplar módulos Business a DTOs e estados da Anota AI;
- gravar diretamente no módulo de vendas;
- baixar estoque antes da conclusão do pedido;
- duplicar efeitos por redelivery;
- prometer exactly-once sem suporte técnico;
- armazenar credenciais e dados pessoais de forma inadequada.

## Decisão proposta

1. Criar uma capacidade provider-neutral de **Integration Hub** no grupo `Platform`.
2. Criar o **Connector Anota AI** no grupo `Integrations`.
3. Manter DTOs, autenticação, endpoints e estados da Anota AI privados ao conector.
4. Exigir `tenantId` e `connectionId` resolvidos em toda execução.
5. Persistir somente referência de credencial; o segredo será obtido por `SecretProvider`.
6. Adotar entrega **at-least-once com efeitos idempotentes**.
7. Implementar inbox durável antes de produzir efeitos Business a partir de mensagens externas.
8. Implementar outbox antes de prometer publicação transacional confiável em RabbitMQ.
9. Proibir escrita direta em tabelas, repositórios ou serviços internos de outros módulos.
10. Proibir conversão direta de pedido externo em `SalesService.recordSale`.
11. Usar o contrato provider-neutral `ExternalOrder` de `business/sales` como fronteira inicial de
    Order Intake, sem persistência de pedido ou efeito de venda.
12. Permitir somente conectividade e smoke test read-only no primeiro gate técnico.
13. Exigir autorização específica antes de qualquer mutação externa na homologação.
14. Manter o conector desligável sem impedir a operação nativa da VERO.

## Topologia proposta

```text
apps/api | apps/worker
          |
          v
platform/integration-hub
          |
          v
integrations/anota-ai
          |
          v
Anota AI

integrations/anota-ai
          |
          v
contrato público business/sales (ExternalOrder)
```

Infrastructure implementa persistência, transporte, secret resolution e mensageria por portas. A
direção das dependências permanece aderente à matriz do Blueprint.

## Garantias

- não existe garantia de exactly-once;
- duplicatas são esperadas e tratadas;
- retry de mutação externa somente ocorrerá quando o contrato oficial provar idempotência;
- estado interno não antecipará sucesso externo;
- falhas de uma conexão não interrompem outras conexões;
- eventos públicos usam envelope e versionamento do Blueprint;
- payload externo não é evento canônico;
- dados sensíveis não entram em logs, métricas ou fixtures.

## Alternativas consideradas

### Integrar diretamente no módulo Sales

Rejeitada porque Sales não representa pedido, carrinho, adicionais, descontos, frete, pagamento ou
status. A opção também acoplaria a conclusão da venda ao fornecedor.

### Colocar o cliente Anota AI em Infrastructure

Rejeitada porque o conector contém tradução semântica e política específica de provider, não apenas
detalhe técnico genérico.

### Publicar direto no RabbitMQ sem inbox/outbox

Rejeitada porque cria janela de perda ou duplicação entre persistência e publicação, contrariando a
reserva explícita do ADR-003.

### Assumir webhook como único mecanismo

Rejeitada enquanto existência, segurança e contrato de webhook não estiverem confirmados.

### Compartilhar um modelo externo como contrato canônico

Rejeitada por violar a Anti-Corruption Layer e impedir substituição do provider.

## Consequências

### Positivas

- isolamento do domínio;
- reuso para futuros conectores;
- tenant e credenciais governados;
- reprocessamento auditável;
- evolução independente do provider;
- homologação progressiva e reversível.

### Custos

- necessidade de Integration Hub, inbox e mapeamentos;
- criação de um contrato de Order Intake;
- mais testes de contrato e resiliência;
- etapa read-only antes da automação completa;
- decisão futura de secret store para ambientes compartilhados.

## Impactos e migração

- o PR #9 integrou cliente, ACL, contrato `ExternalOrder` e migration de vínculos em modo read-only;
- a implementação existente não será ativada para captura, mutações externas, venda ou estoque
  antes da aprovação;
- a evolução será dividida pelos gates de `VERO-INT-001`;
- ADR de secret store poderá ser necessário antes da homologação compartilhada;
- evolução de Order Intake dentro de Sales ou sua futura extração terá contrato próprio;
- documentação oficial confirmada será convertida em fixtures sem segredos.

## Critérios de aprovação

- conformidade com Constituição, Blueprints, CDM e ADR-003/004/005;
- aceite explícito da etapa read-only;
- aceite de at-least-once + idempotência;
- aceite de que pedido externo não é venda concluída;
- confirmação de que contratos pendentes bloqueiam ativação operacional, não o smoke read-only.

## Referências

- `VERO-CONST-001` CH02 §§ 3.5, 3.8–3.11 e CH05 §§ 3.2–3.6;
- `VERO-BLP-001` §§ 8.5, 9, 11 e 12;
- `VERO-BLP-002` §§ 17, 20 e 21;
- `VERO-CDM-001` §§ 7.3, 9 e 10;
- ADR-003 — Persistência e Mensageria;
- ADR-004 — Configuração Centralizada;
- ADR-005 — Observabilidade;
- [`VERO-INT-001`](../04-Architecture/VERO-INT-001-DESIGN-CONNECTOR-ANOTA-AI.md).

## Histórico

| Versão | Data | Alteração | Estado |
|---|---|---|---|
| 0.1.0 | 2026-07-29 | Proposta inicial da fronteira de integração | Proposed |

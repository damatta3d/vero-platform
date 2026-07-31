# MISSÃO 010.A — Core Domain Consolidation

## Estado

- Branch base: `agent/missao-010-vero-finance-mvp`
- Escopo: fundação DDD reutilizável e migração incremental do Finance
- Comportamento funcional: preservado
- Persistência e APIs: inalteradas

## Auditoria

### Core Domain

`packages/core/domain` já continha os diretórios oficiais e oito arquivos
reservados, todos vazios. Não existia projeto Nx, API pública, implementação ou
testes nessa estrutura.

Primitivas específicas já existiam em outros módulos, como `TenantId` e
hierarquias de erro de Tenancy, Identity e Access. Elas permanecem em seus
bounded contexts; esta missão não as move nem amplia o Shared Kernel.

### Finance

O Finance já estava organizado em `entities`, `enums` e `value-objects`.
Foram identificadas:

- implementações repetidas de igualdade nos value objects;
- IDs em string nas fronteiras de persistência e API;
- `Payable` e `Payment` sem base comum de identidade;
- `throw new Error(...)` em validações e regras do domínio;
- contratos funcionais estáveis em `finance-model.ts`;
- persistência PostgreSQL e endpoints dependentes dos formatos atuais.

## Decisões

1. Manter o caminho existente `packages/core/domain`, sem movimentação
   estrutural.
2. Tornar Core Domain uma biblioteca Nx pública com alias
   `@vero/core-domain`.
3. Implementar apenas `Entity`, `AggregateRoot`, `ValueObject`,
   `UniqueEntityId`, `DomainEvent` e a hierarquia de erros solicitada.
4. Manter publicação de eventos fora do escopo; o agregado apenas registra e
   limpa eventos.
5. Preservar IDs em string nos contratos já persistidos; aplicar
   `UniqueEntityId` inicialmente aos modelos novos `Payable` e `Payment`.
6. Migrar os value objects do Finance por herança, preservando métodos,
   mensagens e resultados.
7. Manter `Account` e `FinancialEntry` em seus formatos funcionais atuais para
   evitar mudança de schema, repositórios e API.

## Arquivos reutilizados

- estrutura existente de `packages/core/domain`;
- entidades, enums e value objects existentes do Finance;
- regras de dependência do Nx;
- geradores de UUID já injetados pelas aplicações;
- contratos públicos e repositórios do Finance.

## Impacto

- igualdade e identidade passam a ter semântica comum;
- eventos de domínio podem ser registrados sem integração externa;
- erros do domínio passam a ser tipados e codificados;
- value objects permanecem imutáveis e compatíveis;
- nenhum endpoint, migration, tabela ou comportamento financeiro foi alterado.

## Próximos passos

1. Migrar `Account` e `FinancialEntry` para entidades somente quando houver
   mapeadores explícitos entre domínio e persistência.
2. Adotar Core Domain nos próximos bounded contexts conforme casos reais.
3. Unificar erros específicos de Tenancy, Identity e Access apenas por ADR e
   plano de compatibilidade.
4. Introduzir dispatcher de eventos somente quando existir um consumidor real.

## Validação

- TypeScript estrito local: aprovado.
- Prettier 3.8.1: aprovado.
- Core Domain: 14 testes, com 100% de cobertura local.
- Branch Finance base: CI #163 aprovado em qualidade, integração e PostgreSQL.
- PR 010.A: validação integral executada pelo CI do GitHub.

# ADR-007 — Persistence Strategy

## Status

Accepted

## Context

A VERO Platform utiliza arquitetura DDD, Modular Monolith, Multi-Tenant e Clean Architecture.

Este ADR define a estratégia oficial de persistência para todos os módulos da plataforma.

## Decision

### Database

- PostgreSQL
- Prisma ORM
- UUID como chave primária
- Multi-Tenant obrigatório

### Identity

- Domínio utiliza `UniqueEntityId`
- Persistência utiliza `uuid`

### Monetary Values

- Todos os valores monetários serão armazenados em centavos (`BIGINT`).

### Multi-Tenancy

Todas as tabelas deverão possuir:

- tenant_id

Nenhuma consulta poderá ignorar o tenant.

### Audit Columns

Todas as entidades persistentes deverão possuir:

- created_at
- updated_at
- created_by
- updated_by

Quando aplicável:

- deleted_at
- deleted_by

### Soft Delete

Utilizar apenas quando fizer sentido para o domínio.

Financeiro não deve excluir registros financeiros.

### Transactions

Todas as operações envolvendo múltiplas agregações utilizarão Transaction Manager.

### Mapping

A conversão entre domínio e banco ocorrerá exclusivamente através de Mappers.

Entity
→ Mapper
→ Prisma
→ PostgreSQL

### Consequences

Todos os módulos da plataforma deverão seguir este padrão.
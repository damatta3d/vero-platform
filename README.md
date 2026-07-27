# VERO Platform

Plataforma empresarial modular para centralizar operações, dados e processos de negócio com segurança, rastreabilidade e evolução controlada.

## Estado

O projeto está na fase de fundação. Nesta etapa serão implementados somente infraestrutura, serviços-base e capacidades transversais. Módulos de negócio como CRM, Financeiro e Produção ficam fora do escopo inicial.

Consulte [PROJECT_STATUS.md](PROJECT_STATUS.md) para o andamento atual e [DEVELOPER_MANIFEST.md](DEVELOPER_MANIFEST.md) para as regras de desenvolvimento.

## Diretrizes arquiteturais

- Clean Architecture
- Domain-Driven Design (DDD)
- Monólito modular
- Plataforma orientada a eventos
- Lifecycle Engine
- Business Rules Framework
- Multi-tenancy
- Segurança por padrão
- Canonical Domain Model
- Decisões arquiteturais registradas por ADR

## Estrutura

- `apps/`: aplicações executáveis
- `packages/`: bibliotecas e contratos compartilhados
- `services/`: serviços-base
- `infrastructure/`: infraestrutura e automação operacional
- `tests/`: testes transversais e de arquitetura
- `tools/`: ferramentas de desenvolvimento
- `docs/`: documentação arquitetural, domínio, UX e planejamento

## Licença

MIT. Consulte [LICENSE](LICENSE).

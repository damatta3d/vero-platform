# MISSÃO 005 — Core Platform: Fundação de Tenancy

## Controle

| Campo | Valor |
|---|---|
| Missão | 005 |
| Branch | `agent/core-tenancy-foundation` |
| Base | `main` em `a707a30ebbcea1b91c5dfdb801f8b21203a98a7b` |
| Estado | Implementação autorizada |
| ADR | ADR-007 v1.0.0 — Approved |
| Owner | Core Platform — Tenancy |
| Data | 2026-07-27 |

## Objetivo

Materializar a primeira capacidade funcional do Core Platform por meio de uma fundação segura e mínima de Tenancy, sem antecipar Identity, Access, lifecycle, persistência ou módulos empresariais.

## Sequência obrigatória

1. elaborar e revisar o ADR-007;
2. obter aprovação explícita do Arquiteto-Chefe;
3. promover o ADR-007 para `Approved` na própria branch;
4. implementar `packages/core/tenancy` conforme a decisão aprovada;
5. executar formatação, lint, typecheck, testes, arquitetura, cobertura, build e auditoria;
6. validar o CI do GitHub;
7. emitir parecer técnico final;
8. aguardar aprovação de merge.

Nenhum código funcional de Tenancy será criado antes do passo 3.

## Escopo autorizado após o gate

- projeto Nx autônomo `packages/core/tenancy`;
- `TenantId` opaco, estável e imutável, sem formato ou gerador definitivo;
- distinção explícita entre candidato, Tenant resolvido e Tenant autorizado;
- contexto semântico explícito e imutável;
- porta de resolução independente de transporte e framework;
- erros semânticos mínimos;
- superfície pública controlada;
- testes unitários, de segurança e arquiteturais;
- threshold mínimo de 90% no projeto;
- atualização dos controles do projeto e CI.

## Fora do escopo

- Identity e autenticação;
- Access e autorização concreta;
- User, Organization e Workspace;
- Aggregate Root e ciclo de vida de Tenant;
- repository, Prisma, migrations ou cache;
- adapters concretos de autenticação;
- middleware que confie em `x-tenant-id`;
- APIs ou módulos empresariais tenant-aware;
- outbox/inbox e eventos de Tenant;
- estratégia física de isolamento de dados;
- formato e geração definitiva de identificadores.

## Ameaças cobertas

| Ameaça | Controle esperado |
|---|---|
| Spoofing de Tenant por header | input externo permanece candidato não confiável |
| Confusão entre resolução e autorização | estados e contratos distintos |
| Vazamento de contexto entre execuções | imutabilidade e escopo isolado |
| Dependência de transporte no domínio | portas agnósticas e composição nas bordas |
| Decisão prematura de ID | valor opaco sem gerador ou persistência |
| Deep import e acoplamento indevido | `public-api.ts`, Nx, ESLint e teste arquitetural |

## Critérios de conclusão

- [ ] ADR-007 aprovado e coerente com documentos superiores.
- [ ] Projeto `core-tenancy` criado sem diretórios ou abstrações especulativas.
- [ ] API pública mínima e internals protegidos.
- [ ] Nenhuma confiança direta em headers ou payloads externos.
- [ ] Resolução não concede autorização.
- [ ] Cobertura de statements, branches, functions e lines ≥ 90%.
- [ ] Quality gates locais aprovados.
- [ ] CI `quality` aprovado.
- [ ] Nenhuma vulnerabilidade alta nova.
- [ ] Relatório técnico final publicado.
- [ ] PR pronto para parecer e aprovação do Arquiteto-Chefe.

## Evidências obrigatórias

- commit e diff do ADR-007;
- lista de arquivos efetivamente lidos;
- relatório de cobertura;
- resultado dos testes e validação arquitetural;
- workflow run e jobs do GitHub Actions;
- inventário de riscos residuais;
- comparação da branch com `main`.

## Próximos gates reservados

A integração desta missão não autoriza automaticamente:

1. Identity ou autenticação;
2. Access ou autorização;
3. persistência e lifecycle de Tenant;
4. Organization, User ou Workspace;
5. qualquer módulo empresarial.

Cada capacidade seguirá em missão controlada própria.

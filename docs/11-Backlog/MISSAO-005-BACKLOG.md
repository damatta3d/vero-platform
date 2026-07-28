# Backlog — MISSÃO 005: Fundação de Tenancy

## Gate arquitetural

- [x] Confirmar `main` e baseline da Sprint 0.
- [x] Ler Blueprint II, CDM, ADR-005, ADR-006, Engineering Playbook e relatório da Sprint 0.
- [x] Elaborar ADR-007 em estado `Proposed`.
- [x] Registrar escopo, ameaças e critérios da missão.
- [x] Concluir revisão técnica e de conformidade do ADR-007.
- [x] Obter aprovação explícita do Arquiteto-Chefe.
- [x] Promover ADR-007 para `Approved`.

## Implementação — autorizada

- [x] Criar projeto Nx `core-tenancy`.
- [x] Implementar `TenantId` opaco e imutável.
- [x] Implementar candidato e resolução sem transporte.
- [x] Implementar contexto resolvido explícito.
- [x] Implementar erros semânticos mínimos.
- [x] Publicar somente a API deliberada.
- [x] Integrar regras Nx e validação arquitetural.
- [x] Implementar testes com threshold ≥ 90%.

## Validação

- [x] Prettier.
- [x] ESLint.
- [x] TypeScript strict.
- [x] Jest e cobertura.
- [x] Testes arquiteturais.
- [x] Build Nx.
- [x] Auditoria de dependências.
- [x] CI GitHub Actions.
- [x] Relatório técnico final.
- [ ] Parecer e aprovação de merge.

## Dependências futuras não autorizadas

- Identity/autenticação;
- Access/autorização;
- persistência e lifecycle de Tenant;
- User, Organization e Workspace;
- módulos empresariais.

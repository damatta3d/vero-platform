# Backlog — MISSÃO 005: Fundação de Tenancy

## Gate arquitetural

- [x] Confirmar `main` e baseline da Sprint 0.
- [x] Ler Blueprint II, CDM, ADR-005, ADR-006, Engineering Playbook e relatório da Sprint 0.
- [x] Elaborar ADR-007 em estado `Proposed`.
- [x] Registrar escopo, ameaças e critérios da missão.
- [x] Concluir revisão técnica e de conformidade do ADR-007.
- [ ] Obter aprovação explícita do Arquiteto-Chefe.
- [ ] Promover ADR-007 para `Approved`.

## Implementação — bloqueada até aprovação

- [ ] Criar projeto Nx `core-tenancy`.
- [ ] Implementar `TenantId` opaco e imutável.
- [ ] Implementar candidato e resolução sem transporte.
- [ ] Implementar contexto resolvido explícito.
- [ ] Implementar erros semânticos mínimos.
- [ ] Publicar somente a API deliberada.
- [ ] Integrar regras Nx e validação arquitetural.
- [ ] Implementar testes com threshold ≥ 90%.

## Validação

- [ ] Prettier.
- [ ] ESLint.
- [ ] TypeScript strict.
- [ ] Jest e cobertura.
- [ ] Testes arquiteturais.
- [ ] Build Nx.
- [ ] Auditoria de dependências.
- [ ] CI GitHub Actions.
- [ ] Relatório técnico final.
- [ ] Parecer e aprovação de merge.

## Dependências futuras não autorizadas

- Identity/autenticação;
- Access/autorização;
- persistência e lifecycle de Tenant;
- User, Organization e Workspace;
- módulos empresariais.

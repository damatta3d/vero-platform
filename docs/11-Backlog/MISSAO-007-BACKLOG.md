# Backlog — MISSÃO 007: Fundação de Access e Autorização

## Gate documental

- [x] Confirmar merge da MISSÃO 006 na `main`.
- [x] Confirmar Access como próxima dependência.
- [x] Corrigir o status pós-merge na branch da missão.
- [x] Elaborar ADR-009 v0.1.0 em estado `Proposed`.
- [x] Criar controle formal da MISSÃO 007.
- [ ] Executar revisão arquitetural completa.
- [ ] Corrigir achados.
- [ ] Obter aprovação explícita do Arquiteto-Chefe.
- [ ] Promover ADR-009 para `Approved`.

## Implementação — bloqueada

- [ ] Criar projeto Nx `core-access`.
- [ ] Implementar pedido contextual.
- [ ] Implementar ação e recurso opacos.
- [ ] Implementar decisão `allow/deny`.
- [ ] Implementar negação por padrão.
- [ ] Proteger capability de decisão positiva.
- [ ] Vincular decisão ao pedido exato.
- [ ] Implementar porta `AccessEvaluator`.
- [ ] Criar erros e razões seguras.
- [ ] Proteger superfície pública e deep imports.
- [ ] Criar contratos de compilação.
- [ ] Criar testes unitários, de runtime e arquitetura.

## Validação futura

- [ ] Prettier.
- [ ] ESLint.
- [ ] TypeScript strict.
- [ ] Cobertura mínima de 90%.
- [ ] Testes arquiteturais.
- [ ] Build completo.
- [ ] Auditoria de dependências.
- [ ] CI `quality` e `integration`.
- [ ] Relatório técnico final.
- [ ] Aprovação explícita antes do merge.

## Dependências futuras não autorizadas

- autenticação concreta;
- User, Organization e Workspace;
- persistência e administração de Role/Permission;
- RBAC/ABAC completo;
- controllers, guards e middleware;
- políticas empresariais;
- licenciamento;
- auditoria persistente.

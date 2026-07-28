# Backlog — MISSÃO 007: Fundação de Access e Autorização

## Gate documental

- [x] Confirmar merge da MISSÃO 006 na `main`.
- [x] Confirmar Access como próxima dependência.
- [x] Corrigir o status pós-merge na branch da missão.
- [x] Elaborar ADR-009 v0.1.1 em estado `Proposed`.
- [x] Criar controle formal da MISSÃO 007.
- [x] Executar revisão arquitetural completa.
- [x] Corrigir fronteira da porta, namespaces e ciclo antirreplay.
- [x] Obter aprovação explícita do Arquiteto-Chefe.
- [x] Promover ADR-009 para `Approved`.

## Implementação

- [x] Criar projeto Nx `core-access`.
- [x] Implementar pedido contextual.
- [x] Implementar ação e recurso qualificados.
- [x] Implementar negação por padrão.
- [x] Rejeitar Identity e Tenant forjados.
- [x] Implementar contexto autorizado de uso único.
- [x] Implementar porta `AccessEvaluator`.
- [x] Criar erros seguros.
- [x] Proteger superfície pública e deep imports.
- [x] Criar contrato de compilação.
- [x] Criar testes unitários, de runtime e arquitetura.

## Validação futura

- [x] Prettier focado.
- [x] ESLint completo.
- [x] TypeScript strict focado.
- [x] Cobertura mínima de 90%.
- [x] Testes arquiteturais completos.
- [x] Build completo.
- [x] Auditoria de dependências sem vulnerabilidade alta.
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

Essas dependências deixam de bloquear o MVP. Só serão implementadas quando um caso de uso vertical demonstrar necessidade.

# Backlog — MISSÃO 006: Fundação de Identity e Autenticação

## Gate documental

- [x] Confirmar merge da MISSÃO 005 na `main`.
- [x] Revisar precedência normativa.
- [x] Definir ADR-008 v0.1.0 em estado `Proposed`.
- [x] Criar controle formal da MISSÃO 006.
- [ ] Executar revisão arquitetural independente.
- [ ] Corrigir achados bloqueadores, altos e médios.
- [ ] Obter aprovação explícita do Arquiteto-Chefe.
- [ ] Promover ADR-008 para `Approved`.

## Implementação — bloqueada até aprovação

- [ ] Criar projeto Nx `core-identity`.
- [ ] Implementar evidência não confiável.
- [ ] Implementar `PrincipalId` opaco.
- [ ] Implementar principal humano e de serviço.
- [ ] Implementar `IdentityContext`.
- [ ] Implementar porta `Authenticator` e resultados.
- [ ] Implementar erros semânticos mínimos.
- [ ] Proteger a superfície pública e deep imports.
- [ ] Criar contratos de compilação.
- [ ] Criar testes unitários e de segurança.

## Validação

- [ ] Prettier.
- [ ] ESLint.
- [ ] TypeScript strict.
- [ ] Testes e cobertura mínima de 90%.
- [ ] Testes arquiteturais.
- [ ] Build completo.
- [ ] Auditoria de dependências.
- [ ] CI `quality` e `integration`.
- [ ] Relatório técnico final.
- [ ] Aprovação explícita antes do merge.

## Dependências futuras não autorizadas

- Access e autorização;
- User e gestão de credenciais;
- provider de identidade;
- JWT, OIDC, OAuth, sessões e MFA;
- associação principal–Tenant;
- controllers, guards e middleware;
- persistência;
- módulos empresariais.

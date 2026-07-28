# Backlog — MISSÃO 006: Fundação de Identity e Autenticação

## Gate documental

- [x] Confirmar merge da MISSÃO 005 na `main`.
- [x] Revisar precedência normativa.
- [x] Definir ADR-008 v0.1.1 em estado `Proposed`.
- [x] Criar controle formal da MISSÃO 006.
- [x] Executar revisão arquitetural independente.
- [x] Corrigir dois achados altos e um médio da revisão do ADR-008.
- [x] Obter aprovação explícita do Arquiteto-Chefe.
- [x] Promover ADR-008 para `Approved`.

## Implementação — autorizada e em validação

- [x] Criar projeto Nx `core-identity`.
- [x] Implementar evidência não confiável.
- [x] Implementar `PrincipalId` opaco.
- [x] Implementar principal humano e de serviço.
- [x] Implementar `IdentityContext`.
- [x] Implementar porta `Authenticator` e capability interna de promoção; adapters concretos permanecem reservados.
- [x] Qualificar sujeito pela autoridade autenticadora e impedir equivalência entre autoridades.
- [x] Implementar erros semânticos mínimos.
- [x] Proteger a superfície pública e deep imports.
- [x] Criar contratos de compilação.
- [x] Criar testes unitários e de segurança.
- [x] Testar não exposição, retenção mínima e redaction da evidência.
- [x] Rejeitar em compilação, superfície e runtime fabricação externa de identidade confiável.

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

# MISSÃO 006 — Core Platform: Fundação de Identity e Autenticação

## Controle

| Campo | Valor |
|---|---|
| Missão | 006 |
| Branch | `agent/core-identity-foundation` |
| Base | `main` em `addb8d7a8e5bd50007ae323d446c197230202502` |
| Estado | Gate arquitetural em revisão; implementação não autorizada |
| ADR | ADR-008 v0.1.1 — Proposed |
| Owner | Core Platform — Identity |
| Data | 2026-07-27 |

## Objetivo

Definir e, somente após aprovação do ADR-008, materializar uma fundação segura e mínima de Identity: evidência não confiável, principal autenticado, contexto explícito e porta de autenticação, sem antecipar Access, User, provider, transporte ou persistência.

## Justificativa de sequência

A Fundação de Tenancy exige fonte autenticada futura para resolução concreta, e Access precisará avaliar um principal autenticado junto ao Tenant resolvido. Portanto:

1. Tenancy resolvida — concluída na MISSÃO 005;
2. Identity autenticada — objeto desta missão;
3. Access e autorização contextual — missão futura;
4. integrações concretas e APIs funcionais — somente após esses gates.

## Sequência obrigatória

1. revisar o ADR-008 contra toda a hierarquia normativa;
2. corrigir achados na branch da missão;
3. obter aprovação explícita do Arquiteto-Chefe;
4. promover o ADR-008 para `Approved`;
5. implementar `packages/core/identity` dentro do escopo aprovado;
6. executar formatação, lint, typecheck, testes, arquitetura, cobertura, build e auditoria;
7. validar o CI do GitHub;
8. emitir relatório técnico final;
9. aguardar aprovação explícita de merge.

Nenhum código funcional de Identity será criado antes do passo 4.

## Escopo autorizado após o gate

- projeto Nx autônomo `packages/core/identity`;
- evidência de autenticação opaca e não confiável;
- `PrincipalId` opaco, nominal e sem construção pública;
- principal humano ou de serviço já autenticado;
- `IdentityContext` explícito e imutável;
- porta `Authenticator` independente de protocolo e framework;
- resultados e erros semânticos mínimos;
- superfície pública controlada;
- testes unitários, de segurança, compilação e arquitetura;
- threshold mínimo de 90%;
- atualização dos controles do projeto e CI.

## Fora do escopo

- JWT, OIDC, OAuth, Passport ou IdP concreto;
- controllers, guards, middleware e decorators;
- tokens, sessões, cookies, API keys, senhas, MFA e credenciais;
- User, Role, Permission e Access;
- autorização de Tenant, Workspace, módulos ou operações;
- persistência, Prisma, migrations ou cache;
- associação entre principal e Tenant;
- SSO, federação, SCIM e módulos empresariais.

## Ameaças cobertas

| Ameaça | Controle esperado |
|---|---|
| Confiança direta em token/header | evidência permanece não confiável até o autenticador |
| Confusão autenticação/autorização | estados e contratos separados |
| Confusão principal/User | conceitos e owners distintos |
| Acoplamento a JWT/OIDC | porta agnóstica e adapter futuro |
| Vazamento de credenciais | erros e telemetria minimizados |
| Construção externa de principal | capability interna não exportada, composição controlada e testes de runtime |
| Fabricação por adapter externo | implementação da porta não concede a capability de promoção |
| Colisão entre autoridades | sujeito sempre qualificado por autoridade; linking automático proibido |
| Exposição de evidência | valor efêmero, não serializável, redigido e ausente da telemetria |
| Acoplamento Identity/Tenancy | composição futura somente por Access |

## Critérios de conclusão

- [ ] ADR-008 aprovado e coerente com documentos superiores.
- [ ] Projeto `core-identity` criado sem abstrações especulativas.
- [ ] API pública mínima e internals protegidos.
- [ ] Evidência externa nunca tratada como identidade autenticada e nunca exposta por inspeção, serialização, erros ou telemetria.
- [ ] Sujeito qualificado por autoridade, sem equivalência automática entre autoridades.
- [ ] Implementações externas de `Authenticator` não conseguem fabricar resultados confiáveis.
- [ ] Autenticação não concede autorização.
- [ ] Principal não confundido com User.
- [ ] Cobertura de statements, branches, functions e lines ≥ 90%.
- [ ] Quality gates locais aprovados.
- [ ] CI `quality` e `integration` aprovados.
- [ ] Nenhuma vulnerabilidade alta nova.
- [ ] Relatório técnico final publicado.
- [ ] PR aprovado para merge pelo Arquiteto-Chefe.

## Evidências obrigatórias

- commit e diff do ADR-008;
- lista de arquivos efetivamente lidos;
- relatório de cobertura;
- resultados dos testes e validação arquitetural;
- workflow run e jobs do GitHub Actions;
- inventário de riscos residuais;
- comparação da branch com `main`.

## Gates reservados

A integração desta missão não autoriza automaticamente:

1. Access ou autorização;
2. provider ou protocolo concreto de autenticação;
3. User e gestão de credenciais;
4. integração HTTP ou mensageria;
5. persistência ou sessões;
6. qualquer módulo empresarial.

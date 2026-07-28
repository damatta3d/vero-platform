# MISSÃO 007 — Core Platform: Fundação de Access e Autorização

## Controle

| Campo | Valor |
|---|---|
| Missão | 007 |
| Branch | `agent/core-access-foundation` |
| Base | `main` em `1553b8ea6186788e8ed1632d008c8c8a361b9e50` |
| Estado | Gate documental; implementação bloqueada |
| ADR | ADR-009 v0.1.0 — Proposed |
| Owner | Core Platform — Access |
| Data | 2026-07-27 |

## Objetivo

Definir e, somente após aprovação do ADR-009, materializar a fundação mínima de Access: pedido contextual, avaliação com negação por padrão, decisão confiável e contexto autorizado vinculado ao pedido, sem antecipar provider, persistência, transporte, administração de Role/Permission ou regras empresariais.

## Justificativa de sequência

1. Tenancy resolvida — concluída na MISSÃO 005;
2. Identity autenticada — concluída na MISSÃO 006;
3. Access e autorização contextual — objeto desta missão;
4. adapters concretos, User e APIs funcionais — somente após gates próprios.

## Sequência obrigatória

1. corrigir o status pós-merge da MISSÃO 006;
2. revisar o ADR-009 contra a hierarquia normativa;
3. corrigir achados na própria branch;
4. obter aprovação explícita do Arquiteto-Chefe;
5. promover o ADR-009 para `Approved`;
6. implementar `packages/core/access` estritamente no escopo;
7. executar todos os quality gates;
8. validar o CI oficial;
9. publicar relatório técnico final;
10. aguardar autorização explícita de merge.

Nenhum código funcional de Access será criado antes do passo 5.

## Escopo autorizado somente após o gate

- projeto Nx `core-access`;
- pedido de autorização contextual;
- ação e recurso opacos;
- decisão explícita `allow/deny`;
- negação por padrão;
- contexto autorizado não construível externamente;
- porta agnóstica de avaliação;
- dependências públicas controladas de Identity e Tenancy;
- erros e razões semânticas seguras;
- testes unitários, de segurança, compilação e arquitetura;
- threshold mínimo de 90%.

## Fora do escopo

- autenticação concreta;
- controllers, guards e middleware;
- User, Organization e Workspace;
- persistência e administração de Role/Permission;
- RBAC/ABAC completo ou engine de políticas;
- políticas de módulos empresariais;
- licenciamento e entitlements;
- APIs tenant-aware funcionais;
- auditoria persistente.

## Ameaças cobertas

| Ameaça | Controle esperado |
|---|---|
| `allow` fabricado externamente | capability interna e integridade em runtime |
| Confusão entre resolução e autorização | estados e owners separados |
| Reuso em outro escopo | decisão vinculada ao pedido exato |
| Falha aberta | negação para ausência, erro, timeout e desconhecido |
| Adapter malicioso | implementar a porta não concede autoridade |
| Regra empresarial em Access | separação formal de invariantes |
| Vazamento em razões | projeções mínimas e redigidas |

## Critérios de conclusão

- [ ] ADR-009 aprovado.
- [ ] Projeto `core-access` criado sem abstrações especulativas.
- [ ] API pública mínima e internals protegidos.
- [ ] Decisão positiva não fabricável.
- [ ] Negação por padrão comprovada.
- [ ] Identidade e Tenant forjados rejeitados.
- [ ] Decisão vinculada ao pedido exato.
- [ ] Cobertura ≥ 90% nas quatro métricas.
- [ ] Quality gates e CI aprovados.
- [ ] Nenhuma vulnerabilidade alta nova.
- [ ] Relatório final publicado.
- [ ] Merge aprovado explicitamente.

## Gates reservados

A integração desta missão não autoriza automaticamente providers, RBAC/ABAC completo, User, Organization, Workspace, persistência, transporte, módulos empresariais ou produção.

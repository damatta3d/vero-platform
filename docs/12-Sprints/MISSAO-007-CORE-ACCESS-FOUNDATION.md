# MISSÃO 007 — Core Platform: Fundação de Access e Autorização

## Controle

| Campo | Valor |
|---|---|
| Missão | 007 |
| Branch | `agent/core-access-foundation` |
| Base | `main` em `1553b8ea6186788e8ed1632d008c8c8a361b9e50` |
| Estado | Segurança essencial implementada; validação em andamento |
| ADR | ADR-009 v1.0.0 — Approved |
| Owner | Core Platform — Access |
| Data | 2026-07-27 |

## Objetivo

Materializar somente a segurança indispensável para iniciar o MVP: validar Identity e Tenant confiáveis, negar por padrão, qualificar ação/recurso e produzir contexto autorizado de uso único, sem antecipar RBAC/ABAC, administração de permissões ou infraestrutura adicional.

## Justificativa de sequência

1. Tenancy resolvida — concluída na MISSÃO 005;
2. Identity autenticada — concluída na MISSÃO 006;
3. Access e autorização contextual — objeto desta missão;
4. MVP vertical do Santo Parma — próxima missão.

## Sequência obrigatória

1. corrigir o status pós-merge da MISSÃO 006;
2. revisar o ADR-009 contra a hierarquia normativa;
3. corrigir achados na própria branch;
4. registrar a aprovação explícita do Arquiteto-Chefe;
5. promover o ADR-009 para `Approved`;
6. implementar `packages/core/access` estritamente no escopo;
7. executar todos os quality gates;
8. validar o CI oficial;
9. publicar relatório técnico final;
10. aguardar autorização explícita de merge.

## Escopo autorizado

- projeto Nx `core-access`;
- pedido de autorização contextual;
- ação e recurso opacos;
- negação por padrão;
- contexto autorizado de uso único;
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
| contexto fabricado por entrada externa | validação de Identity, Tenant e autorização em runtime |
| Confusão entre resolução e autorização | estados e owners separados |
| Reuso em outro escopo | decisão vinculada ao pedido exato |
| Falha aberta | negação para ausência, erro e resultado inválido |
| Evaluator indevido | seleção exclusiva pela composition root e revisão de código |
| Colisão de ação/recurso | referências qualificadas pelo namespace do módulo owner |
| Reuso ou replay | decisão efêmera, não serializável e vinculada à avaliação/política |
| Regra empresarial em Access | separação formal de invariantes |
| Vazamento em razões | projeções mínimas e redigidas |

## Critérios de conclusão

- [x] ADR-009 aprovado.
- [x] Projeto `core-access` criado sem abstrações especulativas.
- [x] API pública mínima.
- [x] Contexto fabricado por entrada externa rejeitado.
- [x] Negação por padrão comprovada.
- [x] Identidade e Tenant forjados rejeitados.
- [x] Autorização vinculada ao pedido exato e consumível uma vez.
- [x] Cobertura ≥ 90% nas quatro métricas.
- [x] Quality gates locais aprovados.
- [ ] CI aprovado.
- [x] Nenhuma vulnerabilidade alta nova.
- [x] Relatório final publicado.
- [ ] Merge aprovado explicitamente.

## Gates reservados

A integração desta missão encerra a sequência de fundações genéricas. A próxima missão deverá entregar uma fatia vertical do Santo Parma; providers avançados, RBAC/ABAC, Organization, Workspace e white-label permanecem adiados.

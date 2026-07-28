# ADR-008 — Fundação de Identity e Autenticação

## Controle do documento

| Campo | Valor |
|---|---|
| Identificador | ADR-008 |
| Título | Fundação de Identity — principal autenticado, evidência verificada e contexto explícito |
| Versão | 1.0.0 |
| Estado | Approved |
| Data | 2026-07-27 |
| Autoridade de aprovação | Arquiteto-Chefe |
| Owner | Core Platform — Identity |
| Branch | `agent/core-identity-foundation` |

## 1. Contexto

A Sprint 0 entregou a fundação executável e a MISSÃO 005 materializou Tenancy com candidato não confiável, identidade de Tenant resolvida e `ResolvedTenantContext`. O ADR-007 determina que resolução de Tenant não representa autorização e que adapters concretos dependem de identidade autenticada, credenciais de serviço, sessão verificada ou outra fonte aprovada.

O VERO-BLP-002 atribui a Identity a responsabilidade por identidade autenticada, principal e contexto de identidade, sem transformar protocolo concreto de autenticação em regra de domínio. O VERO-CDM-001 distingue User, identidade, Tenant, Role e Permission e impede que autenticação seja confundida com autorização.

Sem uma fundação própria, a plataforma poderia confiar diretamente em claims, tokens, headers ou sessões; acoplar Domain a JWT/OIDC/NestJS; confundir usuário com principal; ou antecipar Access, User e persistência sem decisão aprovada.

## 2. Forças e requisitos

A decisão deve:

1. preservar Identity como owner de principal autenticado e contexto de identidade;
2. tratar credenciais, tokens, cookies, headers, certificados e metadados externos como evidência não verificada;
3. distinguir evidência recebida, identidade autenticada e autorização;
4. suportar principal humano e principal de serviço sem assumir que todo principal é um User;
5. manter Domain e Application independentes de NestJS, Fastify, Passport, JWT, OIDC e providers;
6. não persistir tokens, segredos ou material criptográfico;
7. não antecipar Access, Role, Permission, User, sessão ou lifecycle de credenciais;
8. permitir integração futura com Tenancy sem promover resolução a autorização;
9. minimizar dados pessoais e impedir vazamento de credenciais em logs e erros;
10. ser fiscalizável por API pública, testes de compilação, Nx, lint e cobertura.

## 3. Decisão

### 3.1 Propriedade e topologia

Após aprovação, poderá ser materializado o projeto Nx autônomo:

```text
packages/core/identity/
├── src/
│   ├── domain/
│   ├── application/
│   ├── public/
│   └── public-api.ts
├── test/
└── project.json
```

Somente diretórios com conteúdo real serão criados. O projeto terá owner `Core Platform — Identity`, superfície pública única e dependências explícitas.

### 3.2 Estados semânticos

Identity distinguirá obrigatoriamente:

- **AuthenticationEvidence:** material recebido de uma borda e ainda não confiável;
- **AuthenticatedPrincipal:** identidade confirmada por um autenticador confiável;
- **IdentityContext:** contexto imutável que carrega somente o principal autenticado e metadados mínimos aprovados;
- **AuthorizationDecision:** decisão pertencente exclusivamente à futura capacidade Access.

Autenticação comprova identidade conforme o mecanismo aplicável; não concede permissão e não autoriza uso de Tenant, Workspace, módulo ou operação.

### 3.3 Principal

`PrincipalId` será opaco, nominal, estável e imutável. Sua criação confiável ficará interna ao fluxo de autenticação. A API pública não aceitará valor bruto para promover identidade.

Identificadores externos nunca serão `PrincipalId`. Toda identidade autenticada preservará uma referência de sujeito qualificada pela autoridade autenticadora confiável — conceitualmente `authority + subject` — e a autoridade fará parte obrigatória do domínio de unicidade. `subject` isolado, e-mail, nome, claim ou identificador bruto de provider não será considerado globalmente único. Até que exista decisão específica sobre identidade interna canônica e identity linking, será proibida equivalência, vinculação ou mesclagem automática entre sujeitos emitidos por autoridades diferentes.

O principal terá um tipo mínimo explícito, inicialmente `human` ou `service`. Um principal humano não será automaticamente um `User`; a associação com User pertence a missão futura. Claims, e-mail, nome, roles e permissions não compõem sua identidade canônica.

### 3.4 Evidência e fronteira de confiança

Tokens bearer, cookies, API keys, certificados, headers, payloads e metadados de mensagens permanecerão evidência não verificada até validação por adapter autorizado.

`AuthenticationEvidence` será opaca, efêmera e minimizada. Não poderá expor o valor original por serialização, enumeração, inspeção, cópia, igualdade, `toString`, erros, snapshots, logs, métricas ou traces. Sua representação segura será sempre redigida. O núcleo não a persistirá nem prolongará sua retenção; adapters concretos deverão descartar referências assim que a validação terminar e aplicar limpeza explícita quando o runtime e o formato permitirem.

A porta `Authenticator` será agnóstica de protocolo e framework. A composição registrará somente adapters autorizados, mas registro ou implementação da porta não concederá capacidade de fabricar resultados confiáveis. A promoção de evidência validada para `PrincipalId`, `AuthenticatedPrincipal` e `IdentityContext` ocorrerá exclusivamente por factory/capability interna, não exportada e controlada por Identity. Implementações externas da interface, objetos estruturalmente compatíveis, casts e fixtures não adquirirão essa capability nem serão aceitos como prova de autenticação em fronteiras de runtime.

Adapters futuros poderão implementar OIDC, JWT validado, sessão, mTLS ou credencial de serviço somente após decisão de integração aplicável. Esta missão não seleciona IdP, algoritmo, issuer, audience, formato de token ou biblioteca concreta.

Nenhuma API pública poderá construir `AuthenticatedPrincipal` ou `IdentityContext` diretamente de evidência externa, implementar um autenticador que fabrique identidade confiável ou promover localmente um resultado estruturalmente compatível.

### 3.5 Contexto explícito

`IdentityContext` será imutável, mínimo e passado explicitamente em Domain e Application. Não acessará request, singleton global, container ou AsyncLocalStorage.

A observabilidade poderá transportar projeções técnicas minimizadas de `principalId` e `principalType`, quando permitido. Essa projeção não será fonte de autenticação nem autorização.

### 3.6 Integração com Tenancy

Identity e Tenancy permanecerão capacidades independentes. Identity não construirá `TenantId`; Tenancy não autenticará principal.

Uma composição futura poderá fornecer separadamente `IdentityContext` e `ResolvedTenantContext` à capacidade Access. Apenas uma decisão positiva de Access poderá produzir contexto autorizado ou capability equivalente. Nenhuma composição desta missão poderá liberar operação tenant-aware funcional.

### 3.7 Falhas e segurança

Serão definidos erros semânticos mínimos para evidência ausente, evidência inválida e falha de autenticação, sem códigos HTTP ou de broker.

Respostas externas futuras devem evitar enumeração de identidades e distinguir detalhes apenas internamente quando seguro. Tokens, chaves, certificados, claims completas, cookies e segredos nunca serão logados.

Comparações sensíveis, validação criptográfica, rotação, revogação, rate limiting e proteção contra replay pertencem aos adapters e decisões futuras correspondentes; não serão simuladas no núcleo.

### 3.8 Fora do escopo

Não serão implementados nesta missão:

- provider ou protocolo concreto de autenticação;
- controllers, guards, middleware ou decorators;
- emissão, renovação, revogação ou persistência de tokens;
- password hashing, MFA, recuperação de senha ou gestão de credenciais;
- cadastro, perfil ou lifecycle de User;
- Role, Permission, políticas ou decisões de Access;
- associação entre principal, Tenant, Organization ou Workspace;
- `AuthorizedTenantContext`;
- schemas Prisma, migrations, cache ou sessões;
- SSO, federação, SCIM ou administração de IdP.

### 3.9 Superfície pública mínima

A superfície poderá publicar somente:

- `AuthenticationEvidence` opaca e não confiável;
- `PrincipalId` e `AuthenticatedPrincipal` já autenticados, sem construção pública;
- `PrincipalType`;
- `IdentityContext` imutável;
- porta `Authenticator`;
- resultado de autenticação e erros semânticos indispensáveis.

Não serão exportados factories confiáveis, internals, fixtures, claims concretas, tipos de framework, DTOs de transporte, adapters, `User`, Role, Permission ou qualquer contexto autorizado.

### 3.10 Qualidade

O projeto terá threshold mínimo de 90% em statements, branches, functions e lines e deverá incluir:

- testes de opacidade, igualdade e imutabilidade;
- testes de principal humano e de serviço;
- testes de evidência ausente e inválida;
- testes que provem que autenticação não concede autorização;
- contratos de compilação contra promoção pública de evidência;
- testes de superfície pública e dependências proibidas;
- validação de ausência do valor original da evidência em serialização, inspeção, enumeração, cópia, igualdade, `toString`, snapshots, erros e telemetria;
- testes de compilação, superfície e runtime que rejeitem autenticadores externos, objetos literais, casts e fixtures como fabricantes de identidade confiável;
- testes que garantam a qualificação do sujeito por autoridade e proíbam equivalência automática entre autoridades distintas;
- CI completo da plataforma.

## 4. Alternativas consideradas

### 4.1 Implementar Access antes de Identity

Rejeitada. Access precisa avaliar um principal autenticado; usar claims ou IDs externos diretamente criaria uma fronteira de confiança insegura.

### 4.2 Tratar todo principal como User

Rejeitada. Serviços, integrações e automações também podem agir como principal. User possui lifecycle e semântica próprios.

### 4.3 Adotar JWT/OIDC no núcleo

Rejeitada. São mecanismos de borda e integração. O domínio deve permanecer agnóstico de provider e protocolo.

### 4.4 Unificar Identity, Access e Tenancy

Rejeitada. Mistura autenticação, autorização e isolamento, aumenta acoplamento e dificulta evolução e auditoria.

## 5. Consequências

### Positivas

- fecha a fronteira de confiança necessária para futuras composições;
- preserva separação entre autenticação, autorização e Tenancy;
- suporta pessoas e serviços sem antecipar User;
- evita acoplamento prematuro a IdP e protocolos;
- cria base testável para Access.

### Negativas

- nenhuma API funcional autenticada será exposta nesta missão;
- integração concreta permanecerá pendente de decisão sobre provider e transporte;
- Access continuará bloqueado até a aprovação e integração desta fundação.

### Riscos residuais

- consumers futuros confundirem principal autenticado com User;
- adapters concretos validarem tokens de forma incompleta;
- implementação incorreta da capability interna ou de sua fronteira de runtime;
- colisão ou vinculação indevida de sujeitos entre autoridades distintas;
- exposição indevida de evidência, identificadores ou claims em telemetria;
- composição futura unir Identity e Tenancy sem decisão positiva de Access.

## 6. Impacto e migração

A mudança é aditiva. Não há dados, APIs funcionais ou integrações existentes a migrar. `ContextMetadata.userId?: string` permanece projeção técnica agnóstica e não adquire autoridade semântica.

Após esta fundação, o próximo gate recomendado será Access e autorização contextual, com decisão própria sobre a composição segura de `IdentityContext` e `ResolvedTenantContext`.

## 7. Critérios de aceite da decisão

- [x] Nenhum conflito com Constituição, Blueprints, CDM, ADR-006 ou ADR-007.
- [x] Evidência, autenticação e autorização claramente separadas.
- [x] Principal não confundido com User.
- [x] Principal humano e de serviço contemplados.
- [x] Construção confiável inacessível pela superfície pública e protegida por capability interna em runtime.
- [x] Sujeito externo qualificado por autoridade, sem equivalência automática entre autoridades.
- [x] Evidência efêmera, não serializável, redigida e ausente de erros e telemetria.
- [x] Provider, protocolo, persistência e credenciais fora do escopo.
- [x] Integração com Tenancy preserva independência.
- [x] Segurança, minimização e observabilidade delimitadas.
- [x] Threshold e testes obrigatórios definidos.
- [x] Aprovação explícita do Arquiteto-Chefe.

## 8. Referências

- VERO-CONST-001 v1.0.0 — DDD, multi-tenancy, segurança, modularidade e governança;
- VERO-BLP-001 v0.1.0 — topologia, camadas, dependências e testes;
- VERO-BLP-002 v0.1.0 §§ 2, 5, 8–10, 18, 21–23 — Core, composição, contexto, segurança e conformidade;
- VERO-CDM-001 v0.1.0 — Identity, Tenant, User, Role e Permission;
- ADR-005 v1.0.0 — observabilidade e contexto técnico;
- ADR-006 v1.0.0 — Core Platform e Shared Kernel;
- ADR-007 v1.0.0 — Fundação de Tenancy;
- VERO-ENG-001 v1.1.0 — Engineering Playbook.

## 9. Histórico de revisões

| Versão | Data | Alteração | Estado |
|---|---|---|---|
| 1.0.0 | 2026-07-27 | Aprovado pelo Arquiteto-Chefe; autoriza a implementação controlada da MISSÃO 006 | Approved |
| 0.1.1 | 2026-07-27 | Fecha capability interna de confiança, escopo de autoridade do sujeito e ciclo seguro da evidência | Proposed |
| 0.1.0 | 2026-07-27 | Proposta inicial da Fundação de Identity e autenticação | Proposed |

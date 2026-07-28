# ADR-009 — Fundação de Access e Autorização

## Controle do documento

| Campo | Valor |
|---|---|
| Identificador | ADR-009 |
| Título | Fundação de Access — decisão contextual, negação por padrão e fronteira confiável |
| Versão | 1.0.0 |
| Estado | Approved |
| Data | 2026-07-28 |
| Autoridade de aprovação | Arquiteto-Chefe |
| Owner | Core Platform — Access |
| Branch | `agent/core-access-foundation` |
| Depende de | ADR-006, ADR-007 e ADR-008 |

## 1. Contexto

As MISSÕES 005 e 006 materializaram, respectivamente, `ResolvedTenantContext` e `IdentityContext`. O ADR-007 proíbe interpretar resolução de Tenant como autorização, e o ADR-008 estabelece que autenticação comprova identidade sem conceder permissão.

A plataforma precisa agora de uma capacidade própria para avaliar se um principal autenticado pode executar uma ação sobre um recurso em um Tenant resolvido. Sem essa fronteira, consumidores poderiam combinar contextos localmente, confiar em booleanos, roles ou claims, fabricar decisões positivas ou misturar regras empresariais com infraestrutura de autorização.

## 2. Forças e requisitos

A decisão deve:

1. combinar Identity e Tenancy sem transferir ownership ou autoridade;
2. negar por padrão, inclusive diante de dados ausentes, inválidos ou falhas;
3. distinguir pedido, avaliação e contexto autorizado;
4. rejeitar contextos e autorizações fabricados a partir de entradas externas;
5. representar ação e recurso de modo opaco, nominal e mínimo;
6. manter o núcleo independente de HTTP, NestJS, banco, provider e policy engine;
7. separar autorização de regras empresariais e lifecycle de Role/Permission;
8. produzir decisões mínimas sem expor dados sensíveis;
9. não usar logs, cache ou contexto global como fonte de autoridade;
10. ser verificável por testes unitários, de compilação, superfície e runtime.

## 3. Decisão

### 3.1 Propriedade e topologia

Após aprovação, poderá ser criado o projeto Nx autônomo `packages/core/access`, com owner `Core Platform — Access`, `public-api.ts` único, internals protegidos e dependências públicas explícitas somente de `core-identity` e `core-tenancy`.

### 3.2 Estados semânticos

Access distinguirá somente:

- **AuthorizationRequest:** pedido não decisório formado por identidade autenticada, Tenant resolvido, ação, recurso e contexto mínimo;
- **AuthorizedAccessContext:** contexto confiável produzido somente após decisão positiva e vinculado ao pedido avaliado;
- **AccessEvaluator:** porta mínima de avaliação configurada pela composition root.

Nenhum pedido, Role, Permission, claim, Tenant resolvido ou principal autenticado equivale isoladamente a autorização.

### 3.3 Ação, recurso e escopo

As referências de ação e recurso serão imutáveis, qualificadas por namespace e validadas. Não carregarão entidades, DTOs, modelos ORM ou payloads empresariais.

Cada referência usará nome qualificado e versionável sob namespace do módulo owner. Valores externos serão apenas candidatos sintaticamente validados; criar uma referência não cria Permission nem concede autoridade. Colisões, aliases silenciosos e equivalência entre namespaces distintos serão proibidos.

A decisão será vinculada ao principal, Tenant, ação e recurso exatos do pedido. Reuso para outro principal, Tenant, ação ou recurso será proibido. Organization e Workspace não serão inferidos nem autorizados nesta missão.

### 3.4 Composição de confiança

A API pública poderá receber somente `IdentityContext` autêntico e `ResolvedTenantContext` autêntico. A composição não promoverá nenhum dos dois: Access apenas os referencia durante a avaliação.

Objetos literais, casts, fixtures ou estruturas compatíveis não deverão adquirir autoridade em runtime. Access verificará as marcas/capabilities confiáveis já pertencentes aos módulos owners sem importar internals ou duplicar factories.

### 3.5 Avaliação e negação por padrão

A porta pública `AccessEvaluator` será agnóstica de framework e fornecedor. A composition root é a fronteira responsável por fornecer sua implementação aprovada; dados recebidos de HTTP, filas ou integrações nunca poderão selecionar ou substituir o evaluator.

Ausência de política aplicável, entrada inválida, exceção, resultado desconhecido ou falha de dependência produzirá negação segura. Deadline e cancelamento serão responsabilidade do adapter quando existir I/O.

Políticas serão determinísticas para a mesma entrada e contexto declarado. Efeitos colaterais, consulta oculta, mutação e acesso global serão proibidos no núcleo. Integrações que exijam I/O pertencerão a adapters futuros e deverão traduzir falhas para negação segura.

### 3.6 Fronteira confiável da autorização

Somente `core-access` produzirá `AuthorizedAccessContext` após validar os contextos de Identity e Tenancy e receber `allow` do evaluator configurado. Objetos literais, casts e resultados de adapters não serão aceitos como contexto autorizado.

O contexto autorizado será efêmero e destinado a uma única operação. O consumo será controlado em runtime; reuso, replay, serialização e cache serão proibidos nesta fundação. Qualquer cache futuro exigirá decisão própria.

Esta proteção evita fabricação acidental ou por entrada externa. Código arbitrário já executando dentro do mesmo processo e capaz de substituir a composition root está fora da fronteira de segurança do domínio e deve ser controlado por revisão, dependências e pipeline.

### 3.7 Roles, Permissions e regras empresariais

Role e Permission poderão futuramente alimentar políticas, mas seu cadastro, persistência, atribuição, herança e administração ficam fora desta missão.

Access decidirá autorização técnica/contextual. Invariantes empresariais continuam nos módulos proprietários e devem ser avaliadas mesmo após autorização positiva. `allow` não garante validade de domínio, existência do recurso, sucesso da operação ou licenciamento.

### 3.8 Auditoria e observabilidade

Cada avaliação terá razão segura e revisão da política, sem revelar credenciais ou dados pessoais desnecessários. Correlação técnica poderá ser transportada, mas logs, métricas e traces nunca serão fonte de decisão.

Auditoria persistente, retenção e trilhas regulatórias pertencem a missão futura. O núcleo apenas disponibilizará projeção mínima e redigida do resultado.

### 3.9 Fora do escopo

- JWT, OIDC, autenticação concreta e adapters de Identity;
- controllers, guards, middleware, decorators ou transporte;
- cadastro, lifecycle e persistência de Role e Permission;
- RBAC/ABAC completo ou policy engine concreto;
- User, Organization e Workspace;
- associação persistida entre principal e Tenant;
- Prisma, migrations, cache e banco;
- regras específicas de CRM, Financeiro ou outros módulos;
- licenciamento, feature flags, plano comercial ou entitlement;
- auditoria persistente e APIs funcionais.

### 3.10 Superfície pública mínima

Poderão ser publicados apenas:

- `AuthorizationRequest`;
- `AuthorizedAccessContext`;
- referências qualificadas de ação e recurso;
- porta `AccessEvaluator`;
- factory do authorizer para uso exclusivo da composition root;
- consumo único do contexto autorizado;
- erros semânticos seguros.

Fixtures, adapters, Role, Permission, modelos de provider e tipos de framework não serão exportados.

### 3.11 Qualidade

O projeto terá threshold mínimo de 90% nas quatro métricas e incluirá:

- negação por padrão para ausência, erro e resultado inválido;
- vínculo exato ao principal, Tenant, ação, recurso e revisão da política;
- ciclo efêmero e rejeição de fabricação, reuso e replay;
- rejeição de Identity/Tenancy forjados;
- prova de que autorização não substitui invariantes empresariais;
- contratos de compilação, superfície pública e dependências Nx;
- ausência de dados sensíveis em razões, erros e telemetria;
- CI completo da plataforma.

## 4. Alternativas consideradas

### 4.1 Autorizar diretamente por roles ou claims

Rejeitada. Claims e roles isolados não incluem contexto completo, política, recurso ou Tenant autorizado.

### 4.2 Unificar Access com Identity ou Tenancy

Rejeitada. Autenticação, resolução e autorização têm owners e garantias distintas.

### 4.3 Exportar um construtor público de contexto autorizado

Rejeitada. Permitiria que qualquer consumidor fabricasse autoridade.

### 4.4 Adotar agora um engine RBAC/ABAC

Rejeitada. Anteciparia provider, persistência e modelo administrativo antes dos casos de uso aprovados.

## 5. Consequências

### Positivas

- fecha a composição segura entre Identity e Tenancy;
- estabelece negação por padrão e autorização de uso único;
- preserva independência de frameworks e providers;
- cria base verificável para futuras APIs tenant-aware.

### Negativas

- não entrega autorização HTTP funcional;
- roles, permissions e políticas concretas permanecem pendentes;
- a composition root deverá fornecer um evaluator aprovado;

### Riscos residuais

- a composition root aceitar evaluator indevido;
- políticas empresariais serem indevidamente movidas para Access;
- consumidores tratarem `allow` como sucesso da operação;
- razões de decisão exporem detalhes sensíveis;
- cache futuro reutilizar decisão fora do escopo original.

## 6. Impacto e migração

A mudança é aditiva, com endurecimento da validação de `ResolvedTenantContext`. Identity e Tenancy permanecem owners de seus contextos. Esta é a última fundação genérica antes do desenvolvimento vertical do MVP do Santo Parma.

## 7. Critérios de aceite

- [x] Coerência com Constituição, Blueprints, CDM e ADR-006 a ADR-008.
- [x] Negação por padrão formalizada.
- [x] Entradas externas não fabricam contexto autorizado.
- [x] Vínculo exato entre pedido, avaliação e revisão da política.
- [x] Namespaces de ação/recurso e ciclo de uso único definidos.
- [x] Identity e Tenancy preservam ownership.
- [x] Regras empresariais permanecem nos módulos.
- [x] Superfície, testes e riscos definidos.
- [x] Aprovação explícita do Arquiteto-Chefe em 2026-07-28.

## 8. Referências

- VERO-CONST-001 v1.0.0;
- VERO-BLP-001 v0.1.0;
- VERO-BLP-002 v0.1.0;
- VERO-CDM-001 v0.1.0;
- ADR-005 v1.0.0;
- ADR-006 v1.0.0;
- ADR-007 v1.0.0;
- ADR-008 v1.0.0;
- VERO-ENG-001 v1.1.0.

## 9. Histórico de revisões

| Versão | Data | Alteração | Estado |
|---|---|---|---|
| 1.0.0 | 2026-07-28 | Aprova a segurança essencial e estabelece a transição para o MVP vertical | Approved |
| 0.1.1 | 2026-07-27 | Fecha promoção interna, namespaces de ação/recurso e ciclo antirreplay da decisão | Proposed |
| 0.1.0 | 2026-07-27 | Proposta inicial da Fundação de Access e autorização contextual | Proposed |

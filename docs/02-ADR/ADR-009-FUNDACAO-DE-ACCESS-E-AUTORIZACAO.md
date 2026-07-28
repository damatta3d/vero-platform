# ADR-009 — Fundação de Access e Autorização

## Controle do documento

| Campo | Valor |
|---|---|
| Identificador | ADR-009 |
| Título | Fundação de Access — decisão contextual, negação por padrão e fronteira confiável |
| Versão | 0.1.0 |
| Estado | Proposed |
| Data | 2026-07-27 |
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
3. distinguir pedido, avaliação, decisão e contexto autorizado;
4. impedir fabricação externa de decisões positivas;
5. representar ação e recurso de modo opaco, nominal e mínimo;
6. manter o núcleo independente de HTTP, NestJS, banco, provider e policy engine;
7. separar autorização de regras empresariais e lifecycle de Role/Permission;
8. produzir decisões explicáveis e auditáveis sem expor dados sensíveis;
9. não usar logs, cache ou contexto global como fonte de autoridade;
10. ser verificável por testes unitários, de compilação, superfície e runtime.

## 3. Decisão

### 3.1 Propriedade e topologia

Após aprovação, poderá ser criado o projeto Nx autônomo `packages/core/access`, com owner `Core Platform — Access`, `public-api.ts` único, internals protegidos e dependências públicas explícitas somente de `core-identity` e `core-tenancy`.

### 3.2 Estados semânticos

Access distinguirá:

- **AuthorizationRequest:** pedido não decisório formado por identidade autenticada, Tenant resolvido, ação, recurso e contexto mínimo;
- **AuthorizationDecision:** resultado imutável de `allow` ou `deny`, com razão segura e metadados mínimos;
- **AuthorizedAccessContext:** contexto confiável produzido somente após decisão positiva e vinculado ao pedido avaliado;
- **Policy/PolicyEvaluator:** contrato puro ou porta de avaliação, sem efeitos colaterais e sem implementação de fornecedor.

Nenhum pedido, Role, Permission, claim, Tenant resolvido ou principal autenticado equivale isoladamente a autorização.

### 3.3 Ação, recurso e escopo

`ActionRef` e `ResourceRef` serão opacos, nominais, imutáveis e validados. Não carregarão entidades, DTOs, modelos ORM ou payloads empresariais.

A decisão será vinculada ao principal, Tenant, ação e recurso exatos do pedido. Reuso para outro principal, Tenant, ação ou recurso será proibido. Organization e Workspace não serão inferidos nem autorizados nesta missão.

### 3.4 Composição de confiança

A API pública poderá receber somente `IdentityContext` autêntico e `ResolvedTenantContext` autêntico. A composição não promoverá nenhum dos dois: Access apenas os referencia durante a avaliação.

Objetos literais, casts, fixtures ou estruturas compatíveis não deverão adquirir autoridade em runtime. Access verificará as marcas/capabilities confiáveis já pertencentes aos módulos owners sem importar internals ou duplicar factories.

### 3.5 Avaliação e negação por padrão

A porta `AccessEvaluator` será agnóstica de framework e fornecedor. Ausência de política aplicável, entrada inválida, exceção, timeout, resultado desconhecido ou falha de dependência produzirá negação segura.

Políticas serão determinísticas para a mesma entrada e contexto declarado. Efeitos colaterais, consulta oculta, mutação e acesso global serão proibidos no núcleo. Integrações que exijam I/O pertencerão a adapters futuros e deverão traduzir falhas para negação segura.

### 3.6 Fronteira confiável da decisão

Implementar, simular ou substituir `AccessEvaluator` não concederá capacidade de fabricar `allow` ou `AuthorizedAccessContext`.

Decisões positivas serão criadas somente por capability/factory interna de Access após avaliação válida. Essa capability não será exportada. Decisões negativas poderão ser produzidas de forma segura sem conceder autoridade.

Uma decisão positiva terá integridade verificável em runtime e será inseparável do fingerprint semântico do pedido avaliado. Consumidores não poderão promover booleanos, strings, objetos estruturais ou resultados de adapters como autorização.

### 3.7 Roles, Permissions e regras empresariais

Role e Permission poderão futuramente alimentar políticas, mas seu cadastro, persistência, atribuição, herança e administração ficam fora desta missão.

Access decidirá autorização técnica/contextual. Invariantes empresariais continuam nos módulos proprietários e devem ser avaliadas mesmo após autorização positiva. `allow` não garante validade de domínio, existência do recurso, sucesso da operação ou licenciamento.

### 3.8 Auditoria e observabilidade

Cada decisão terá razão segura e código semântico estável, sem revelar política sensível, credenciais ou dados pessoais desnecessários. Correlação técnica poderá ser transportada, mas logs, métricas e traces nunca serão fonte de decisão.

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
- `AuthorizationDecision` somente para inspeção segura;
- `AuthorizedAccessContext` sem construção pública;
- `ActionRef` e `ResourceRef`;
- porta `AccessEvaluator`;
- razões/códigos de negação indispensáveis;
- erros semânticos seguros.

Factories confiáveis, internals, fixtures, decisões positivas construíveis, adapters, Role, Permission, modelos de provider e tipos de framework não serão exportados.

### 3.11 Qualidade

O projeto terá threshold mínimo de 90% nas quatro métricas e incluirá:

- negação por padrão para ausência, erro, timeout e resultado desconhecido;
- vínculo exato da decisão ao principal, Tenant, ação e recurso;
- rejeição de Identity/Tenancy forjados;
- rejeição de decisões positivas fabricadas por objetos, casts, fixtures ou adapters;
- prova de que implementar a porta não concede capability de `allow`;
- prova de que autorização não substitui invariantes empresariais;
- contratos de compilação, superfície pública e dependências Nx;
- ausência de dados sensíveis em razões, erros e telemetria;
- CI completo da plataforma.

## 4. Alternativas consideradas

### 4.1 Autorizar diretamente por roles ou claims

Rejeitada. Claims e roles isolados não incluem contexto completo, política, recurso ou Tenant autorizado.

### 4.2 Unificar Access com Identity ou Tenancy

Rejeitada. Autenticação, resolução e autorização têm owners e garantias distintas.

### 4.3 Exportar um construtor público de decisões

Rejeitada. Permitiria que qualquer consumidor fabricasse autoridade.

### 4.4 Adotar agora um engine RBAC/ABAC

Rejeitada. Anteciparia provider, persistência e modelo administrativo antes dos casos de uso aprovados.

## 5. Consequências

### Positivas

- fecha a composição segura entre Identity e Tenancy;
- estabelece negação por padrão e decisões confiáveis;
- preserva independência de frameworks e providers;
- cria base verificável para futuras APIs tenant-aware.

### Negativas

- não entrega autorização HTTP funcional;
- roles, permissions e políticas concretas permanecem pendentes;
- composição e adapters futuros exigirão decisões adicionais.

### Riscos residuais

- adapters concretos traduzirem falhas incorretamente;
- políticas empresariais serem indevidamente movidas para Access;
- consumidores tratarem `allow` como sucesso da operação;
- razões de decisão exporem detalhes sensíveis;
- cache futuro reutilizar decisão fora do escopo original.

## 6. Impacto e migração

A mudança é aditiva e não migra dados ou APIs funcionais. Identity e Tenancy permanecem owners de seus contextos. A aprovação deste ADR autorizará apenas a fundação descrita, não integrações concretas.

## 7. Critérios de aceite

- [ ] Coerência com Constituição, Blueprints, CDM e ADR-006 a ADR-008.
- [ ] Negação por padrão formalizada.
- [ ] Decisão positiva não fabricável externamente.
- [ ] Vínculo exato entre decisão e pedido.
- [ ] Identity e Tenancy preservam ownership.
- [ ] Regras empresariais permanecem nos módulos.
- [ ] Superfície, testes e riscos definidos.
- [ ] Aprovação explícita do Arquiteto-Chefe.

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
| 0.1.0 | 2026-07-27 | Proposta inicial da Fundação de Access e autorização contextual | Proposed |

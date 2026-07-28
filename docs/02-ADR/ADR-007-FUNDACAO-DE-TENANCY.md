# ADR-007 — Fundação de Tenancy

## Controle do documento

| Campo | Valor |
|---|---|
| Identificador | ADR-007 |
| Título | Fundação de Tenancy — identidade opaca, resolução confiável e contexto explícito |
| Versão | 1.0.0 |
| Estado | Approved |
| Data | 2026-07-27 |
| Autoridade de aprovação | Arquiteto-Chefe |
| Owner | Core Platform — Tenancy |
| Branch | `agent/core-tenancy-foundation` |

## 1. Contexto

A Sprint 0 entregou a fundação executável da VERO Platform sem capacidades funcionais do Core Platform. O VERO-CDM-001 define Tenant como a fronteira lógica primária de isolamento, segurança, autorização, configuração, dados e operação, e exige que toda operação tenant-aware possua Tenant resolvido e autorizado.

O ADR-006 autoriza a capacidade `tenancy`, mas reserva sua modelagem detalhada para decisão posterior. Esta decisão estabelece apenas a primeira fundação funcional: identidade opaca, resolução confiável, contexto explícito e propagação segura. Ciclo de vida do Tenant, autenticação, autorização, associação de usuários, persistência e estratégia física de isolamento permanecem fora do escopo.

Sem esta decisão, a implementação poderia confiar em headers controlados pelo cliente, confundir resolução com autorização, criar estado ambiente não controlado ou escolher silenciosamente formato, geração e persistência definitivos de identificadores.

## 2. Forças e requisitos

A decisão deve:

1. preservar Tenant como conceito proprietário de `packages/core/tenancy`;
2. impedir que dados externos não verificados se tornem contexto confiável;
3. distinguir explicitamente resolução de autorização;
4. tornar a ausência de Tenant uma condição observável e tratável;
5. evitar vazamento de contexto entre requisições, mensagens e tarefas assíncronas;
6. manter Domain e Application independentes de NestJS, Fastify, AsyncLocalStorage e providers;
7. não definir formato global, algoritmo de geração ou persistência de `TenantId`;
8. não antecipar Identity, Access, Organization, User ou Workspace;
9. permitir fiscalização por Nx, ESLint, testes arquiteturais e cobertura;
10. manter compatibilidade com o contexto técnico de observabilidade já existente.

## 3. Decisão

### 3.1 Propriedade e topologia

Será materializado o projeto Nx autônomo:

```text
packages/core/tenancy/
├── src/
│   ├── domain/
│   ├── application/
│   ├── public/
│   └── public-api.ts
├── test/
└── project.json
```

Somente diretórios com conteúdo real serão criados. O projeto terá owner `Core Platform — Tenancy`, tags Nx de Core/Domain e superfície pública única em `public-api.ts`.

### 3.2 TenantId

`TenantId` será um Value Object concreto e proprietário de Tenancy que encapsula um valor opaco previamente validado por uma fonte confiável.

Nesta missão:

- o valor será estável, comparável e imutável;
- o valor bruto não será aceito diretamente de HTTP, mensagens ou input de usuário;
- não será definido UUID, ULID, sequência, prefixo ou outro formato definitivo;
- não será implementado gerador global;
- não será incluído no Shared Kernel;
- serialização para fronteiras será explícita e mínima;
- logs e erros não revelarão credenciais nem evidências de autorização.

O encapsulamento não valida a autoridade da fonte. A confiança deve ser estabelecida antes da criação do identificador por um adapter autorizado.

A construção a partir do valor bruto não fará parte da superfície pública. O construtor ou factory capaz de promover um valor validado a `TenantId` permanecerá interno ao módulo e será invocável somente pelo fluxo de resolução confiável. Consumidores externos receberão `TenantId` já resolvido e não poderão promover um candidato por cast, construtor público ou factory pública. A serialização não fornecerá caminho de desserialização privilegiada.

### 3.3 Resolução e autorização

Resolução e autorização são estados distintos:

- **candidato de Tenant:** referência proveniente de uma borda e ainda não confiável;
- **Tenant resolvido:** identidade confirmada por fonte confiável;
- **Tenant autorizado:** Tenant resolvido cuja utilização foi permitida pelo mecanismo de Access aplicável.

A Missão 005 implementará somente contratos e comportamento de resolução. Um Tenant resolvido não habilita por si só uma operação tenant-aware. Enquanto Access não estiver materializado, nenhuma API funcional ou módulo empresarial poderá consumir a resolução como autorização.

### 3.4 Fronteira de confiança

Headers HTTP, query strings, cookies, payloads e metadados de mensagens controláveis por clientes são candidatos não confiáveis. Eles não podem criar `TenantId` nem `TenantContext` diretamente.

A superfície pública definirá uma porta de resolução. Adapters futuros poderão correlacionar candidatos com identidade autenticada, credenciais de serviço, sessão verificada, mTLS, token validado ou fonte administrativa aprovada. O adapter concreto e o protocolo de autenticação não fazem parte desta decisão.

Não será criado middleware que aceite `x-tenant-id` como verdade. Caso esse header seja usado futuramente como dica de seleção, ele continuará subordinado à validação e autorização.

### 3.5 Contexto explícito

O módulo publicará `ResolvedTenantContext`, contexto semântico imutável contendo apenas a identidade resolvida e metadados mínimos aprovados. O nome e o tipo deverão tornar explícito que resolução não representa autorização. O contexto:

- será passado explicitamente em Domain e Application;
- não acessará singleton global ou AsyncLocalStorage;
- não incluirá objetos de request, claims, tokens, headers ou providers;
- não representará autorização;
- falhará de forma explícita quando uma operação declarada tenant-aware não receber Tenant.

A plataforma de observabilidade poderá transportar uma projeção técnica do `tenantId` para correlação, mas não poderá criar, resolver ou autorizar Tenant. Metadados de observabilidade não são fonte de verdade semântica.

### 3.6 Concorrência e propagação

Toda execução deverá manter isolamento por unidade assíncrona. Contexto não poderá ser mutado, reutilizado como objeto global ou herdado implicitamente entre requisições, mensagens ou jobs não relacionados.

Na Missão 005, adapters de composição poderão produzir somente `ResolvedTenantContext`. Eles deverão iniciar escopo limpo, resolver a identidade por fonte confiável, projetar apenas metadados permitidos para logging e tracing e destruir o escopo ao concluir a execução.

Após a materialização de Access, uma composição futura deverá consumir separadamente o contexto resolvido e uma decisão positiva de autorização. Somente essa composição, sob contrato aprovado de Access, poderá produzir `AuthorizedTenantContext` ou capacidade equivalente para o caso de uso. Tenancy não criará, exportará nem simulará contexto autorizado nesta missão, e a ausência de Access impedirá a execução de APIs funcionais tenant-aware.

### 3.7 Erros e observabilidade

A fundação definirá erros semânticos mínimos para ausência, candidato inválido e falha de resolução, sem acoplar status HTTP ou códigos de broker.

Eventos de log e trace poderão registrar existência e identificador opaco quando a política permitir, mas nunca token, credencial, claim completa ou evidência sensível. Falhas de resolução devem ser distinguíveis de falhas de autorização.

### 3.8 Persistência e ciclo de vida

Não serão implementados nesta missão:

- Aggregate Root de Tenant;
- estados ativo, suspenso, desativado ou removido;
- repository, Prisma schema ou migrations;
- cadastro, provisionamento ou administração;
- associação com Organization, Workspace ou User;
- cache de resolução;
- eventos de domínio ou integração de Tenant;
- estratégia física de isolamento de dados.

Esses temas exigirão missão e decisão próprias antes da implementação.

### 3.9 Superfície pública mínima

A superfície poderá publicar somente:

- `TenantId` já resolvido, sem construção pública a partir de valor bruto;
- `ResolvedTenantContext`, imutável e semanticamente distinto de autorização;
- candidato opaco de resolução, sem transporte;
- porta de resolução;
- resultados e erros semânticos indispensáveis;
- funções puras que não promovam candidato ou valor bruto a identidade confiável.

Não serão exportados `AuthorizedTenantContext`, factory de promoção para `TenantId`, construtor confiável, internals, fixtures, tipos de framework, DTOs de transporte ou adapters concretos. A API pública deverá impedir, também em testes de compilação e de superfície, que consumidores contornem a porta de resolução.

### 3.10 Qualidade e cobertura

A primeira capacidade funcional estabelecerá threshold mínimo de 90% para statements, branches, functions e lines no projeto `core-tenancy`. O gate não substitui testes de comportamento, segurança e arquitetura.

Devem existir, no mínimo:

- testes de identidade, igualdade e imutabilidade;
- testes de contexto ausente e inválido;
- testes que provem a separação entre candidato, resolução e autorização;
- testes contra confiança direta em input externo;
- testes de compilação e superfície que provem a impossibilidade de construir `TenantId` ou contexto autorizado pela API pública;
- testes de isolamento entre execuções concorrentes quando houver adapter de propagação;
- fiscalização de `public-api.ts`, deep imports e dependências proibidas;
- CI completo da plataforma.

## 4. Alternativas consideradas

### 4.1 Confiar em `x-tenant-id`

Rejeitada. O cliente poderia selecionar arbitrariamente outro Tenant, produzindo risco crítico de acesso cruzado.

### 4.2 Resolver Tenant apenas em middleware global

Rejeitada. Acopla semântica de domínio ao transporte, incentiva estado ambiente e dificulta worker, mensagens e testes.

### 4.3 Colocar TenantId no Shared Kernel

Rejeitada. `TenantId` possui owner claro em Tenancy e o ADR-006 proíbe tenancy concreta no Shared Kernel.

### 4.4 Definir agora UUID ou ULID

Rejeitada nesta fase. O ADR-006 reserva formato e geração concretos; não há requisito aprovado que justifique antecipar a escolha.

### 4.5 Implementar resolução e autorização juntas

Rejeitada. Access possui responsabilidade própria e ainda não foi materializado. Misturar as capacidades ocultaria a diferença entre identidade confirmada e permissão concedida.

## 5. Consequências

### Positivas

- reduz risco de spoofing e acesso entre tenants;
- cria owner e linguagem explícita para Tenancy;
- preserva independência de transporte e framework;
- evita decisão prematura de formato, geração e persistência;
- fornece base testável para futuras missões de Identity e Access.

### Negativas

- nenhuma operação tenant-aware funcional poderá ser exposta antes da integração com Access;
- adapters concretos de resolução dependerão de decisões futuras de identidade/autenticação;
- algum código de composição será adiado deliberadamente.

### Riscos residuais

- uso incorreto do contexto resolvido como se fosse autorizado por consumidores futuros;
- vazamento de identificadores em logs sem política adequada;
- propagação incorreta em adapters assíncronos futuros;
- escolha posterior de formato incompatível com dados já persistidos, razão pela qual não haverá persistência nesta missão.

## 6. Impacto e migração

A mudança é aditiva. A Sprint 0 já possui `ContextMetadata.tenantId?: string` para correlação técnica; esse campo permanecerá como projeção agnóstica e não ganhará autoridade semântica. Nenhum dado ou API existente requer migração.

Antes do primeiro caso de uso tenant-aware, será obrigatória uma missão de Access que estabeleça o contrato de autorização e a composição segura entre resolução e decisão de acesso.

## 7. Critérios de aceite da decisão

- [x] Nenhum conflito com Constituição, Blueprint II, CDM ou ADR-006.
- [x] Estados candidato, resolvido e autorizado claramente separados.
- [x] `ResolvedTenantContext` não representa nem pode ser promovido localmente a autorização.
- [x] Construção confiável de `TenantId` inacessível pela superfície pública.
- [x] Header externo explicitamente não confiável.
- [x] Formato, geração, persistência e lifecycle mantidos fora do escopo.
- [x] Contexto semântico explícito e imutável.
- [x] Limite com observabilidade documentado.
- [x] Threshold de cobertura definido.
- [x] Riscos e sequência futura registrados.
- [x] Aprovação explícita do Arquiteto-Chefe.

## 8. Referências

- VERO-CONST-001 v1.0.0 — princípios de modularidade, multi-tenancy, segurança e governança;
- VERO-BLP-001 v0.1.0 — topologia, camadas e fiscalização de dependências;
- VERO-BLP-002 v0.1.0 — Core Platform, Shared Kernel, contexto e composição;
- VERO-CDM-001 v0.1.0 § 6.1 — Tenant;
- ADR-005 v1.0.0 — observabilidade e propagação de contexto;
- ADR-006 v1.0.0 §§ 3.1–3.4 — Core Platform e Shared Kernel;
- Engineering Playbook VERO-ENG-001 v1.1.0.

## 9. Histórico de revisões

| Versão | Data | Alteração | Estado |
|---|---|---|---|
| 0.1.0 | 2026-07-27 | Proposta inicial da fundação de Tenancy | Proposed |
| 0.1.1 | 2026-07-27 | Fecha separação entre contexto resolvido e autorizado e restringe criação confiável de TenantId | Proposed |
| 1.0.0 | 2026-07-27 | Aprovação explícita do Arquiteto-Chefe para implementação controlada | Approved |

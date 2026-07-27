# ADR-004 — Configuração Centralizada da VERO Platform

## Controle do documento

| Campo | Valor |
|---|---|
| Identificador | ADR-004 |
| Título | Configuração Centralizada — Environment, Validation, Secrets e Feature Flags |
| Versão | 0.2.0 |
| Estado | Proposed — aguardando revisão arquitetural |
| Data | 2026-07-27 |
| Autoridade de aprovação | Arquiteto-Chefe |
| Responsável pela materialização | Engenharia Oficial |
| Decisão estrutural | Sim |
| Depende de | ADR-001 e ADR-002 |
| Substitui | Nenhum ADR |

## 1. Contexto

A VERO executará múltiplos apps e adapters que precisam de configuração tipada, segura e reproduzível. Os Blueprints proíbem leitura dispersa de `process.env`, exigem validação anterior ao bootstrap, namespaces com owner, defaults seguros e segredos fora do repositório. Também reservam a escolha da biblioteca de schema, do secret store e do mecanismo de feature flags.

## 2. Problema

Definir um sistema centralizado que carregue, valide e distribua somente a configuração necessária a cada consumidor, sem expor segredos, criar singleton global irrestrito, misturar configuração técnica com regra de negócio ou acoplar o domínio a provider.

## 3. Decisão

Se aprovado, este ADR estabelece:

1. A configuração será carregada **uma única vez no bootstrap**, validada e convertida em objetos tipados e imutáveis antes de conexões ou portas de rede.
2. **Zod** será a biblioteca oficial de schema e validação de configuração na fundação.
3. **`@nestjs/config`** poderá participar da integração nos composition roots, mas não será contrato do Domain, Application ou Shared Kernel.
4. A fronteira de ambiente usará prefixo `VERO_`; internamente, valores serão organizados por namespaces com schema, owner e sensibilidade.
5. A precedência será:
   1. defaults seguros versionados;
   2. arquivo ou parâmetros não sensíveis do ambiente;
   3. variáveis de ambiente;
   4. secret store;
   5. override efêmero de teste, habilitado exclusivamente pelo test harness e rejeitado em qualquer ambiente não classificado como teste.
6. Valores obrigatórios ausentes ou inválidos bloquearão o startup com erro seguro, indicando chave lógica e regra violada sem revelar valor sensível.
7. `process.env` será lido somente pelo adapter de configuração no bootstrap.
8. Módulos receberão apenas seu recorte tipado, por token ou contrato explícito.
9. Arquivos `.env` reais e segredos nunca serão versionados; `.env.example` conterá somente nomes e exemplos não sensíveis.
10. Secrets serão obtidos por uma porta `SecretProvider` em Infrastructure. Na Sprint 0, environment poderá implementar a porta somente para desenvolvimento local; a seleção de secret store compartilhado ficará adiada. Valores secretos não serão copiados para objetos globais, serializados, enumerados em diagnóstico ou expostos a consumidores que não os declarem.
11. Feature flags serão acessadas por porta provider-agnostic, possuirão owner, tipo, default seguro, escopo e data de revisão.
12. A implementação inicial de feature flags será estática e derivada da configuração validada. Avaliação dinâmica, segmentação remota ou provider externo exigirão decisão posterior.
13. Feature flag não substituirá Permission, Policy, configuração de negócio, lifecycle ou regra de domínio.
14. Flags críticas falharão de forma segura e sua avaliação relevante será observável sem registrar dados sensíveis.
15. Mudança dinâmica de configuração não será suportada na Sprint 0.

## 4. Alternativas consideradas

### 4.1 Leitura direta de `process.env`

**Vantagem:** simplicidade local.

**Rejeição proposta:** espalha parsing, defaults e segredos, dificulta testes e viola os Blueprints.

### 4.2 Joi

**Vantagem:** integração histórica com NestJS.

**Rejeição proposta:** Zod oferece inferência TypeScript e composição de schemas adequada à baseline; uma única biblioteca evita validação concorrente.

### 4.3 class-validator para configuração

**Vantagem:** decorators familiares no NestJS.

**Rejeição proposta:** mistura classes/decorators com carregamento e não oferece a mesma composição funcional e inferência para configuração.

### 4.4 Configuração global irrestrita

**Vantagem:** acesso conveniente.

**Rejeição proposta:** oculta dependências e permite que qualquer módulo leia valores sem owner.

### 4.5 Secret store proprietário já na Sprint 0

**Vantagem:** integração antecipada com produção.

**Rejeição proposta:** o provider de ambientes compartilhados ainda não foi aprovado; a porta preserva substituibilidade sem escolha implícita.

### 4.6 Plataforma remota de feature flags

**Vantagem:** atualização dinâmica e segmentação.

**Rejeição proposta:** não há provider aprovado nem necessidade na Sprint 0; a porta permite evolução futura.

## 5. Impacto Arquitetural

A decisão cria uma fronteira única entre fontes externas e contratos internos de configuração. Zod e NestJS ficam restritos ao adapter/composition root. Secrets e flags são capacidades distintas, mesmo quando a implementação local usa variáveis validadas.

## 6. Componentes afetados

- bootstrap dos apps;
- package de configuration;
- schemas e loaders;
- composition roots e DI tokens;
- adapters de database, cache, messaging e observability;
- `.env.example`;
- testes de startup;
- CI e deploy;
- futura integração com secret store e feature flag provider.

## 7. Justificativa

A validação centralizada e tipada reduz estados inválidos e vazamento de segredos. Zod mantém schema e tipos próximos. Portas para secrets e flags evitam compromisso prematuro com fornecedores e protegem o domínio.

## 8. Consequências positivas

- falha rápida e segura no startup;
- tipos derivados de schemas;
- dependências de configuração explícitas;
- ausência de leitura ambiental dispersa;
- troca futura de secret store ou flag provider por adapter;
- testes determinísticos por override efêmero;
- menor risco de exposição de segredos.

## 9. Consequências negativas

- schemas exigem manutenção coordenada;
- Zod torna-se dependência estrutural da infraestrutura de configuração;
- configuração imutável exige restart para mudanças;
- abstrações de secrets e flags acrescentam código mesmo com provider local;
- erros de precedência podem ser difíceis de diagnosticar sem boa observabilidade.

## 10. Riscos

| Risco | Tratamento |
|---|---|
| Segredo em log ou erro | redaction e mensagens sem valor |
| Default inseguro | defaults explícitos e revisão |
| Namespace sem owner | catálogo e contrato por capacidade |
| Flag virar regra de negócio | proibição e revisão arquitetural |
| Tipo interno divergir do ambiente | inferência a partir do schema |
| Ambiente local divergir de produção | mesma pipeline de carga e validação |
| Provider remoto indisponível no futuro | defaults seguros e política fail-closed/fail-open por flag |

## 11. Impactos futuros

- A escolha do secret store de ambientes compartilhados exigirá ADR própria.
- Feature flags dinâmicas poderão adotar provider compatível com a porta.
- Configuração dinâmica, se necessária, será capacidade auditável separada.
- Schemas públicos de API/eventos não serão automaticamente validados por Zod; cada fronteira terá decisão e owner.
- Mudanças incompatíveis em nomes e semântica de configuração exigirão migração coordenada.

## 12. Critérios de revisão futura

- adoção de secret store compartilhado;
- necessidade comprovada de atualização sem restart;
- requisitos de segmentação e rollout de feature flags;
- limitações de segurança ou manutenção do Zod;
- múltiplos runtimes incapazes de consumir o mesmo modelo;
- mudança de estratégia de deployment ou configuração.

## 13. Constitution Traceability

- VERO-CONST-001-CH02 — segurança, configuração, observabilidade e evolução controlada;
- VERO-CONST-001-CH03 — tecnologias estruturais e governança de capacidades;
- VERO-CONST-001-CH05 — Core Platform, contracts e Dependency Inversion;
- VERO-CONST-001-CH06 — compatibilidade, migração e rastreabilidade.

## 14. Blueprint Traceability

- VERO-BLP-001 §§ 7.3, 8.2 e 13–14 — configuração, segredos e ambientes;
- VERO-BLP-001 §§ 15–16 e 20 — build, deploy e decisões reservadas;
- VERO-BLP-002 §§ 2, 5–7 e 23 — Configuration, DI, fluxo, namespaces e biblioteca reservada.

## 15. Referências

- [Constituição Arquitetural](../00-Constituicao-Arquitetural/README.md)
- [VERO-BLP-001 — Volume I](../01-Blueprint/VERO-BLP-001-VOLUME-I-VISAO-GERAL-E-ESTRUTURA-FISICA.md)
- [VERO-BLP-002 — Volume II](../01-Blueprint/VERO-BLP-002-VOLUME-II-CORE-PLATFORM-E-SHARED-KERNEL.md)
- [ADR-001](ADR-001-ARQUITETURA-GERAL.md)
- [ADR-002](ADR-002-RUNTIME-E-FRAMEWORK.md)

## 16. Histórico de revisões

| Versão | Data | Alteração | Estado |
|---|---|---|---|
| 0.1.0 | 2026-07-27 | Proposta inicial de configuração, secrets e feature flags | Proposed |
| 0.2.0 | 2026-07-27 | Restrição de overrides de teste e exposição de secrets por menor privilégio | Proposed |

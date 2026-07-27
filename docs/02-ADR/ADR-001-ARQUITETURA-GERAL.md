# ADR-001 — Arquitetura Geral da VERO Platform

## Controle do documento

| Campo | Valor |
|---|---|
| Identificador | ADR-001 |
| Título | Arquitetura Geral — Modular Monolith, Monorepo, Nx e pnpm |
| Versão | 1.0.0 |
| Estado | Approved |
| Data | 2026-07-27 |
| Autoridade de aprovação | Arquiteto-Chefe |
| Responsável pela materialização | Engenharia Oficial |
| Decisão estrutural | Sim |
| Substitui | Nenhum ADR |
| Substituído por | — |

## 1. Contexto

A VERO Platform precisa iniciar sua fundação técnica preservando modularidade, ownership, direção de dependências e capacidade de evolução. A Constituição determina uma arquitetura inicialmente modular, orientada por Domain-Driven Design e Clean Architecture. O Blueprint Volume I materializa uma única base de código governada, aplicações como composition roots, packages com responsabilidade explícita e fiscalização automatizada das fronteiras.

A plataforma ainda não possui evidência que justifique a complexidade operacional de microservices. Ao mesmo tempo, um monólito sem fronteiras permitiria acoplamento, acesso cruzado a dados e crescimento desordenado. A organização do repositório e o gerenciador de pacotes também precisam ser únicos para que o grafo, os comandos, o lockfile e os controles de qualidade sejam reproduzíveis.

## 2. Problema

Definir a arquitetura inicial e o modelo de organização do código de modo que:

- a implantação inicial permaneça simples;
- módulos sejam autônomos em semântica, contratos e dados;
- dependências proibidas e ciclos possam ser detectados;
- aplicações e bibliotecas sejam organizadas em uma única fonte oficial;
- builds, testes e tarefas sejam reproduzíveis;
- uma futura extração de serviços seja possível por evidência, sem ser antecipada.

## 3. Decisão

Se aprovado, este ADR estabelece:

1. A VERO Platform iniciará como **Modular Monolith**.
2. O código-fonte será mantido em um **monorepo único**.
3. **Nx** será o sistema oficial para modelar projetos, grafo, targets, cache e boundaries.
4. **pnpm** será o gerenciador oficial de pacotes e workspaces, com lockfile obrigatório e instalação congelada em CI.
5. Apps serão composition roots e unidades implantáveis; lógica reutilizável residirá em packages com owner e superfície pública.
6. Fronteiras modulares serão verificadas por tags Nx, ESLint, aliases, testes arquiteturais e revisão.
7. Deep imports, dependências circulares, imports de apps e acesso aos internals ou dados de outro módulo serão proibidos.
8. A modularidade será lógica e verificável mesmo quando API e workers compartilharem o mesmo repositório e release.
9. A extração futura para serviço independente exigirá evidência operacional ou organizacional e ADR específica.
10. Nx e pnpm são ferramentas de organização e execução; não podem definir o modelo de domínio nem criar compartilhamento sem owner.

## 4. Alternativas consideradas

### 4.1 Monólito tradicional sem boundaries

**Vantagem:** menor configuração inicial.

**Rejeição proposta:** não protege ownership, dependências ou superfícies públicas e contradiz a modularidade vinculante.

### 4.2 Microservices desde o início

**Vantagem:** implantação e escala independentes por serviço.

**Rejeição proposta:** introduz custo distribuído, consistência eventual, observabilidade e operação sem evidência de necessidade; violaria a evolução controlada.

### 4.3 Polyrepo

**Vantagem:** isolamento físico entre repositórios.

**Rejeição proposta:** fragmenta governança, refactors, contratos e evidências da fundação; não atende à topologia aprovada no Blueprint.

### 4.4 Monorepo sem Nx

**Vantagem:** menor dependência de ferramenta.

**Rejeição proposta:** exigiria construir manualmente grafo, affected commands, targets, cache e enforcement já previstos.

### 4.5 npm, Yarn ou Bun como gerenciador oficial

**Vantagem:** alternativas maduras ou rápidas.

**Rejeição proposta:** pnpm já integra a stack aprovada, oferece workspace e instalação determinística; múltiplos gerenciadores criariam lockfiles e fluxos concorrentes. Substituição futura requer ADR.

## 5. Impacto Arquitetural

A decisão define a unidade inicial de desenvolvimento e implantação, a topologia do repositório e o mecanismo de fiscalização das fronteiras. Ela não autoriza módulos de negócio nem determina que todos os processos devam permanecer para sempre na mesma unidade operacional.

## 6. Componentes afetados

- raiz do workspace;
- `apps/`;
- `packages/`;
- `infrastructure/`;
- `tests/`;
- `tools/`;
- configuração Nx;
- workspace e lockfile pnpm;
- CI e testes arquiteturais;
- políticas de imports e ownership.

## 7. Justificativa

O Modular Monolith combina simplicidade operacional inicial com separação semântica forte. Nx torna o grafo e as restrições verificáveis; pnpm fornece gerenciamento único e reproduzível. A combinação atende à arquitetura aprovada sem antecipar distribuição.

## 8. Consequências positivas

- menor complexidade operacional inicial;
- refactors e testes coordenados;
- uma única fonte para contratos e evidências;
- detecção automatizada de ciclos e dependências proibidas;
- builds incrementais e execução por projetos afetados;
- evolução futura baseada em fronteiras já explícitas;
- instalação determinística por lockfile.

## 9. Consequências negativas

- disciplina modular depende de controles contínuos;
- um monorepo pode aumentar o custo de build se o grafo for mal configurado;
- falhas de composição podem afetar múltiplos módulos;
- releases inicialmente coordenados reduzem independência de implantação;
- Nx e pnpm acrescentam conhecimento e configuração específicos.

## 10. Riscos

| Risco | Tratamento |
|---|---|
| Monólito virar estrutura acoplada | boundaries, testes arquiteturais, ownership e revisão |
| Shared packages virarem depósitos genéricos | critérios do ADR-006 e superfícies públicas mínimas |
| Grafo Nx não refletir fronteiras reais | tags, aliases e testes de ciclos obrigatórios |
| Cache mascarar validações críticas | CI limpa e execução integral periódica |
| Extração prematura de serviços | ADR e evidência antes de qualquer separação |
| Dependência excessiva do toolchain | configuração versionada e targets padronizados |

## 11. Impactos futuros

- API e workers poderão ser processos separados sem abandonar o Modular Monolith.
- Módulos candidatos a extração deverão possuir contrato, ownership e dados claramente delimitados.
- Mudança para microservices, polyrepo ou outro orquestrador de workspace substituirá este ADR.
- Estratégias de release independente para packages ou apps exigirão decisão posterior.

## 12. Critérios de revisão futura

Revisar este ADR quando ocorrer ao menos uma condição:

- necessidade comprovada de escala ou implantação independente;
- limites organizacionais tornarem o release coordenado inviável;
- Nx ou pnpm deixarem de atender segurança, compatibilidade ou manutenção;
- tempo de build não puder ser controlado com grafo e cache;
- um módulo demonstrar autonomia de dados, contrato, operação e ownership suficiente para extração.

## 13. Constitution Traceability

- VERO-CONST-001-CH02 — modularidade, monorepo e evolução arquitetural controlada;
- VERO-CONST-001-CH03 — ADR obrigatória para tecnologia estrutural e mudança de fronteira;
- VERO-CONST-001-CH05 — camadas, módulos, direção de dependências, contratos e ausência de ciclos;
- VERO-CONST-001-CH06 — mudança, compatibilidade, migração e rastreabilidade;
- VERO-CONST-001-CH07 — definições de Module, Bounded Context, Contract e Capability.

## 14. Blueprint Traceability

- VERO-BLP-001 §§ 2–5 — princípios, macroestrutura, apps e packages;
- VERO-BLP-001 §§ 9–11 — diretórios, imports e dependências;
- VERO-BLP-001 §§ 12 e 15 — testes, build e Nx;
- VERO-BLP-001 §§ 16–17 — implantação e versionamento coordenado;
- VERO-BLP-002 §§ 2–5 e 19 — Core, Shared Kernel, libraries, composição e dependências.

## 15. Referências

- [Constituição Arquitetural](../00-Constituicao-Arquitetural/README.md)
- [VERO-BLP-001 — Volume I](../01-Blueprint/VERO-BLP-001-VOLUME-I-VISAO-GERAL-E-ESTRUTURA-FISICA.md)
- [VERO-BLP-002 — Volume II](../01-Blueprint/VERO-BLP-002-VOLUME-II-CORE-PLATFORM-E-SHARED-KERNEL.md)
- [Canonical Domain Model](../03-Domain/VERO-CDM-001-CANONICAL-DOMAIN-MODEL.md)
- [Engineering Playbook](../99-Appendix/ENGINEERING_PLAYBOOK.md)

## 16. Histórico de revisões

| Versão | Data | Alteração | Estado |
|---|---|---|---|
| 0.1.0 | 2026-07-27 | Proposta inicial da arquitetura geral, monorepo e toolchain | Proposed |
| 0.2.0 | 2026-07-27 | Correção da topologia afetada para aderência ao VERO-BLP-001 | Proposed |
| 1.0.0 | 2026-07-27 | Decisão arquitetural revisada e aprovada formalmente pelo Arquiteto-Chefe | Approved |

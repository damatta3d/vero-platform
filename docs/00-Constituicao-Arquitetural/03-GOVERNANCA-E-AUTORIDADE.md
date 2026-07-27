# Governança Arquitetural

## Controle do documento

| Campo | Valor |
|---|---|
| Identificador | VERO-CONST-001-CH03 |
| Documento mestre | VERO-CONST-001 |
| Pacote | 5 — Governança Arquitetural |
| Versão | 0.7.0 |
| Estado | Approved — Pacote 5; emenda operacional do Pacote 7 materializada para revisão |
| Autoridade | Arquiteto-Chefe |
| Responsável pela materialização | Engenharia Oficial |
| Data | 2026-07-27 |

## 1. Objetivo

Estabelecer como a arquitetura da VERO Platform é protegida, interpretada, verificada e evoluída, definindo autoridade, responsabilidades, decisões, conformidade, exceções, governança documental e qualidade arquitetural.

## 2. Escopo

Este capítulo governa decisões e artefatos arquiteturais, revisões, evidências, contratos públicos, Shared Kernel e ciclo de vida dos módulos. O processo detalhado de evolução constitucional e versionamento pertence ao Pacote 6. Ferramentas, automações, métricas operacionais e mecanismos técnicos de fiscalização pertencem ao Blueprint e ao Engineering Playbook.

## 3. Diretrizes Normativas

### 3.1 Papéis e responsabilidades

- **Arquiteto-Chefe:** autoridade máxima sobre a arquitetura; aprova princípios, modelos, limites, ADRs estruturais, exceções e alterações constitucionais.
- **Engenharia Oficial:** analisa o estado existente, materializa decisões aprovadas, mantém rastreabilidade, implementa controles e apresenta evidências de conformidade.
- **Revisores:** avaliam aderência, riscos, contratos, segurança, operabilidade, testes e impactos, registrando parecer fundamentado e conflitos de interesse.
- **Responsáveis por módulos e contratos:** mantêm ownership, documentação, compatibilidade, depreciação, evidências e resposta a desvios.
- **Autores de mudanças:** apresentam contexto, alternativas, impactos, riscos, plano de migração e critérios verificáveis.

Nenhum papel pode aprovar unilateralmente uma mudança quando houver conflito de interesse não tratado. Delegações de revisão ou aprovação devem ser explícitas, limitadas e rastreáveis; a autoridade constitucional permanece com o Arquiteto-Chefe.

### 3.2 Processo de decisão e aprovação

Toda mudança arquitetural deve seguir, proporcionalmente ao impacto:

1. identificação do problema e do escopo;
2. análise do estado e dos documentos aplicáveis;
3. classificação da mudança;
4. proposta com alternativas, consequências e riscos;
5. ADR quando obrigatória;
6. revisão técnica e de conformidade;
7. decisão da autoridade competente;
8. atualização coordenada dos documentos e contratos afetados;
9. implementação com critérios de aceite;
10. registro de evidências, commit e comunicação do resultado.

Decisões rejeitadas, substituídas ou adiadas devem permanecer rastreáveis. Aprovação verbal ou informal não substitui registro persistente quando a decisão possui impacto arquitetural.

### 3.3 Obrigatoriedade de ADR

Uma ADR é obrigatória para:

- criação, divisão, fusão, extração ou encerramento de módulo;
- alteração de bounded context, ownership ou fronteira arquitetural;
- mudança de camada, direção de dependência ou padrão de comunicação;
- introdução ou substituição de tecnologia estrutural;
- alteração incompatível de API, evento ou contrato público;
- inclusão de conceito no Shared Kernel;
- alteração de estratégia de dados, multi-tenancy, segurança, integração, IA ou observabilidade;
- criação ou mudança relevante de engine ou componente do núcleo;
- exceção a princípio, regra obrigatória ou controle arquitetural;
- decisão com impacto transversal, alto custo de reversão ou risco material.

Correções editoriais, implementação interna compatível e decisões locais reversíveis podem dispensar ADR, desde que não alterem contratos, princípios, fronteiras ou atributos de qualidade.

### 3.4 Gestão de mudanças

Mudanças devem ser classificadas como editoriais, internas compatíveis, arquiteturais compatíveis, incompatíveis ou emergenciais. A classificação determina revisão, aprovação, versionamento, migração e evidências exigidas.

Mudanças emergenciais podem adotar rito abreviado somente para conter risco imediato. Devem possuir responsável, escopo, controles compensatórios e regularização documental posterior em prazo definido. O rito detalhado será formalizado no capítulo de Evolução e Gestão de Mudanças.

A Constituição deve ser revisada quando houver nova direção estratégica, conflito normativo recorrente, alteração estrutural transversal, requisito regulatório relevante ou evidência de que uma regra deixou de proteger os objetivos da plataforma.

### 3.5 Conformidade arquitetural

A conformidade deve ser demonstrável, não presumida. Toda unidade lógica deve produzir evidências proporcionais ao risco, incluindo quando aplicável:

- checklist de aderência;
- ADR e decisão aprovadas;
- matriz de dependências;
- contratos e schemas versionados;
- testes arquiteturais, de segurança e de compatibilidade;
- registros de revisão;
- telemetria, auditoria e critérios de aceite;
- plano e evidência de migração;
- registro de exceções e sua validade.

Revisões de conformidade devem ocorrer antes de mudanças estruturais, antes de releases relevantes e periodicamente sobre módulos, contratos e exceções ativas. Desvios devem ser classificados, possuir responsável, prazo e ação corretiva.

### 3.6 Tratamento de exceções

Uma exceção deve declarar regra afetada, justificativa, escopo, riscos, controles compensatórios, responsável, data de expiração, condição de encerramento e autoridade aprovadora. Exceções são temporárias, restritas e não criam precedente automático.

A validade máxima padrão de uma exceção é de 90 dias corridos ou até a release explicitamente indicada, prevalecendo o que ocorrer primeiro. Risco, requisito regulatório ou decisão aprovadora podem impor prazo menor. Renovação não é automática: exige nova análise de causa, risco, controles, plano de remoção e aprovação antes do vencimento.

Exceções expiradas são não conformidades. Exceções que contrariem a Constituição somente podem existir após aprovação formal do Arquiteto-Chefe e ADR correspondente; quando a mudança for permanente, a Constituição deve ser alterada pelo processo próprio.

### 3.7 Governança documental e precedência

Os documentos normativos possuem identificador, versão, estado, autoridade, histórico e relações rastreáveis. A precedência é:

1. Constituição Arquitetural;
2. Blueprint aprovado;
3. Canonical Domain Model aprovado;
4. ADRs vigentes;
5. documentos especializados e padrões;
6. implementação e artefatos operacionais.

Um documento inferior detalha, mas não pode contrariar, um documento superior. Em conflito, prevalece o documento superior e a divergência deve ser registrada. ADR não modifica silenciosamente a Constituição; mudança constitucional exige o rito próprio.

Documentos em Draft orientam elaboração e revisão, mas sua força normativa depende das partes formalmente aprovadas. Documentos Superseded permanecem preservados como histórico e apontam para seus sucessores.

### 3.8 Qualidade arquitetural

Revisões arquiteturais devem avaliar, no mínimo: alinhamento ao domínio, fronteiras, dependências, contratos, multi-tenancy, segurança, privacidade, observabilidade, resiliência, dados, operação, testabilidade, migração e reversibilidade.

Checklists antes de commit e merge são obrigatórios conforme o Engineering Playbook. A governança deve acompanhar, no mínimo:

- percentual de conformidade arquitetural;
- ADRs abertas, aprovadas e implementadas;
- contratos depreciados em coexistência;
- exceções arquiteturais ativas, próximas do vencimento e vencidas;
- tempo médio de regularização de mudanças emergenciais.

Cada indicador deve possuir owner, definição, fórmula, fonte, periodicidade, meta ou limite e evidência histórica. O Blueprint definirá mecanismos de coleta, painéis, baselines e limites operacionais. Métricas apoiam decisões, mas não substituem julgamento e aprovação.

### 3.9 Governança do Shared Kernel

Shared Kernel é o conjunto mínimo de conceitos, tipos e contratos cujo significado precisa ser idêntico entre múltiplos bounded contexts. Seu uso é permitido somente quando:

- a semântica é realmente compartilhada e estável;
- duplicação independente criaria inconsistência material;
- existe ownership explícito e processo de mudança coordenado;
- consumidores aceitam seu ciclo de versão e compatibilidade.

Ele deve ser evitado para utilitários genéricos, modelos de persistência, DTOs de conveniência, regras específicas, dependências tecnológicas ou atalhos entre módulos. Toda inclusão ou alteração sem compatibilidade exige ADR e aprovação arquitetural.

### 3.10 Criação e evolução de módulos

Um domínio merece módulo próprio quando possui responsabilidade coesa, linguagem e regras identificáveis, ownership de dados e contratos, ciclo de mudança distinguível e fronteira que reduz acoplamento. A decisão deve considerar valor, complexidade, autonomia, consistência, segurança e custo operacional.

Não se deve criar módulo apenas por entidade, tabela, tela, equipe, tecnologia ou antecipação de escala. Todo novo módulo exige proposta de fronteira, classificação, dependências, contratos, eventos, dados, tenant, segurança, observabilidade, testes e ADR aprovada.

### 3.11 Depreciação de módulos

A depreciação deve possuir responsável, justificativa, inventário de consumidores, sucessor ou estratégia de encerramento, comunicação, compatibilidade, migração, prazo, telemetria e critérios de remoção. Um módulo não pode ser removido enquanto consumidores ativos ou obrigações de dados, auditoria e retenção não estiverem tratados.

Mudanças de ownership, fusões e extrações seguem a mesma governança e devem preservar contratos e histórico.

### 3.12 Ciclo de vida de contratos públicos

APIs e eventos são produtos versionados com ownership explícito. Seu ciclo de vida deve incluir Draft, Review, Active, Deprecated e Retired, ou estados equivalentes definidos no Blueprint.

Contratos publicados são imutáveis em sua versão. Mudanças incompatíveis exigem nova versão, estratégia de coexistência, comunicação, janela de migração, observabilidade de uso e critérios de retirada. Eventos históricos devem continuar interpretáveis durante o período de retenção e replay aplicável.

## 4. Regras Obrigatórias

1. O Arquiteto-Chefe é a autoridade final sobre a arquitetura e a Constituição.
2. Mudanças estruturais e exceções arquiteturais exigem ADR e aprovação formal.
3. Nenhuma decisão pode contrariar a Constituição por meio de documento inferior ou implementação.
4. Toda mudança deve possuir responsável, impacto, decisão, evidências e rastreabilidade proporcionais ao risco.
5. Revisões devem registrar pareceres, ressalvas e conflitos de interesse.
6. A conformidade deve ser verificável por documentos, testes, contratos, telemetria ou auditoria.
7. Exceções devem ser temporárias, aprovadas, rastreáveis e possuir expiração.
8. Documentos normativos devem possuir ciclo de vida, versionamento e histórico próprios.
9. Shared Kernel deve permanecer mínimo, estável, governado e livre de conveniências técnicas.
10. Novo módulo exige fronteira de domínio justificável e ADR aprovada.
11. Nenhum módulo pode ser removido sem migração, tratamento de consumidores e preservação das obrigações.
12. APIs e eventos públicos devem possuir ownership, versão, estado e política de compatibilidade.
13. Versões publicadas de contratos são imutáveis.
14. Checklists e revisões arquiteturais são obrigatórios nos gates definidos.
15. Não conformidades devem possuir classificação, responsável, prazo e ação corretiva.
16. Aprovação informal não substitui registro persistente.
17. O Blueprint deve detalhar os mecanismos desta governança sem flexibilizar suas normas.
18. O Pacote 6 deve completar o rito de evolução, versionamento e gestão de mudanças sem duplicar este capítulo.

## 5. Justificativa Arquitetural

A governança protege coerência sem impedir evolução. Papéis claros, decisões persistentes, evidências proporcionais e ciclos de vida explícitos reduzem deriva arquitetural, mudanças incompatíveis, acoplamento acidental e dependência de conhecimento tácito.

## 6. Impactos na Plataforma

- **Engenharia:** mudanças passam por gates, checklists e evidências proporcionais.
- **Módulos:** fronteiras, ownership, criação, fusão e encerramento tornam-se decisões governadas.
- **Contratos:** APIs e eventos ganham estados, compatibilidade, depreciação e retirada controladas.
- **Shared Kernel:** compartilhamento passa a exigir necessidade semântica e ownership.
- **Segurança e operação:** riscos, exceções, auditoria e correções possuem responsáveis e prazos.
- **Documentação:** precedência, ciclo de vida e conflitos tornam-se explícitos.
- **Qualidade:** métricas e testes arquiteturais apoiam fiscalização contínua.

## 7. Referências Cruzadas

- [Fundamentos e Escopo](01-FUNDAMENTOS-E-ESCOPO.md);
- [Princípios Arquiteturais](02-PRINCIPIOS-ARQUITETURAIS.md);
- [Missão, Visão e Valores](04-MISSAO-VISAO-E-VALORES.md);
- [Modelo Arquitetural](05-MODELO-ARQUITETURAL.md);
- [Evolução e Gestão de Mudanças](06-EVOLUCAO-E-GESTAO-DE-MUDANCAS.md);
- [Glossário e Consolidação](07-GLOSSARIO-E-CONSOLIDACAO.md);
- [Desdobramentos para o Blueprint](DESDOBRAMENTOS-PARA-O-BLUEPRINT.md);
- [Engineering Playbook](../99-Appendix/ENGINEERING_PLAYBOOK.md).

O Blueprint deverá detalhar gates, papéis operacionais, automações, evidências, catálogo de ownership, Shared Kernel, ciclo de módulos, ciclo de contratos, métricas e testes. O Pacote 6 formaliza o processo constitucional de evolução, versionamento e mudanças.

## 8. Histórico do Capítulo

| Versão | Data | Alteração | Estado |
|---|---|---|---|
| 0.1.0 | 2026-07-27 | Autoridade, responsabilidade da Engenharia, inconsistências, mudança arquitetural e proteção documental publicadas no Pacote 1 | Aprovado no contexto do Pacote 1 |
| 0.5.0 | 2026-07-27 | Governança ampliada com papéis, ADRs, conformidade, exceções, precedência, qualidade, Shared Kernel, módulos e contratos | Aprovado no contexto do Pacote 5 |
| 0.7.0 | 2026-07-27 | Prazo máximo para exceções temporárias e indicadores mínimos de governança materializados | Draft para revisão no Pacote 7 |

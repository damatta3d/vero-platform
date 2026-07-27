# Evolução e Gestão de Mudanças

## Controle do documento

| Campo | Valor |
|---|---|
| Identificador | VERO-CONST-001-CH06 |
| Documento mestre | VERO-CONST-001 |
| Pacote | 6 — Evolução e Gestão de Mudanças |
| Versão | 0.6.0 |
| Estado | Approved — Pacote 6 |
| Autoridade | Arquiteto-Chefe |
| Responsável pela materialização | Engenharia Oficial |
| Data | 2026-07-27 |

## 1. Objetivo

Estabelecer como a VERO Platform evolui de forma contínua, controlada, compatível e rastreável, definindo o ciclo completo das mudanças, a criticidade das decisões, o versionamento dos artefatos, as políticas de compatibilidade, depreciação, migração e remoção.

## 2. Escopo

Este capítulo governa mudanças na Constituição, no Blueprint, nos ADRs, no Canonical Domain Model, nos módulos, nas APIs, nos eventos, nos contratos, nos dados e na implementação. Papéis, autoridade, conformidade e exceções são definidos no capítulo de Governança Arquitetural. Ferramentas, pipelines, matrizes operacionais, formatos de contrato e mecanismos de automação serão detalhados no Blueprint e no Engineering Playbook.

## 3. Diretrizes Normativas

### 3.1 Evolução arquitetural contínua e controlada

A arquitetura deve evoluir quando houver necessidade estratégica, de domínio, regulatória, operacional, tecnológica ou de qualidade demonstrável. Toda evolução deve preservar os princípios constitucionais, a coerência entre documentos, a independência do domínio, as fronteiras modulares e os atributos de qualidade.

Novas capacidades somente podem ser introduzidas quando possuírem problema ou resultado esperado explícito, owner, fronteira, impactos, contratos, requisitos de tenant, segurança, observabilidade, operação, migração e critérios verificáveis. Complexidade especulativa, duplicação sem justificativa e dependência estrutural sem ownership são vedadas.

Mudanças devem ser preferencialmente incrementais, reversíveis e observáveis. A reversibilidade técnica não elimina a necessidade de governança quando houver impacto arquitetural.

### 3.2 Tipos de mudança

As mudanças são classificadas como:

- **Editorial:** corrige forma, clareza ou referência sem alterar significado normativo ou comportamento;
- **Interna compatível:** altera implementação sem modificar contratos públicos, fronteiras ou comportamento observável incompatível;
- **Arquitetural compatível:** adiciona ou evolui capacidade preservando princípios, consumidores e contratos vigentes;
- **Incompatível:** remove, substitui ou altera comportamento, semântica, estrutura ou contrato de forma não retrocompatível;
- **Emergencial:** contém risco imediato de segurança, integridade, disponibilidade, conformidade ou continuidade operacional.

A classificação deve considerar o efeito real, não o tamanho aparente da alteração. Uma mudança pequena de código pode ser arquitetural ou incompatível.

### 3.3 Fluxo de solicitação e decisão

Toda mudança governada deve seguir:

1. solicitação com motivação, problema, escopo e owner;
2. identificação dos artefatos, módulos, contratos, dados e consumidores afetados;
3. classificação do tipo de mudança e da criticidade da decisão;
4. análise de alternativas, impactos, riscos, compatibilidade e reversibilidade;
5. elaboração ou atualização de ADR quando exigida;
6. definição de versão, coexistência, migração, comunicação e rollback;
7. revisão técnica, arquitetural, de segurança, operação e conformidade conforme o risco;
8. aprovação pela autoridade competente;
9. implementação incremental com critérios de aceite e evidências;
10. validação de contratos, dados, testes, telemetria, segurança e migração;
11. atualização coordenada de documentos, catálogos, changelogs e releases;
12. encerramento com decisão, evidências, pendências e resultado rastreáveis.

Mudanças rejeitadas, substituídas, adiadas ou revertidas devem manter seu registro e a justificativa correspondente.

### 3.4 Avaliação de impacto

A análise deve abranger, quando aplicável:

- objetivos empresariais, atores e capacidades;
- bounded contexts, módulos, camadas e dependências;
- Shared Kernel, APIs, eventos, schemas e integrações;
- dados, retenção, migração, replay e auditoria;
- multi-tenancy, identidade, permissões, segurança e privacidade;
- desempenho, disponibilidade, resiliência, escalabilidade e custos;
- observabilidade, operação, suporte, deployment e rollback;
- consumidores internos e externos;
- documentação, testes, treinamento e comunicação;
- reversibilidade, janela de coexistência e custo de retirada.

Impacto desconhecido deve ser tratado como risco, receber owner e ser reduzido antes da aprovação ou coberto por controle compensatório formal.

### 3.5 Níveis de criticidade das decisões e ADRs

As decisões são classificadas em:

| Nível | Alcance típico | Rigor mínimo |
|---|---|---|
| Crítica | Constituição, núcleo, segurança estrutural, multi-tenancy ou toda a plataforma | ADR obrigatória, análise transversal, plano de migração e rollback, aprovação expressa do Arquiteto-Chefe |
| Estratégica | Múltiplos módulos, contratos públicos compartilhados, engines ou capacidades de plataforma | ADR obrigatória, revisão pelos owners afetados e aprovação arquitetural |
| Tática | Um módulo, bounded context ou integração com impacto arquitetural delimitado | ADR quando alterar fronteira, contrato, dado ou atributo de qualidade; aprovação do owner e revisão arquitetural |
| Local | Implementação interna, compatível e reversível, sem impacto arquitetural | Registro técnico proporcional; ADR dispensável se os critérios de dispensa forem demonstrados |

A criticidade deve ser elevada quando houver dúvida relevante, impacto transversal, alta irreversibilidade, risco regulatório ou potencial de breaking change. Fracionar uma decisão para reduzir artificialmente sua criticidade é vedado.

### 3.6 Mudanças emergenciais

Mudança emergencial pode usar rito abreviado apenas para conter risco imediato. Antes da execução, quando viável, deve registrar incidente, owner, escopo, risco e rollback. Após a contenção, deve:

1. produzir evidências da mudança e do resultado;
2. avaliar impactos e incompatibilidades;
3. regularizar ADR, documentos, versões e contratos exigidos;
4. definir correções permanentes e controles preventivos;
5. obter revisão e aprovação retrospectiva no prazo estabelecido pela governança.

O rito emergencial não autoriza bypass permanente da Constituição nem legitima mudança estrutural não revisada.

### 3.7 Versionamento

Cada documento mestre, módulo e contrato possui ciclo de vida e versão independentes, relacionados por rastreabilidade e releases.

- **Documentos normativos:** usam Semantic Versioning; major altera norma de forma incompatível, minor acrescenta norma compatível e patch corrige conteúdo sem alterar significado.
- **Módulos:** possuem versão ou estado de release identificável; mudanças incompatíveis exigem plano de migração e coordenação com consumidores.
- **APIs:** versões publicadas são imutáveis; mudanças aditivas compatíveis podem permanecer na versão vigente quando não alterarem semântica; breaking changes exigem nova versão pública.
- **Eventos:** nome, semântica, envelope e schema publicados são imutáveis na versão; mudanças incompatíveis exigem novo tipo ou nova versão e coexistência controlada.
- **Contratos e schemas:** devem declarar owner, versão, estado, compatibilidade e consumidores conhecidos.
- **Releases:** devem relacionar versões de documentos, módulos, contratos, migrações e ADRs, sem obrigar que todos compartilhem o mesmo número.

Versão não substitui estado documental ou de ciclo de vida. Draft, Review, Active, Deprecated, Retired e Superseded devem ser registrados separadamente quando aplicáveis.

### 3.8 Política de compatibilidade

Compatibilidade retroativa é o padrão para APIs, eventos, dados e integrações. Uma mudança é compatível somente quando consumidores conformes continuam operando sem alteração obrigatória e a semântica previamente publicada permanece válida.

São potencialmente incompatíveis, entre outros: remoção ou renomeação de campo; mudança de tipo, obrigatoriedade, significado, cardinalidade, unidade, regra de autorização, código de erro, ordenação garantida ou comportamento temporal; restrição de valor antes aceito; alteração de identidade, chave ou tenant; mudança de semântica de evento.

Alterações aditivas também exigem análise: novos campos obrigatórios para produtores, novos valores não tolerados por consumidores ou aumento material de volume podem quebrar compatibilidade.

Testes de contrato e validação de schema devem verificar compatibilidade. Exceções exigem ADR, aprovação, comunicação, coexistência e migração.

### 3.9 Depreciação, comunicação e remoção

Toda depreciação deve declarar:

- item, versão e owner;
- motivo e sucessor recomendado;
- consumidores conhecidos e impacto;
- data de anúncio, janela de migração e data mínima de retirada;
- canais de comunicação e suporte;
- telemetria de adoção e critérios de conclusão;
- tratamento de dados, auditoria, retenção e replay;
- plano de rollback ou contingência.

Breaking changes devem ser comunicadas antes da retirada, com alcance e prazo proporcionais à criticidade. A remoção somente pode ocorrer quando os critérios publicados forem atendidos, consumidores ativos forem tratados e as obrigações de dados e auditoria estiverem preservadas.

Prazos mínimos específicos serão definidos por classe de contrato no Blueprint; reduções excepcionais exigem justificativa e aprovação formal.

### 3.10 Migração e coexistência

Migrações devem ser planejadas como parte da mudança, não como atividade posterior. Devem definir estado de origem e destino, transformação, validação, compatibilidade temporária, ordem de execução, rollback, observabilidade, owner e critérios de encerramento.

Quando necessário, versões antiga e nova devem coexistir por período definido. Estratégias como expand-and-contract, dual read/write, adaptadores e tradução de eventos podem ser usadas quando aprovadas e detalhadas no Blueprint ou ADR correspondente.

Migrações de dados devem preservar integridade, tenant, autorização, auditabilidade e capacidade de reconciliação. Nenhuma migração é concluída apenas porque o deployment terminou.

### 3.11 Validação e conclusão

Uma mudança somente está concluída quando:

- a decisão e as aprovações estão registradas;
- os artefatos afetados estão atualizados e coerentes;
- critérios de aceite, compatibilidade e segurança foram validados;
- testes e evidências exigidos foram produzidos;
- telemetria confirma o comportamento esperado durante a janela definida;
- migração, comunicação e rollback foram tratados;
- pendências, exceções e riscos residuais possuem owner e prazo;
- changelog, release e rastreabilidade foram atualizados.

Falha de validação deve interromper a progressão, acionar rollback ou gerar exceção formal conforme risco e plano aprovado.

### 3.12 Rastreabilidade ponta a ponta

Cada mudança arquitetural deve permitir navegar, conforme aplicável, entre:

**Constituição → Blueprint → ADR → Canonical Domain Model → requisito/backlog → código → contrato/schema → teste → evidência → release → telemetria/incidente.**

Os vínculos devem usar identificadores persistentes. Uma release deve informar quais decisões, contratos, migrações e documentos materializa. Uma alteração de código não pode ser a única evidência de uma decisão arquitetural.

## 4. Regras Obrigatórias

1. Toda evolução deve preservar a Constituição ou alterá-la pelo rito formal.
2. Nova capacidade exige necessidade explícita, owner, impactos, contratos e critérios verificáveis.
3. Toda mudança governada deve ser classificada por tipo e criticidade.
4. ADR Crítica ou Estratégica exige aprovação arquitetural formal.
5. ADR Tática é obrigatória quando houver alteração de fronteira, contrato, dado ou atributo de qualidade.
6. Decisão Local somente dispensa ADR quando for interna, compatível, reversível e sem impacto arquitetural.
7. A análise de impacto deve abranger consumidores e efeitos transitivos conhecidos.
8. APIs, eventos e schemas publicados são imutáveis em sua versão.
9. Breaking change exige nova versão pública, ADR, coexistência ou migração e comunicação prévia.
10. Compatibilidade deve ser demonstrada por critérios e testes, não presumida.
11. Toda depreciação exige owner, sucessor ou encerramento, prazo, consumidores, telemetria e critérios de retirada.
12. Nenhum contrato, módulo ou dado pode ser removido enquanto obrigações e consumidores ativos não estiverem tratados.
13. Migrações devem possuir validação, observabilidade, rollback e critérios de conclusão.
14. Mudança emergencial deve ser regularizada e revisada após a contenção.
15. Versões de documentos, módulos e contratos são independentes e devem ser ligadas à release por rastreabilidade.
16. Fracionamento artificial para reduzir criticidade ou evitar aprovação é vedado.
17. Uma mudança somente termina com documentação, evidências e rastreabilidade atualizadas.
18. O Blueprint deve detalhar mecanismos e prazos sem reduzir as garantias deste capítulo.

## 5. Justificativa Arquitetural

Evolução sem controle gera deriva, incompatibilidades silenciosas e dependência de conhecimento tácito. Um processo proporcional ao risco permite mudança contínua sem sacrificar coerência, segurança, consumidores, histórico e capacidade de operar ou reverter a plataforma.

## 6. Impactos na Plataforma

- **Governança:** decisões recebem criticidade, rito e evidências proporcionais.
- **Engenharia:** toda mudança relevante passa a incluir impacto, compatibilidade, migração e conclusão verificável.
- **Módulos:** evolução, coexistência, extração e retirada tornam-se controladas.
- **APIs e eventos:** contratos publicados ganham garantias explícitas de imutabilidade, versionamento e depreciação.
- **Dados:** migrações preservam integridade, tenant, reconciliação, auditoria e retenção.
- **Operação:** rollout, rollback, telemetria e incidentes passam a integrar a decisão.
- **Documentação:** Constituição, Blueprint, ADRs, código e releases mantêm vínculos persistentes.
- **Consumidores:** breaking changes exigem comunicação e janela de migração.

## 7. Referências Cruzadas

- [Princípios Arquiteturais](02-PRINCIPIOS-ARQUITETURAIS.md);
- [Governança Arquitetural](03-GOVERNANCA-E-AUTORIDADE.md);
- [Modelo Arquitetural](05-MODELO-ARQUITETURAL.md);
- [Desdobramentos para o Blueprint](DESDOBRAMENTOS-PARA-O-BLUEPRINT.md);
- [Histórico de Revisões](HISTORICO-DE-REVISOES.md);
- [Engineering Playbook](../99-Appendix/ENGINEERING_PLAYBOOK.md).

O Blueprint deverá detalhar o workflow operacional de mudanças, gates por criticidade, templates, matrizes de impacto, políticas mensuráveis de compatibilidade, janelas por classe de contrato, mecanismos de migração, automação de testes e modelo técnico de rastreabilidade.

## 8. Histórico do Capítulo

| Versão | Data | Alteração | Estado |
|---|---|---|---|
| 0.6.0 | 2026-07-27 | Processo de evolução, gestão de mudanças, criticidade de ADRs, versionamento, compatibilidade, depreciação, migração e rastreabilidade materializados | Aprovado no contexto do Pacote 6 |

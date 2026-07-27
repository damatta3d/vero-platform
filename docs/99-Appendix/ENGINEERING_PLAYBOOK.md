# Engineering Playbook — VERO Platform

## Controle do documento

| Campo | Valor |
|---|---|
| Versão | 1.0.0 |
| Estado | Ativo |
| Data | 2026-07-27 |
| Escopo | Engenharia e assistentes de IA |

## 1. Objetivo

Este playbook define o modo de trabalho da Engenharia Oficial da VERO Platform. A arquitetura é definida pelo Arquiteto-Chefe; a Engenharia materializa decisões aprovadas no repositório com disciplina, rastreabilidade, qualidade e versionamento.

## 2. Fonte oficial

O repositório `damatta3d/vero-platform` é a fonte oficial da documentação materializada e do software. Documentos aprovados não devem permanecer somente em conversas.

## 3. Padrões de documentação

- Usar Markdown para documentação textual.
- Manter cada assunto no diretório oficial correspondente.
- Incluir título, propósito, escopo e versão em documentos normativos.
- Usar links relativos entre documentos do repositório.
- Atualizar índices quando arquivos forem criados, movidos ou descontinuados.
- Evitar duplicação; preferir referência ao documento normativo.
- Preservar histórico e nunca sobrescrever conteúdo sem análise.
- Registrar inconsistências e aguardar aprovação antes de corrigir documentos normativos.

## 4. Estrutura de diretórios

A estrutura oficial de documentação está descrita em [`docs/README.md`](../README.md).

Diretórios de implementação:

- `apps/`: aplicações executáveis;
- `packages/`: bibliotecas, contratos e componentes compartilhados;
- `services/`: serviços-base;
- `infrastructure/`: infraestrutura e automação operacional;
- `tests/`: testes transversais e de arquitetura;
- `tools/`: ferramentas de engenharia.

## 5. Convenções de commits

Usar Conventional Commits:

```text
<tipo>(<escopo>): <descrição imperativa>
```

Tipos principais:

- `docs`: documentação;
- `feat`: nova capacidade;
- `fix`: correção;
- `refactor`: reorganização sem mudança funcional;
- `test`: testes;
- `chore`: manutenção;
- `ci`: integração contínua;
- `build`: build e dependências.

Os commits devem ser pequenos, coerentes e limitados a uma unidade lógica.

## 6. Fluxo Git

1. Confirmar repositório, branch e HEAD.
2. Ler os arquivos relacionados e verificar conflitos.
3. Definir uma unidade lógica de trabalho.
4. Criar ou atualizar os arquivos necessários.
5. Executar validações aplicáveis.
6. Atualizar índices, `VERSION`, `CHANGELOG.md` e `PROJECT_STATUS.md` quando aplicável.
7. Criar commit com Conventional Commits.
8. Confirmar o hash e relatar o resultado.

Alterações diretas em `main` somente devem ocorrer quando expressamente autorizadas. Mudanças de código ou de maior risco devem usar branch e revisão conforme orientação do projeto.

## 7. Versionamento

A plataforma usa Semantic Versioning:

- MAJOR: mudança incompatível;
- MINOR: nova capacidade compatível;
- PATCH: correção compatível.

Documentos normativos mantêm versão própria e histórico de revisões. A versão global do projeto fica em `VERSION`.

## 8. Padrão para ADRs

Cada ADR deve conter:

1. título e identificador;
2. estado;
3. data;
4. contexto;
5. decisão;
6. alternativas consideradas;
7. consequências;
8. impactos e migração;
9. referências.

Estados permitidos: Proposto, Aprovado, Rejeitado, Substituído e Descontinuado. Um ADR aprovado não deve ser editado para alterar a decisão; uma nova decisão deve substituí-lo com referência explícita.

## 9. Checklist antes de cada commit

- [ ] O escopo foi autorizado.
- [ ] O estado atual foi analisado.
- [ ] Não há conflito com documento normativo.
- [ ] Arquivos estão nos diretórios corretos.
- [ ] Links e índices foram atualizados.
- [ ] Versão e changelog estão coerentes.
- [ ] Conteúdo sensível e segredos não foram incluídos.
- [ ] Validações aplicáveis foram executadas.
- [ ] A mensagem segue Conventional Commits.

## 10. Checklist antes de cada merge

- [ ] Escopo e critérios de aceitação atendidos.
- [ ] Revisão concluída.
- [ ] Testes e verificações estão aprovados.
- [ ] Impactos arquiteturais foram avaliados.
- [ ] ADR existe quando necessário.
- [ ] Documentação e migrações estão atualizadas.
- [ ] Segurança, multi-tenancy e observabilidade foram consideradas.
- [ ] Estratégia de reversão foi definida quando aplicável.

## 11. Boas práticas para desenvolvedores

- Respeitar limites modulares e contratos públicos.
- Evitar dependências implícitas e acoplamento direto.
- Implementar mudanças incrementais e reversíveis.
- Tratar testes, segurança e observabilidade de acordo com o risco.
- Não antecipar módulos de negócio durante a fase de fundação.
- Comunicar bloqueios e inconsistências antes de alterar escopo.

## 12. Boas práticas para assistentes de IA

- Não inventar decisões arquiteturais.
- Diferenciar fatos verificados de propostas.
- Ler antes de escrever.
- Não apagar ou substituir conteúdo sem justificativa.
- Não usar GitHub CLI neste projeto; usar o conector GitHub autorizado.
- Informar arquivos criados, alterados, commit e hash.
- Interromper a execução e pedir aprovação quando houver divergência normativa.

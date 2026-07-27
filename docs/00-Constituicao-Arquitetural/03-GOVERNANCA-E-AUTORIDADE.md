# Governança e Autoridade

## Controle do documento

| Campo | Valor |
|---|---|
| Identificador | VERO-CONST-001-CH03 |
| Versão | 0.1.0 |
| Estado | Draft — Pacote 1 aprovado |
| Autoridade | Arquiteto-Chefe |
| Data | 2026-07-27 |

## 1. Autoridade arquitetural

O Arquiteto-Chefe é a autoridade máxima sobre a arquitetura da VERO Platform. Compete a ele aprovar princípios, limites, componentes, padrões, modelos e mudanças arquiteturais.

## 2. Responsabilidade da Engenharia Oficial

Compete à Engenharia:

- analisar o estado existente antes de escrever;
- localizar documentação relacionada;
- materializar decisões aprovadas;
- manter arquivos nos diretórios oficiais;
- atualizar índices e controles;
- usar Semantic Versioning e Conventional Commits;
- preservar o histórico;
- relatar arquivos, commits e próximos passos.

## 3. Gestão de inconsistências

Ao identificar divergência entre documentação existente e decisão aprovada, a Engenharia não deve corrigi-la automaticamente. Deve registrar a inconsistência, propor a correção e aguardar aprovação antes de modificar documentos normativos.

## 4. Mudança arquitetural

Uma mudança arquitetural requer:

1. motivação e contexto;
2. proposta explícita;
3. análise de impactos;
4. ADR quando aplicável;
5. aprovação do Arquiteto-Chefe;
6. atualização dos documentos normativos afetados;
7. atualização de versão e changelog;
8. commit rastreável.

## 5. Proteção documental

Nenhum documento normativo pode ser sobrescrito sem análise. Nenhum arquivo deve ser removido sem justificativa. Assuntos distintos devem permanecer separados nos diretórios correspondentes.

## 6. Critério de conclusão

Uma unidade lógica somente está concluída quando:

- o conteúdo foi salvo no repositório;
- os índices aplicáveis foram atualizados;
- os controles de versão e mudança estão coerentes;
- o commit foi realizado;
- o resultado foi informado.

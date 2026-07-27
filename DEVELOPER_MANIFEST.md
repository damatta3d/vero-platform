# Manifesto do Desenvolvedor

Este documento estabelece as regras de trabalho da VERO Platform.

## Autoridade arquitetural

A Constituição Arquitetural e os Volumes 0 a VII do Blueprint são a referência normativa do projeto. A arquitetura aprovada é imutável, salvo decisão formal registrada em ADR.

## Princípios obrigatórios

1. Aplicar Clean Architecture e DDD.
2. Preservar os limites do monólito modular.
3. Evitar acoplamento direto entre módulos de domínio.
4. Usar contratos explícitos para eventos e integrações.
5. Tratar multi-tenancy, segurança, auditoria e observabilidade como requisitos estruturais.
6. Manter o Canonical Domain Model como linguagem comum.
7. Implementar regras de negócio pelo Business Rules Framework.
8. Modelar transições relevantes pelo Lifecycle Engine.
9. Registrar decisões arquiteturais relevantes em `docs/02-ADR`.
10. Não introduzir módulos de negócio durante a fase de fundação.

## Regras de mudança

- Toda mudança deve ter escopo claro e verificável.
- Alterações arquiteturais exigem ADR.
- Código novo deve incluir testes compatíveis com seu risco.
- Segredos nunca devem ser versionados.
- Dependências entre áreas devem permanecer direcionais e explícitas.
- Compatibilidade, migração e reversibilidade devem ser consideradas antes de mudanças estruturais.

## Critério de conclusão

Uma entrega só é considerada concluída quando código, testes, documentação e impactos arquiteturais estiverem coerentes.

# Documentação da VERO Platform

Este diretório é a fonte oficial da documentação arquitetural, de engenharia e de operação da VERO Platform.

## Estrutura oficial

| Diretório | Finalidade |
|---|---|
| `00-Constituicao-Arquitetural/` | Normas, princípios e governança arquitetural |
| `01-Blueprint/` | Visão estrutural e volumes do Blueprint |
| `02-ADR/` | Architecture Decision Records |
| `03-Domain/` | Canonical Domain Model e documentação dos módulos |
| `04-Architecture/` | Componentes, integrações e visões arquiteturais |
| `05-Development/` | Padrões e guias de desenvolvimento |
| `06-Operations/` | Operação, implantação e continuidade |
| `07-Security/` | Segurança, identidade, privacidade e conformidade |
| `08-AI/` | Arquitetura e governança de inteligência artificial |
| `09-Quality/` | Qualidade, testes e critérios de aceitação |
| `10-UX/` | Experiência do usuário e design |
| `11-Backlog/` | Backlog oficial |
| `12-Sprints/` | Planejamento e registros de sprints |
| `99-Appendix/` | Apêndices e playbooks |

## Governança

A Constituição Arquitetural e as decisões formalizadas em ADR são normativas. Alterações arquiteturais dependem de aprovação do Arquiteto-Chefe e atualização dos controles de versão e mudança.

Cada documento mestre deve possuir identificador único, versão independente, estado documental, histórico de revisões e rastreabilidade. A versão global da plataforma permanece no arquivo `VERSION` da raiz; a Constituição `VERO-CONST-001` mantém seu controle próprio em [`00-Constituicao-Arquitetural/VERSION.md`](00-Constituicao-Arquitetural/VERSION.md).

## Diretórios legados preservados

Os diretórios `04-UX/`, `05-Backlog/` e `06-Sprints/` pertencem ao bootstrap inicial. Permanecem preservados para manter o histórico, mas novos documentos devem usar `10-UX/`, `11-Backlog/` e `12-Sprints/`.

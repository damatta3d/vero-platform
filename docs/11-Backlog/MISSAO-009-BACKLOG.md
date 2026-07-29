# Backlog — MISSÃO 009

## P0 — M009-A: Pesquisa e desenho

- [x] Confirmar a baseline após o merge da MISSÃO 008.
- [x] Verificar branches e PRs concorrentes.
- [x] Ler Constituição, Blueprints, CDM e ADRs aplicáveis.
- [x] Inventariar fatos públicos confirmados na documentação oficial.
- [x] Registrar contratos externos ainda não confirmados.
- [x] Identificar incompatibilidade entre pedido externo e venda simplificada.
- [x] Elaborar `VERO-INT-001`.
- [x] Propor ADR-010.
- [x] Aprovar o Design Document.
- [x] Aprovar o ADR-010.
- [x] Confirmar autenticação, Page ID, cardápio, listagem e detalhe de pedido.
- [x] Executar smoke real read-only sem expor PII.
- [ ] Obter respostas oficiais para os contratos operacionais pendentes.

## P0 — M009-B: Fundação read-only

- [ ] Criar Integration Hub mínimo.
- [x] Criar Connector Anota AI sem exportar DTOs externos.
- [x] Isolar estabelecimento por Page ID.
- [ ] Definir SecretProvider adequado ao ambiente.
- [x] Criar schemas e fixtures oficiais versionadas.
- [x] Adicionar timeout próprio ao cliente HTTP.
- [ ] Implementar lifecycle de conexão, health e métricas.
- [x] Executar smoke test read-only.

## P0 — M009-C: Captura e Order Intake

- [ ] Confirmar polling ou webhook.
- [ ] Implementar inbox e chave de deduplicação.
- [ ] Implementar replay/quarentena.
- [x] Implementar ACL estrutural Anota AI → `ExternalOrder`.
- [x] Implementar mapeamento explícito de catálogo.
- [x] Definir contrato público inicial de Order Intake em Sales.
- [x] Provar isolamento dos vínculos entre tenants.
- [x] Provar ausência de efeito com mapeamento incompleto.

## P1 — M009-D: Ações e homologação

- [ ] Confirmar estados e transições externas.
- [ ] Implementar ações autorizadas.
- [ ] Implementar auditoria e controle de retry.
- [ ] Ligar estado terminal à venda por efeito idempotente.
- [ ] Executar homologação controlada do Santo Parma.
- [ ] Emitir parecer técnico final.

## Bloqueadores externos

- autenticação e scopes oficiais;
- endpoints e schemas da API de Pedidos;
- incrementalidade e paginação;
- webhook e mecanismo de autenticidade, se existente;
- estados e transições;
- idempotência e rate limit;
- ambiente e roteiro de homologação;
- política de versão e descontinuação.

## Adiados

- sync completo de cardápio;
- preços e disponibilidade em massa;
- importação histórica;
- conciliação financeira;
- logística;
- iFood;
- analytics e CRM.

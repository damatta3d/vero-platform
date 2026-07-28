# Backlog — MISSÃO 008

## Prioridade P0 — M008-A: Catálogo e ficha técnica

- [x] Definir linguagem do domínio e contratos públicos mínimos.
- [x] Criar módulo vertical de catálogo sem dependência de framework.
- [x] Implementar `Ingredient`, `Product`, `UnitOfMeasure` e `Recipe`.
- [x] Validar nomes, unidades, quantidades e valores monetários.
- [x] Calcular custo total e custo por rendimento da ficha técnica.
- [x] Garantir isolamento por `tenantId` em comandos e consultas.
- [x] Definir portas de repositório e casos de uso.
- [x] Persistir catálogo e ficha técnica no PostgreSQL com migrations.
- [x] Expor API protegida para criar e consultar os registros.
- [x] Cobrir regras e fronteiras com testes.
- [x] Validar um prato real do Santo Parma.

## Prioridade P0 — M008-B: Compras e estoque

- [x] Registrar entrada de compra e custo unitário normalizado.
- [x] Implementar ledger imutável de estoque.
- [x] Calcular saldo e custo médio móvel.
- [x] Registrar consumo e ajustes com motivo e autor.
- [x] Impedir acesso e movimentação entre tenants.
- [x] Expor posição de estoque por insumo.

## Prioridade P0 — M008-C: Produção, venda, CMV e margem

- [ ] Registrar produção ou venda simplificada.
- [ ] Fixar snapshot da ficha técnica e dos custos utilizados.
- [ ] Baixar insumos conforme rendimento e quantidade.
- [ ] Calcular CMV, margem em centavos e margem percentual.
- [ ] Expor resumo operacional.

## Prioridade P1 — M008-D: Interface

- [x] Criar interface responsiva do fluxo principal.
- [x] Implementar formulários, listas e painel mínimo.
- [x] Incluir estados de vazio, erro e confirmação.
- [ ] Executar validação guiada com dados reais do Santo Parma.

## Adiados

- integrações externas;
- fiscal e contabilidade;
- aprovação de compras;
- produção avançada;
- permissões granulares;
- módulos genéricos sem uso no MVP.

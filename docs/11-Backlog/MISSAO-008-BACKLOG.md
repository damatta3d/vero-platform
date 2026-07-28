# Backlog — MISSÃO 008

## Prioridade P0 — M008-A: Catálogo e ficha técnica

- [ ] Definir linguagem do domínio e contratos públicos mínimos.
- [ ] Criar módulo vertical de catálogo sem dependência de framework.
- [ ] Implementar `Ingredient`, `Product`, `UnitOfMeasure` e `Recipe`.
- [ ] Validar nomes, unidades, quantidades e valores monetários.
- [ ] Calcular custo total e custo por rendimento da ficha técnica.
- [ ] Garantir isolamento por `tenantId` em comandos e consultas.
- [ ] Definir portas de repositório e casos de uso.
- [ ] Persistir catálogo e ficha técnica no PostgreSQL com migrations.
- [ ] Expor API protegida para criar e consultar os registros.
- [ ] Cobrir regras e fronteiras com testes.
- [ ] Validar um prato real do Santo Parma.

## Prioridade P0 — M008-B: Compras e estoque

- [ ] Registrar entrada de compra e custo unitário normalizado.
- [ ] Implementar ledger imutável de estoque.
- [ ] Calcular saldo e custo médio móvel.
- [ ] Registrar consumo e ajustes com motivo e autor.
- [ ] Impedir acesso e movimentação entre tenants.
- [ ] Expor posição de estoque por insumo.

## Prioridade P0 — M008-C: Produção, venda, CMV e margem

- [ ] Registrar produção ou venda simplificada.
- [ ] Fixar snapshot da ficha técnica e dos custos utilizados.
- [ ] Baixar insumos conforme rendimento e quantidade.
- [ ] Calcular CMV, margem em centavos e margem percentual.
- [ ] Expor resumo operacional.

## Prioridade P1 — M008-D: Interface

- [ ] Criar interface responsiva do fluxo principal.
- [ ] Implementar formulários, listas e painel mínimo.
- [ ] Incluir estados de vazio, erro e confirmação.
- [ ] Executar validação guiada com dados reais do Santo Parma.

## Adiados

- integrações externas;
- fiscal e contabilidade;
- aprovação de compras;
- produção avançada;
- permissões granulares;
- módulos genéricos sem uso no MVP.

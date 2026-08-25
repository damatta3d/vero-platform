# Pagamentos VERO

## Fonte de verdade

O backend calcula o valor final a partir do cardápio, cupom e configuração de entrega
persistidos. O navegador nunca define valor, identificador do provedor nem situação do
pagamento. Cada checkout cria uma tentativa em `commerce_payment_attempts`; o pedido só
pode referenciar essa tentativa se tenant, carrinho, cliente, fulfillment, valor, moeda e
método coincidirem.

O total segue a regra `itens - desconto do cupom + taxa de entrega`. Cupons não descontam
a taxa de entrega. A tentativa preserva o valor financeiro calculado no servidor e o
pedido preserva o snapshot comercial.

## PIX Mercado Pago

O PIX usa a Orders API (`POST /v1/orders`) com `processing_mode=automatic`, referência
externa opaca e uma chave de idempotência estável gerada pelo backend. O identificador de
checkout pode ser repetido somente com a mesma requisição. Reuso com outro carrinho,
cliente, tenant, método ou valor é rejeitado.

O checkout mostra QR Code, copia e cola, valor e a indicação "Aguardando pagamento". Essa
tela é apenas informativa: ela não promove o pagamento para `PAID`.

## Webhook e reconciliação

`POST /v1/payments/webhooks/mercado-pago` valida `x-signature` e `x-request-id` com o
segredo configurado. Depois da autenticação, o backend consulta `GET /v1/orders/{id}` no
Mercado Pago e compara identificador do pagamento, referência externa, método, moeda e
valor com a tentativa local. O payload recebido não é usado como prova de pagamento.

Snapshots autenticados são registrados em `commerce_payment_webhook_inbox`. Transições
são monotônicas e auditadas em `commerce_payment_status_history`; notificações duplicadas
e atrasadas não duplicam efeitos nem regridem `PAID`. Quando o webhook chega antes de a
tentativa local estar visível, o endpoint responde temporariamente indisponível para que o
provedor repita a entrega, mantendo o snapshot na caixa de entrada.

## Fluxo operacional

Um pedido PIX pode existir em `RECEIVED` com pagamento `AWAITING_PAYMENT`, mas permanece
fora da fila da cozinha e não pode ser confirmado. Após a reconciliação para `PAID`, ele
entra na fila; lojas com recebimento automático também o confirmam pelo mesmo motor de
transição usado pelo restante da operação.

Pagamentos `PAY_ON_DELIVERY` começam em `PENDING` e não chamam provedor. Um operador
autorizado pode marcá-los como recebidos no VERO Manager; pedido e tentativa são
atualizados juntos e a mudança fica no histórico financeiro.

## Configuração

- `MERCADO_PAGO_ACCESS_TOKEN`: token privado usado exclusivamente pelo backend.
- `MERCADO_PAGO_WEBHOOK_SECRET`: assinatura secreta do webhook Orders.
- `MERCADO_PAGO_PAYER_EMAIL`: e-mail técnico usado pelo PIX quando o cliente não informa
  um e-mail válido.
- A URL do webhook não é enviada no `POST /v1/orders`. Configure-a no painel do Mercado
  Pago em **Suas integrações > Webhooks > Configurar notificações** e habilite o evento
  **Order (Mercado Pago)** para o endpoint público `/v1/payments/webhooks/mercado-pago`.

Não registrar valores dessas variáveis, QR Code, dados pessoais completos ou payloads do
provedor em logs. O deploy deve aplicar as migrações antes de iniciar a nova imagem da API.

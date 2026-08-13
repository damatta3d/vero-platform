export const ORDER_SECURITY_ACTIONS = {
  listKitchenOrders: 'orders.kitchen.list',
  transitionKitchenOrder: 'orders.kitchen.transition',
  readPublicStatus: 'orders.public.status'
} as const;

export type OrderSecurityAction = (typeof ORDER_SECURITY_ACTIONS)[keyof typeof ORDER_SECURITY_ACTIONS];

export const ZXCHUB_KEY_PRODUCT_ID = 'zxchub-key';

export const ZXCHUB_KEY_PLANS = [
  { id: '1-day', name: '1 Day', price: 1.0, robux: '50 R$', funpay: '25 RUB' },
  { id: '1-week', name: '1 Week', price: 1.8, robux: '200 R$', funpay: '150 RUB' },
  { id: '1-month', name: '1 Month', price: 5.99, robux: '680 R$', funpay: '500 RUB' },
  { id: 'lifetime', name: 'Lifetime', price: 14.99, robux: '5000 R$', funpay: '1155 RUB' }
];

export function getZxchubKeyPlan(planId?: string) {
  return ZXCHUB_KEY_PLANS.find(plan => plan.id === planId) || ZXCHUB_KEY_PLANS[1];
}

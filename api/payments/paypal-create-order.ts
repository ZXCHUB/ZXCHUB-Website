import { getPayPalAccessToken, getPayPalConfig } from '../_lib/paypal.js';

type VercelRequest = {
  method?: string;
  body?: any;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: any) => void;
  setHeader: (name: string, value: string | string[]) => void;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Allow', 'POST');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { amount, userId, metadata } = req.body ?? {};
    const numericAmount = Number(amount || 0);

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      res.status(400).json({ error: 'amount must be greater than 0' });
      return;
    }

    const [config, token] = await Promise.all([getPayPalConfig(), getPayPalAccessToken()]);
    const response = await fetch(`${config.baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: metadata?.type === 'topup' ? 'zxchub-balance-topup' : 'zxchub-key-order',
            custom_id: userId,
            amount: {
              currency_code: 'USD',
              value: numericAmount.toFixed(2)
            }
          }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      res.status(response.status).json({ error: data?.message || 'Failed to create PayPal order', details: data });
      return;
    }

    res.status(200).json({ id: data.id });
  } catch (error: any) {
    console.error('PayPal create order error:', error);
    res.status(500).json({ error: error.message || 'Failed to create PayPal order' });
  }
}

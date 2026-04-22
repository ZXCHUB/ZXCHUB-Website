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
    const { orderId } = req.body ?? {};
    if (!orderId) {
      res.status(400).json({ error: 'orderId is required' });
      return;
    }

    const [config, token] = await Promise.all([getPayPalConfig(), getPayPalAccessToken()]);
    const response = await fetch(`${config.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    if (!response.ok) {
      res.status(response.status).json({ error: data?.message || 'Failed to capture PayPal order', details: data });
      return;
    }

    const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
    res.status(200).json({
      success: data.status === 'COMPLETED' || capture?.status === 'COMPLETED',
      orderId: data.id,
      amount: Number(capture?.amount?.value || 0),
      payerEmail: data.payer?.email_address || ''
    });
  } catch (error: any) {
    console.error('PayPal capture order error:', error);
    res.status(500).json({ error: error.message || 'Failed to capture PayPal order' });
  }
}

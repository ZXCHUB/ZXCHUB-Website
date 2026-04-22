import { getStripe } from '../_lib/stripe.js';

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
    const { amount, method, userId, metadata, successUrl, cancelUrl } = req.body ?? {};

    if (method !== 'stripe') {
      res.status(400).json({ error: 'Unsupported payment method' });
      return;
    }

    const stripe = await getStripe();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: metadata?.productTitle || metadata?.planName || 'ZXCHUB Key'
            },
            unit_amount: Math.max(50, Math.round(Number(amount || 0) * 100))
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      metadata: { userId, ...(metadata || {}) }
    });

    res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error('Payment Error:', error);
    res.status(500).json({ error: error.message || 'Failed to create checkout session' });
  }
}
